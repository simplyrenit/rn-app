import { apiError } from "@/lib/api-error";
import {
  Capture,
  CaptureBody,
  CaptureDraft,
  applyAnswer,
  captureBody,
  draftsToKeep,
  dropFile,
  localUris,
  nextWork,
  sendFailure,
  setUrl,
  uploadFailure,
} from "@/lib/capture";

/** Thrown by `upload` when the file is no longer on the phone: trying again cannot help. */
export class FileGone extends Error {
  constructor() {
    super("The file is no longer on this phone");
    this.name = "FileGone";
  }
}

/** What the queue needs from the outside, so it can be tested without a phone or a server. */
export interface CaptureQueueDeps {
  /** Presigns and PUTs one file; resolves to its address on Renit's bucket. Throws `FileGone` if it is not there. */
  upload: (uri: string, kind: "photo" | "video", draft: CaptureDraft) => Promise<string>;
  /** `PUT /api/bookings/{number}/captures/{moment}/{side}/`. */
  send: (draft: CaptureDraft, body: CaptureBody) => Promise<Capture>;
  /** The drafts kept for this account, and keeping them. */
  load: (account: string) => Promise<CaptureDraft[]>;
  save: (account: string, drafts: CaptureDraft[]) => Promise<void>;
  /** Clears the local files of a record the server now has. */
  discard: (uris: string[]) => Promise<void>;
}

/**
 * The queue of captures on their way to the server: one for the whole app,
 * outside any screen. A photo goes up as soon as it is taken; when the person has
 * finished the walk and every file is up, the record is sent in one call. Nothing
 * is finished until the server has every file, and nothing is lost before that:
 * the drafts are kept on the phone, so a dead connection, a closed app or a
 * restart only delays them. `kick` runs it again (the app came back to the front,
 * the timer, Retry).
 */
export function createCaptureQueue(deps: CaptureQueueDeps) {
  let account: string | null = null;
  // Replaced, never changed in place: a screen compares snapshots.
  let drafts: CaptureDraft[] = [];
  let running = false;
  let again = false;
  let loaded: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();

  const publish = () => {
    for (const listener of listeners) listener();
    if (account) void deps.save(account, draftsToKeep(drafts)).catch(() => undefined);
  };

  /** Changes one draft from what it is now; a draft that was removed meanwhile stays removed. */
  const change = (id: string, fn: (draft: CaptureDraft) => CaptureDraft) => {
    let changed = false;
    drafts = drafts.map((d) => {
      if (d.id !== id) return d;
      const next = fn(d);
      if (next !== d) changed = true;
      return next;
    });
    if (changed) publish();
  };

  async function run() {
    // A draft that fails is left alone for the rest of this run; the next kick tries it again.
    const failed = new Set<string>();
    for (let work = nextWork(drafts, failed); work; work = nextWork(drafts, failed)) {
      const { draft } = work;
      if (work.kind === "upload") {
        const { slot, file } = work;
        try {
          const url = await deps.upload(file.uri, slot === "video" ? "video" : "photo", draft);
          change(draft.id, (d) => ({ ...setUrl(d, slot, file.uri, url), error: d.error?.retry ? null : d.error }));
        } catch (error) {
          if (error instanceof FileGone) {
            change(draft.id, (d) => dropFile(d, slot, file.uri));
          } else {
            failed.add(draft.id);
            change(draft.id, (d) => ({ ...d, error: uploadFailure() }));
          }
        }
        continue;
      }
      try {
        const capture = await deps.send(draft, captureBody(draft));
        change(draft.id, (d) => applyAnswer(d, capture));
      } catch (error) {
        const out = sendFailure(apiError(error));
        if ("done" in out) {
          change(draft.id, (d) => ({ ...d, done: true, error: null }));
        } else {
          failed.add(draft.id);
          change(draft.id, (d) => ({ ...d, error: out.error }));
        }
      }
      const after = drafts.find((d) => d.id === draft.id);
      // The server has it all: the copies on this phone have done their work.
      if (after?.done) void deps.discard(localUris(after)).catch(() => undefined);
    }
  }

  async function pump() {
    if (running) {
      // Something changed while a run was going: one more run after it.
      again = true;
      return;
    }
    running = true;
    try {
      do {
        again = false;
        await run();
      } while (again);
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
    getDrafts: () => drafts,

    /**
     * Binds the queue to the signed-in account and takes back what an earlier visit
     * left for it. Another account's records are dropped from memory (they stay on
     * the phone under their own account): they are not this one's to send.
     */
    init(who: string): Promise<void> {
      // A second caller waits for the same load: a screen must not start a record over one still being read back.
      if (account === who) return loaded;
      if (account) drafts = [];
      account = who;
      loaded = (async () => {
        const kept = await deps.load(who).catch(() => [] as CaptureDraft[]);
        if (account !== who) return;
        // What was started in this run before the load came back wins over the copy on disk.
        drafts = [...kept.filter((k) => !drafts.some((d) => d.id === k.id)), ...drafts];
        publish();
        void pump();
      })();
      return loaded;
    },

    /** Starts a record, or takes the one already there for this booking, moment and side. */
    start(draft: CaptureDraft): CaptureDraft {
      const existing = drafts.find((d) => d.id === draft.id);
      if (existing) return existing;
      drafts = [...drafts, draft];
      publish();
      return draft;
    },

    /** A step of the walk: a photo taken, a tick, the finish. The queue then does what it can. */
    update(id: string, fn: (draft: CaptureDraft) => CaptureDraft) {
      change(id, fn);
      void pump();
    },

    /** Lets go of a record (it was sent and seen, or the booking is over). */
    remove(id: string) {
      const gone = drafts.find((d) => d.id === id);
      if (!gone) return;
      drafts = drafts.filter((d) => d.id !== id);
      publish();
      if (gone.done) void deps.discard(localUris(gone)).catch(() => undefined);
    },

    /** Runs the queue again: whatever was waiting for a connection gets its next try. */
    kick() {
      void pump();
    },

    /** "Try again" on one record: also sends again what the server refused last time. */
    retry(id: string) {
      change(id, (d) => (d.error ? { ...d, error: null } : d));
      void pump();
    },

    /** True while something is still to go up. */
    hasWork: () => nextWork(drafts) !== null,

    /** Resolves when nothing is going up any more (for tests, and for a screen that wants to wait). */
    async idle() {
      while (running) await new Promise((resolve) => setTimeout(resolve, 0));
    },
  };
}

export type CaptureQueue = ReturnType<typeof createCaptureQueue>;
