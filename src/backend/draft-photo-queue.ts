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
  /**
   * Moves a photo out of the cache, where the system may clear it, into the app's own
   * folder; resolves to where it is now (where it was, if the move fails).
   */
  keep: (uri: string) => Promise<string>;
  /** Whether the photo's file is still there. */
  exists: (uri: string) => Promise<boolean>;
  /** Deletes photo files the queue has no more use for. */
  discard: (uris: string[]) => Promise<void>;
}

export interface NewPhoto {
  name: string;
  title: string;
  shop_code?: string;
  uri: string;
  width?: number;
  height?: number;
}

/**
 * The queue of photos on their way to their drafts: one at a time, outside any
 * screen, so a photo keeps going up when the shop leaves the walk-through. A job is
 * kept on the phone until it is on its draft: a closed app or a dead connection
 * loses nothing, and a failure waits for Retry or for the photo to be taken again.
 *
 * - The photo is moved out of the cache at once, and a job restored after an update
 *   or a cleared cache whose file is gone says so (`missing`) instead of failing for ever.
 * - A failed job can be removed (`removeFailed`) and its draft shot again; a new photo
 *   of a draft replaces the failed ones it had.
 * - A job whose attach call is on its way, or got no answer, may have gone through. The
 *   fact is saved before the call goes out, so a restart in the middle, like a lost
 *   answer, reads the draft first and is done if the photo is there: a photo is never
 *   added twice.
 */
export function createPhotoQueue(deps: QueueDeps) {
  let account: string | null = null;
  // Replaced, never changed in place: a screen compares snapshots.
  let jobs: PhotoJob[] = [];
  let running = false;
  let initing: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  /** Tells the screens, and keeps the jobs on the phone. Resolves once they are kept. */
  const publish = (): Promise<void> => {
    for (const listener of listeners) listener();
    return account ? deps.save(account, pendingJobs(jobs)).catch(() => undefined) : Promise.resolve();
  };

  const set = (id: string, patch: Partial<PhotoJob>) => {
    jobs = jobs.map((j) => (j.id === id ? { ...j, ...patch } : j));
    return publish();
  };

  /** A job that is on its draft, or has nothing to go to, no longer needs its file. */
  const finish = (job: PhotoJob, status: "done" | "gone") => {
    void deps.discard([job.uri]).catch(() => undefined);
    return set(job.id, { status, error: null, attachSent: false });
  };

  async function run(job: PhotoJob) {
    await set(job.id, { status: "uploading", error: null });
    let url = job.url;
    if (!url) {
      if (!(await deps.exists(job.uri).catch(() => true))) {
        const out = classifyFailure("file", null);
        await set(job.id, { status: out.status, error: out.message, missing: true, url: null, attachSent: false });
        return;
      }
      try {
        url = await deps.upload(job.uri, { width: job.width, height: job.height });
        await set(job.id, { url });
      } catch {
        const out = classifyFailure("upload", null);
        await set(job.id, { status: out.status, error: out.message, url: null, attachSent: out.attachSent });
        return;
      }
    }
    try {
      if (job.attachSent && hasPhoto(await deps.images(job.name), url)) {
        await finish(job, "done");
        return;
      }
      // Kept before the call goes out: if the app is closed in the middle, the call may have been taken.
      await set(job.id, { attachSent: true });
      await deps.attach(job.name, url);
      await finish(job, "done");
    } catch (error) {
      const out = classifyFailure("attach", apiError(error));
      if (out.status === "failed") {
        await set(job.id, {
          status: "failed",
          error: out.message,
          url: out.keepUrl ? url : null,
          attachSent: out.attachSent,
        });
      } else {
        await finish(job, out.status);
      }
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
     * Asked again for the same account (the app's root and the walk-through both ask), it
     * resolves when the first has: a screen can wait for the restored jobs.
     */
    init(who: string): Promise<void> {
      if (account === who && initing) return initing;
      // Another account is signed in now: its photos are not this one's to send.
      if (account) jobs = [];
      account = who;
      initing = (async () => {
        const kept = await deps.load(who).catch(() => [] as PhotoJob[]);
        // An upload that was in flight when the app closed starts again.
        const restored = kept.map((j): PhotoJob => (j.status === "uploading" ? { ...j, status: "queued" } : j));
        // What was taken in this run before the load came back stays, behind the restored ones.
        jobs = [...restored.filter((r) => !jobs.some((j) => j.id === r.id)), ...jobs];
        await publish();
        void pump();
      })();
      return initing;
    },

    /**
     * A photo was taken of a draft: it is kept out of the cache and goes up in the
     * background. Photos of this draft that failed before are replaced by this one.
     */
    async enqueue(photo: NewPhoto): Promise<PhotoJob> {
      const replaced = jobs.filter((j) => j.name === photo.name && j.status === "failed");
      const uri = await deps.keep(photo.uri);
      const job: PhotoJob = {
        id: deps.makeId(),
        name: photo.name,
        title: photo.title,
        shop_code: photo.shop_code,
        uri,
        width: photo.width,
        height: photo.height,
        url: null,
        status: "queued",
        error: null,
        attachSent: false,
      };
      jobs = [...jobs.filter((j) => !replaced.includes(j)), job];
      void deps.discard(replaced.map((j) => j.uri)).catch(() => undefined);
      void publish();
      void pump();
      return job;
    },

    /** Retry the photos that did not go up. One whose file is gone is not retried: it needs a new photo. */
    retry(id: string) {
      jobs = jobs.map((j) => (j.id === id && j.status === "failed" && !j.missing ? { ...j, status: "queued", error: null } : j));
      void publish();
      void pump();
    },

    retryAll() {
      jobs = jobs.map((j) => (j.status === "failed" && !j.missing ? { ...j, status: "queued", error: null } : j));
      void publish();
      void pump();
    },

    /**
     * "Take again": lets go of every photo that did not go up, files included, and hands
     * the jobs back so their drafts can be shot again. Nothing that is on its way is touched.
     */
    removeFailed(): PhotoJob[] {
      const removed = jobs.filter((j) => j.status === "failed");
      if (removed.length === 0) return [];
      jobs = jobs.filter((j) => j.status !== "failed");
      void deps.discard(removed.map((j) => j.uri)).catch(() => undefined);
      void publish();
      return removed;
    },

    /** Resolves when nothing is going up any more (for tests, and for a screen that wants to wait). */
    async idle() {
      while (running) await new Promise((resolve) => setTimeout(resolve, 0));
    },
  };
}

export type PhotoQueue = ReturnType<typeof createPhotoQueue>;
