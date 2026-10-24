import { apiError } from "@/lib/api-error";
import {
  Capture,
  CaptureBody,
  CaptureDraft,
  applyAnswer,
  applyPartial,
  captureBody,
  draftsToKeep,
  dropFile,
  files,
  localUris,
  nextWork,
  partialBody,
  refuseDark,
  removedUris,
  resendLater,
  sendFailure,
  setUrl,
  staleRefusal,
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
  /** Clears local files: of a record the server now has, and any file that has left a record. */
  discard: (uris: string[]) => Promise<void>;
  /** The time now; handed in so a test can move it. */
  now?: () => number;
}

/**
 * The queue of captures on their way to the server: one for the whole app,
 * outside any screen. A photo goes up as soon as it is taken; when the person has
 * finished the walk and every file is up, the record is sent in one call (a
 * basket's is also sent as its photos go up, `partialDue`). Nothing
 * is finished until the server has every file, and nothing is lost before that:
 * the drafts are kept on the phone, so a dead connection, a closed app or a
 * restart only delays them. `kick` runs it again (the app came back to the front,
 * the timer, Retry).
 *
 * A file is deleted from the phone at the moment it leaves a record: when the
 * server has the whole record, when a shot is taken again or dropped, and when a
 * record is let go of. A record the server refuses is not one of those: it stays,
 * with its files, until the booking shows it is not wanted or some days have passed.
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

  const now = () => (deps.now ? deps.now() : Date.now());
  const clear = (uris: string[]) => {
    if (uris.length > 0) void deps.discard(uris).catch(() => undefined);
  };

  /** Changes one draft from what it is now; a draft that was removed meanwhile stays removed. */
  const change = (id: string, fn: (draft: CaptureDraft) => CaptureDraft) => {
    let changed = false;
    const left: string[] = [];
    drafts = drafts.map((d) => {
      if (d.id !== id) return d;
      const next = fn(d);
      if (next !== d) {
        changed = true;
        // A shot taken again, a shot the list dropped, a file the server asked for anew.
        left.push(...removedUris(d, next));
        // The code was confirmed: the server's record is complete now, so the copies kept for it are done with.
        if (d.done && d.awaitingCode && next.done && !next.awaitingCode) left.push(...localUris(next));
      }
      return next;
    });
    if (changed) publish();
    clear(left);
  };

  /** Takes drafts out of the queue and clears every file they hold. */
  const drop = (gone: CaptureDraft[]) => {
    if (gone.length === 0) return;
    const ids = new Set(gone.map((d) => d.id));
    drafts = drafts.filter((d) => !ids.has(d.id));
    publish();
    clear(gone.flatMap(localUris));
  };

  /** Whether a slot of a draft still holds the file that was being sent. */
  const stillHolds = (id: string, uri: string) => {
    const held = drafts.find((d) => d.id === id);
    return Boolean(held && files(held).some(({ file }) => file.uri === uri));
  };

  async function run() {
    // A draft that fails is left alone for the rest of this run; the next kick tries it again.
    const failed = new Set<string>();
    // How often the server took a file out of a record in this run: it is sent again once by itself, then left for the next try.
    const missed = new Map<string, number>();
    for (let work = nextWork(drafts, failed); work; work = nextWork(drafts, failed)) {
      const { draft } = work;
      if (work.kind === "upload") {
        const { slot, file } = work;
        try {
          const url = await deps.upload(file.uri, slot === "video" ? "video" : "photo", draft);
          change(draft.id, (d) => ({ ...setUrl(d, slot, file.uri, url), error: d.error?.retry ? null : d.error }));
        } catch (error) {
          if (!stillHolds(draft.id, file.uri)) {
            // The shot was taken again (and its first file cleared) while this one was going up: not a failure.
          } else if (error instanceof FileGone) {
            change(draft.id, (d) => dropFile(d, slot, file.uri));
          } else {
            failed.add(draft.id);
            change(draft.id, (d) => ({ ...d, error: uploadFailure() }));
          }
        }
        continue;
      }
      const partial = Boolean(work.partial);
      try {
        const body = partial ? partialBody(draft) : captureBody(draft);
        const capture = await deps.send(draft, body);
        // A basket's record on its way: the answer is remembered; a missing file is the finished send's to name.
        change(draft.id, (d) => (partial ? applyPartial(d, capture, body) : applyAnswer(d, capture)));
        const reopened = drafts.find((d) => d.id === draft.id);
        if (!partial && reopened && !reopened.done && reopened.sealed && !reopened.desk) {
          const times = (missed.get(draft.id) ?? 0) + 1;
          missed.set(draft.id, times);
          if (times >= 2) {
            failed.add(draft.id);
            change(draft.id, (d) => ({ ...d, error: resendLater() }));
          }
        }
      } catch (error) {
        const failure = apiError(error);
        if (failure?.code === "photo_too_dark") {
          // A black or blank photo: it leaves the record and is taken again; nothing is sent until then.
          failed.add(draft.id);
          change(draft.id, (d) => refuseDark(d, failure));
          continue;
        }
        const out = sendFailure(failure, { forOther: draft.forOther });
        if ("done" in out) {
          change(draft.id, (d) => ({ ...d, done: true, error: null }));
        } else {
          failed.add(draft.id);
          // Refused as not taken now: the sending stops, the files stay. The first refusal's time is kept.
          const refusedAt = out.refused ? new Date(now()).toISOString() : null;
          change(draft.id, (d) => ({ ...d, error: out.error, refusedAt: d.refusedAt ?? refusedAt }));
        }
      }
      const after = drafts.find((d) => d.id === draft.id);
      // The server has it all: the copies on this phone have done their work. A record that still waits for the
      // other person's code is not complete: its files stay on the phone until the code is confirmed (so a file that
      // turns out missing is sent again, not taken again).
      if (after?.done && !after.awaitingCode) clear(localUris(after));
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
        // A record the server refused days ago will never be taken: it is let go of now.
        drop(drafts.filter((d) => staleRefusal(d, now())));
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

    /** Lets go of one record and its files. */
    remove(id: string) {
      drop(drafts.filter((d) => d.id === id));
    },

    /**
     * A screen has read a booking: the records held for it that `keep` says no to
     * are let go of, with their files (the server has the complete one, or the
     * booking shows the record is not wanted any more).
     */
    release(number: string, keep: (draft: CaptureDraft) => boolean) {
      drop(drafts.filter((d) => d.number === number && !keep(d)));
    },

    /** Runs the queue again: whatever was waiting for a connection gets its next try. */
    kick() {
      void pump();
    },

    /**
     * "Try again" on a record the person has finished: also sends again what the
     * server refused last time. A record that still needs a photo is not helped by
     * this; its card opens the capture instead.
     */
    retry(id: string) {
      change(id, (d) => (d.error && d.sealed ? { ...d, error: null } : d));
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
