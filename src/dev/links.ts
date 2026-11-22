/**
 * Dev deep links (ENG-426, dev builds only):
 *
 *   renit-qa://dev/kit/<kit node id>?variant=<variant name>&x=<scroll pt>   → DevKit
 *   renit-qa://dev/fixture/<frame id | off>                                → DevFixture
 *
 * The app has no linking config (nav.tsx routes its links by hand), so this listens itself, cold start included.
 * nav.tsx passes in its navigation ref; it calls this only behind `__DEV__`, so release bundles never contain it.
 */
import { NavigationContainerRefWithCurrent, StackActions } from "@react-navigation/native";
import { Linking } from "react-native";
import type { RootStackParamList } from "@/lib/types";

// Exported so a release bundle that contained this module would show it (README, release safety).
export const RENIT_DEV_LINKS_MARKER = "RENIT_DEV_LINKS_MARKER";

type Ref = NavigationContainerRefWithCurrent<RootStackParamList>;
type DevRoute = { name: "DevKit"; params: RootStackParamList["DevKit"] } | { name: "DevFixture"; params: RootStackParamList["DevFixture"] };

/** The start link, once handled: Android hands it back each time the screens are built again. */
let startLinkSeen: string | null = null;

const decode = (text: string) => {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
};

/** The dev route for a link, or null for any other link. A `+` is a plus, not a space: variant names have them. */
export function parseDevLink(url: string | null): DevRoute | null {
  const match = url?.match(/^[a-z][a-z0-9+.-]*:\/\/dev\/(kit|fixture)\/([^/?#]+)\/?(?:\?([^#]*))?/i);
  if (!match) return null;
  const id = decode(match[2]);
  if (match[1].toLowerCase() === "fixture") return { name: "DevFixture", params: { frameId: id.replace("-", ":") } };
  const query: Record<string, string> = {};
  for (const pair of (match[3] ?? "").split("&")) {
    const at = pair.indexOf("=");
    if (at > 0) query[decode(pair.slice(0, at))] = decode(pair.slice(at + 1));
  }
  const x = Number(query.x);
  return {
    name: "DevKit",
    params: { item: id, variant: query.variant || undefined, x: query.x && Number.isFinite(x) ? x : undefined },
  };
}

/** Opens dev links as they arrive and the one that started the app. Returns the unsubscribe. */
export function listenForDevLinks(ref: Ref): () => void {
  let alive = true;
  const open = (url: string | null, tries = 0) => {
    const route = parseDevLink(url);
    if (!route || !alive) return;
    // On a cold start the navigator mounts only once the session has loaded.
    if (!ref.isReady()) {
      if (tries < 100) setTimeout(() => open(url, tries + 1), 100);
      return;
    }
    // A new screen each time, so the next variant mounts fresh and measures again. Over a dev screen it replaces
    // that screen instead of stacking on it: the old one must unmount, or a sheet it presented stays on top.
    const current = ref.getCurrentRoute()?.name;
    const action = current === "DevKit" || current === "DevFixture" ? StackActions.replace : StackActions.push;
    ref.dispatch(action(route.name, route.params));
  };
  void Linking.getInitialURL()
    .catch(() => null)
    .then((url) => {
      if (url === startLinkSeen) return;
      startLinkSeen = url;
      open(url);
    });
  const subscription = Linking.addEventListener("url", ({ url }) => open(url));
  return () => {
    alive = false;
    subscription.remove();
  };
}
