import { PhotoJob } from "@/lib/draft-photos";
import { uuidv4 } from "@/lib/uuid";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { useEffect, useSyncExternalStore } from "react";
import { keepFile, reroot } from "./capture-jobs";
import { attachDraftPhoto, fetchDraftImages } from "./draft-photos";
import { createPhotoQueue } from "./draft-photo-queue";
import { uploadPhoto } from "./list-flow/upload";

/** One key for each account: the drafts belong to its shop, and nobody else's phone session may send them. */
const keyFor = (account: string) => `renit-draft-photo-jobs:${account}`;

/**
 * The app's one photo queue. A photo is moved from the cache into the app's own
 * folder when it is queued, and its path is put back under today's folder when the
 * jobs are read: the system may clear the cache, and an iPhone app's folder path
 * changes with an update (review round 1, finding 4).
 */
export const draftPhotoQueue = createPhotoQueue({
  upload: uploadPhoto,
  attach: attachDraftPhoto,
  images: fetchDraftImages,
  makeId: uuidv4,
  keep: keepFile,
  async exists(uri) {
    return (await FileSystem.getInfoAsync(uri)).exists;
  },
  async discard(uris) {
    await Promise.all(uris.map((uri) => FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined)));
  },
  async load(account) {
    const raw = await AsyncStorage.getItem(keyFor(account));
    const kept = raw ? (JSON.parse(raw) as PhotoJob[]) : [];
    return Array.isArray(kept) ? kept.map((job) => ({ ...job, uri: reroot(job.uri) })) : [];
  },
  async save(account, jobs) {
    if (jobs.length === 0) await AsyncStorage.removeItem(keyFor(account));
    else await AsyncStorage.setItem(keyFor(account), JSON.stringify(jobs));
  },
});

/** The jobs, read live: a screen redraws when a photo moves from uploading to done or failed. */
export function usePhotoJobs(): PhotoJob[] {
  return useSyncExternalStore(draftPhotoQueue.subscribe, draftPhotoQueue.getJobs);
}

/**
 * Takes back the photos an earlier run left, from the app's root, so they carry on after
 * a restart without the shop having to open the walk-through first.
 */
export function useDraftPhotoUploads(account: string | null | undefined) {
  useEffect(() => {
    if (account) void draftPhotoQueue.init(account);
  }, [account]);
}
