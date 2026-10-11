import { apiError } from "@/lib/api-error";
import { PhotoJob, classifyFailure, hasPhoto, nextJob, pendingJobs } from "@/lib/draft-photos";

/** What the queue needs from the outside, so it can be tested without a phone or a server. */
export interface QueueDeps {
  /** Resizes, presigns and PUTs the photo; resolves to its address on Renit's bucket. */
  upload: (uri: string, size?: { width?: number; height?: number }) => Promise<string>;
  /** `POST /api/shop/products/{name}/photos/add/`. */
  attach: (name: string, url: string) => Promise<void>;
  /** The draft's photos now: to see whether an attach that got no answer went through. */
  images: (name: string) => Promise<string[]>;
  /** The jobs kept for this account, and keeping them. */
  load: (account: string) => Promise<PhotoJob[]>;
  save: (account: string, jobs: PhotoJob[]) => Promise<void>;
  makeId: () => string;
}

export interface NewPhoto {
  name: string;
  title: string;
  uri: string;
  width?: number;
  height?: number;
}

/**
 * The queue of photos on their way to their drafts: one at a time, outside any
 * screen, so a photo keeps going up when the shop leaves the walk-through. A job is
 * kept on the phone until it is on its draft: a closed app or a dead connection
 * loses nothing, and a failure waits for Retry.
 *
 * A job whose attach call got no answer may have gone through. Its retry reads the
 * draft first and, if the photo is there, is done: a photo is never added twice.
 */
export function createPhotoQueue(deps: QueueDeps) {
  let account: string | null = null;
  // Replaced, never changed in place: a screen compares snapshots.
  let jobs: PhotoJob[] = [];
  let running = false;
  const listeners = new Set<() => void>();

  const publish = () => {
    for (const listener of listeners) listener();
    if (account) void deps.save(account, pendingJobs(jobs)).catch(() => undefined);
  };

  const set = (id: string, patch: Partial<PhotoJob>) => {
    jobs = jobs.map((j) => (j.id === id ? { ...j, ...patch } : j));
    publish();
  };

  async function run(job: PhotoJob) {
    set(job.id, { status: "uploading", error: null });
    let url = job.url;
    if (!url) {
      try {
        url = await deps.upload(job.uri, { width: job.width, height: job.height });
        set(job.id, { url });
      } catch {
        const out = classifyFailure("upload", null);
        set(job.id, { status: out.status, error: out.message, url: null, attachSent: out.attachSent });
        return;
      }
    }
    try {
      if (job.attachSent && hasPhoto(await deps.images(job.name), url)) {
        set(job.id, { status: "done", error: null, attachSent: false });
        return;
      }
      await deps.attach(job.name, url);
      set(job.id, { status: "done", error: null, attachSent: false });
    } catch (error) {
      const out = classifyFailure("attach", apiError(error));
      set(job.id, {
        status: out.status,
        error: out.message,
        url: out.keepUrl ? url : null,
        attachSent: out.attachSent,
      });
    }
  }

  async function pump() {
    if (running) return;
    running = true;
    try {
      for (let job = nextJob(jobs); job; job = nextJob(jobs)) await run(job);
    } finally {
      running = false;
    }
  }

  return {
    /** For `useSyncExternalStore`. */
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getJobs: () => jobs,

    /**
     * Binds the queue to the signed-in account and takes back what an earlier visit
     * left for it. What was in memory for another account is dropped: those jobs belong
     * to drafts this account cannot reach (they stay on the phone, under their own account).
     */
    async init(who: string) {
      if (account === who) return;
      // Another account is signed in now: its photos are not this one's to send.
      if (account) jobs = [];
      account = who;
      const kept = await deps.load(who).catch(() => [] as PhotoJob[]);
      // An upload that was in flight when the app closed starts again.
      const restored = kept.map((j): PhotoJob => (j.status === "uploading" ? { ...j, status: "queued" } : j));
      // What was taken in this run before the load came back stays, ahead of the restored ones.
      jobs = [...restored.filter((r) => !jobs.some((j) => j.id === r.id)), ...jobs];
      publish();
      void pump();
    },

    /** A photo was taken of a draft: it goes up in the background. */
    enqueue(photo: NewPhoto): PhotoJob {
      const job: PhotoJob = {
        id: deps.makeId(),
        name: photo.name,
        title: photo.title,
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        url: null,
        status: "queued",
        error: null,
        attachSent: false,
      };
      jobs = [...jobs, job];
      publish();
      void pump();
      return job;
    },

    /** Retry one photo that did not go up. */
    retry(id: string) {
      jobs = jobs.map((j) => (j.id === id && j.status === "failed" ? { ...j, status: "queued", error: null } : j));
      publish();
      void pump();
    },

    retryAll() {
      jobs = jobs.map((j) => (j.status === "failed" ? { ...j, status: "queued", error: null } : j));
      publish();
      void pump();
    },

    /** Resolves when nothing is going up any more (for tests, and for a screen that wants to wait). */
    async idle() {
      while (running) await new Promise((resolve) => setTimeout(resolve, 0));
    },
  };
}

export type PhotoQueue = ReturnType<typeof createPhotoQueue>;
