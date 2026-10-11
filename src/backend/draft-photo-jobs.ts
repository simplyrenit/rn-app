import { PhotoJob } from "@/lib/draft-photos";
import { uuidv4 } from "@/lib/uuid";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { uploadPhoto } from "./list-flow/upload";
import { attachDraftPhoto, fetchDraftImages } from "./draft-photos";
import { createPhotoQueue } from "./draft-photo-queue";

/** One key for each account: the drafts belong to its shop, and nobody else's phone session may send them. */
const keyFor = (account: string) => `renit-draft-photo-jobs:${account}`;

/** The app's one photo queue. */
export const draftPhotoQueue = createPhotoQueue({
  upload: uploadPhoto,
  attach: attachDraftPhoto,
  images: fetchDraftImages,
  makeId: uuidv4,
  async load(account) {
    const raw = await AsyncStorage.getItem(keyFor(account));
    const kept = raw ? (JSON.parse(raw) as PhotoJob[]) : [];
    return Array.isArray(kept) ? kept : [];
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
