import { CaptureDraft, LocalFile, Moment, Side, captureId, namesIn, orphanFiles } from "@/lib/capture";
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
export const reroot = (uri: string): string => {
  const at = uri.lastIndexOf(`/${FOLDER}`);
  return at >= 0 ? `${dir()}${uri.slice(at + FOLDER.length + 1)}` : uri;
};

const rerootFile = <T extends LocalFile | null>(file: T): T => (file ? { ...file, uri: reroot(file.uri) } : file);

/** Deletes files from the phone. A file that is already gone, or cannot be deleted, is passed over. */
export async function discardFiles(uris: string[]): Promise<void> {
  await Promise.all(uris.map((uri) => FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined)));
}

/** A file's size in bytes, or null when the phone cannot say. */
export async function fileBytes(uri: string): Promise<number | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    return info.exists && typeof info.size === "number" ? info.size : null;
  } catch {
    return null;
  }
}

/**
 * The lists on this phone that name files in the folder: the capture drafts of
 * every account, and the draft-photo jobs of every account, which share it
 * (`draft-photo-jobs.ts` keeps its photos with `keepFile`).
 */
const NAMING_KEYS = ["renit-capture-drafts:", "renit-draft-photo-jobs:"];

/**
 * Clears the folder of files nothing names any more: a photo taken for a report
 * that was never sent, a file left by a crash between the camera and the record.
 * Every delete at the moment a file leaves a record is done by the queue; this is
 * the net under it. It takes only files older than a day, and does nothing at all
 * if the folder or any list cannot be read: a file is never deleted on a guess.
 */
export async function sweepCaptureFolder(nowMs: number = Date.now()): Promise<void> {
  try {
    const folder = await FileSystem.getInfoAsync(dir());
    if (!folder.exists) return;
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => NAMING_KEYS.some((prefix) => key.startsWith(prefix)));
    const named = new Set<string>();
    for (const [, raw] of await AsyncStorage.multiGet(keys)) namesIn(JSON.parse(raw ?? "null"), FOLDER, named);
    for (const draft of captureQueue.getDrafts()) namesIn(draft, FOLDER, named);
    const found: { name: string; modifiedMs: number }[] = [];
    for (const name of await FileSystem.readDirectoryAsync(dir())) {
      const info = await FileSystem.getInfoAsync(`${dir()}${name}`);
      if (info.exists && !info.isDirectory) found.push({ name, modifiedMs: info.modificationTime * 1000 });
    }
    await discardFiles(orphanFiles(found, named, nowMs).map((name) => `${dir()}${name}`));
  } catch {
    // Nothing is deleted when anything about the folder or the lists is unsure.
  }
}

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
  discard: discardFiles,
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
    void captureQueue.init(account).then(() => sweepCaptureFolder());
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
