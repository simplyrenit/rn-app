import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { Platform } from "react-native";

import { getDeviceInfo, deviceIdMadeThisRun } from "@/lib/device";
import { track } from "@/lib/events";
import type { PushRoute } from "@/lib/push-routes";

/**
 * Where a customer came from (ENG-344): a shop's counter QR (`qr`) or a WhatsApp
 * link (`wa`). The public shop page opens `<scheme>://shop/<username>?src=qr` or
 * `.../product/<name>?src=qr`; an Android install from it carries the same in the
 * Play referrer. The last one is kept 30 days and sent with Book now, and once
 * per link as `link_attributed` when signed in.
 */

export type Source = "qr" | "wa";

type Saved = { src: Source; shop: string | null; at: number; install: boolean; sent: boolean };

const KEY = "renit.attribution";
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function source(value: string | undefined): Source | null {
  return value === "qr" || value === "wa" ? value : null;
}

/** `a=1&b=2` as a map. RN's URLSearchParams can't read, so by hand. */
function query(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of text.split("&")) {
    const [key, value = ""] = pair.split("=");
    if (key) out[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, " "));
  }
  return out;
}

/** A shop or product link of ours, or null for anything else (pay and KYC returns, the dev client). */
export function parseShopLink(
  url: string | null
): { route: PushRoute; src: Source | null; shop: string | null } | null {
  const match = url?.match(/^[a-z][a-z0-9+.-]*:\/\/(shop|product)\/([^/?#]+)\/?(?:\?([^#]*))?/i);
  if (!match) return null;
  const id = decodeURIComponent(match[2]);
  const src = source(query(match[3] ?? "").src);
  return match[1] === "shop"
    ? { route: { screen: "UserDetail", id }, src, shop: id }
    : { route: { screen: "ProductDetail", id }, src, shop: null };
}

/** The Play referrer of a shop page's store link: `utm_source=qr&utm_content=<username>`. */
export function parseReferrer(referrer: string | null): { src: Source; shop: string | null } | null {
  const fields = query(referrer ?? "");
  const src = source(fields.utm_source);
  return src ? { src, shop: fields.utm_content || null } : null;
}

/** A shop page link tagged with where it is shared: `https://…/s/12/?src=wa`. */
export function withSource(url: string, src: Source): string {
  return `${url}${url.includes("?") ? "&" : "?"}src=${src}`;
}

async function read(): Promise<Saved | null> {
  try {
    const text = await AsyncStorage.getItem(KEY);
    return text ? (JSON.parse(text) as Saved) : null;
  } catch {
    return null;
  }
}

async function write(saved: Saved) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // Attribution must never get in the way.
  }
}

// True on an install's first run until a link has been credited with the install.
let installPending = false;
// Once per run: the navigator can mount again (Android rebuilding the screens).
let started = false;

async function save(src: Source, shop: string | null) {
  await write({ src, shop, at: Date.now(), install: installPending, sent: false });
  installPending = false;
}

/**
 * Once per run, before the start link: is this a new install, and did a shop link bring it?
 * A device id made on this run is a new install, so a user who updates is never counted.
 * Android reads the Play referrer and opens its shop; iOS has none, so the first link this
 * run, if any, is the install's.
 */
export async function startAttribution(): Promise<PushRoute | null> {
  if (started) return null;
  started = true;
  try {
    await getDeviceInfo();
    if (!deviceIdMadeThisRun()) return null;
    installPending = true;
    if (Platform.OS !== "android") return null;
    const found = parseReferrer(await Application.getInstallReferrerAsync());
    if (!found) return null;
    await save(found.src, found.shop);
    return found.shop ? { screen: "UserDetail", id: found.shop } : null;
  } catch {
    return null;
  }
}

/** A link came in: remember its source, and answer the screen it opens (null: not ours). */
export async function takeLink(url: string | null): Promise<PushRoute | null> {
  const link = parseShopLink(url);
  if (!link) return null;
  if (link.src) await save(link.src, link.shop);
  return link.route;
}

/** The source to send with Book now: the last link's, for 30 days. */
export async function currentSource(): Promise<Source | undefined> {
  const saved = await read();
  return saved && Date.now() - saved.at <= WINDOW_MS ? saved.src : undefined;
}

/** Signed in: send the saved link once (events need an account). */
export async function sendAttribution() {
  const saved = await read();
  if (!saved || saved.sent) return;
  track("link_attributed", {
    src: saved.src,
    install: saved.install,
    ...(saved.shop ? { shop: saved.shop } : {}),
  });
  await write({ ...saved, sent: true });
}
