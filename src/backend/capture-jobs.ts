import { CaptureDraft, LocalFile, Moment, Side, captureId } from "@/lib/capture";
import { FileGone, createCaptureQueue } from "@/lib/capture-queue";
import { uuidv4 } from "@/lib/uuid";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { putCapture, uploadCaptureFile } from "./captures";

/** One key for each account: nobody else's session on this phone may send a record. */
const keyFor = (account: string) => `renit-capture-drafts:${account}`;

const FOLDER = "captures/";
/** The app's own folder. The cache, where the camera leaves a file, can be cleared by the system at any time. */
const dir = () => `${FileSystem.documentDirectory ?? ""}${FOLDER}`;

/**
 * Moves a file just taken out of the cache into the app's own folder, where it
 * stays until the server has it. Resolves to where it is now; if the move fails
 * the file stays where the camera left it, which still works until the cache is cleared.
 */
export async function keepFile(uri: string): Promise<string> {
  try {
    await FileSystem.makeDirectoryAsync(dir(), { intermediates: true });
    const ext = (/\.([a-z0-9]+)$/i.exec(uri.split("?")[0])?.[1] ?? "jpg").toLowerCase();
    const kept = `${dir()}${uuidv4()}.${ext}`;
    await FileSystem.moveAsync({ from: uri, to: kept });
    return kept;
  } catch {
    return uri;
  }
}

/**
 * The folder's full path can change between app starts on an iPhone (an update
 * moves the app's container), so a kept path is put back under today's folder.
 */
const reroot = (uri: string): string => {
  const at = uri.lastIndexOf(`/${FOLDER}`);
  return at >= 0 ? `${dir()}${uri.slice(at + FOLDER.length + 1)}` : uri;
};

const rerootFile = <T extends LocalFile | null>(file: T): T => (file ? { ...file, uri: reroot(file.uri) } : file);

/** The app's one capture queue. */
export const captureQueue = createCaptureQueue({
  async upload(uri, kind, draft) {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) throw new FileGone();
    return uploadCaptureFile(uri, kind, `${draft.number}-${draft.moment}-${draft.side}`);
  },
  send: (draft, body) => putCapture(draft.number, draft.moment, draft.side, body),
  async load(account) {
    const raw = await AsyncStorage.getItem(keyFor(account));
    const kept = raw ? (JSON.parse(raw) as CaptureDraft[]) : [];
    if (!Array.isArray(kept)) return [];
    return kept.map((draft) => ({
      ...draft,
      shots: Object.fromEntries(Object.entries(draft.shots ?? {}).map(([key, file]) => [key, rerootFile(file)])),
      video: rerootFile(draft.video ?? null),
    }));
  },
  async save(account, drafts) {
    if (drafts.length === 0) await AsyncStorage.removeItem(keyFor(account));
    else await AsyncStorage.setItem(keyFor(account), JSON.stringify(drafts));
  },
  async discard(uris) {
    await Promise.all(uris.map((uri) => FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined)));
  },
});

/** The records on this phone, read live: a screen redraws as files go up. */
export function useCaptureDrafts(): CaptureDraft[] {
  return useSyncExternalStore(captureQueue.subscribe, captureQueue.getDrafts);
}

/** The record this phone holds for one booking, moment and side, if any. */
export function useCaptureDraft(number: string, moment: Moment, side: Side): CaptureDraft | null {
  const id = captureId(number, moment, side);
  return useCaptureDrafts().find((draft) => draft.id === id) ?? null;
}

/** How often waiting uploads are tried again while the app is in front. */
const RETRY_EVERY_MS = 20_000;

/**
 * Keeps the queue going for the signed-in account, from the app's root: it takes
 * back what an earlier run left, and tries again whenever the app comes to the
 * front and on a slow timer while something waits. There is no connection module
 * in the app, so "back online" is found by trying.
 * ponytail: uploads run only while the app is open. A background task
 * (expo-background-fetch is installed) would finish them with the app closed.
 */
export function useCaptureUploads(account: string | null | undefined) {
  useEffect(() => {
    if (!account) return;
    void captureQueue.init(account);
    const state = AppState.addEventListener("change", (next) => {
      if (next === "active") captureQueue.kick();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === "active" && captureQueue.hasWork()) captureQueue.kick();
    }, RETRY_EVERY_MS);
    return () => {
      state.remove();
      clearInterval(timer);
    };
  }, [account]);
}
