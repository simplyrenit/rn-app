import type { ApiError } from "@/lib/api-error";

/**
 * The phone's photo walk-through for drafts (SH-12; API-CONTRACT OE-G2). Plain
 * functions, so the order of the walk, the words, and what each failure of an
 * upload means can be tested.
 *
 * A draft is a product a shop made on the dashboard (spreadsheet, form or bulk
 * photos) that has no photo yet. The walk takes the shop through them one by one:
 * shoot, move on, and let the photo upload in the background.
 */

/** `GET /api/shop/drafts/needing-photos/`, oldest draft first. */
export interface NeedingDraft {
  name: string;
  title: string;
  shop_code: string;
}

// ---- The walk -------------------------------------------------------------------------

export interface Walk {
  /** Not yet seen, in the order they will come. */
  waiting: NeedingDraft[];
  /** Seen and skipped; they come round again when the shop asks. */
  skipped: NeedingDraft[];
  /** Photos taken in this walk. */
  taken: number;
  /** Drafts that needed photos when the walk began: the "42". */
  total: number;
}

/**
 * Starts a walk. A draft whose photo is already on its way (a job on this phone)
 * is not asked for again, though the server's list still has it until the upload ends.
 */
export function startWalk(drafts: NeedingDraft[], total: number, onItsWay: ReadonlySet<string> = new Set()): Walk {
  const waiting = drafts.filter((d) => !onItsWay.has(d.name));
  return { waiting, skipped: [], taken: 0, total: Math.max(total - onItsWay.size, waiting.length) };
}

/** The draft being shot now. */
export const currentDraft = (walk: Walk): NeedingDraft | null => walk.waiting[0] ?? null;

/** A photo was taken of the current draft: on to the next. */
export function took(walk: Walk): Walk {
  return { ...walk, waiting: walk.waiting.slice(1), taken: walk.taken + 1 };
}

/** "Skip for now": the current draft is put aside, and comes round again on request. */
export function skip(walk: Walk): Walk {
  const [first, ...rest] = walk.waiting;
  return first ? { ...walk, waiting: rest, skipped: [...walk.skipped, first] } : walk;
}

/** "Go through the skipped ones": they become the walk again. */
export function walkSkipped(walk: Walk): Walk {
  return { ...walk, waiting: walk.skipped, skipped: [] };
}

export type WalkState = "walking" | "skipped_left" | "finished";

export function walkState(walk: Walk): WalkState {
  if (walk.waiting.length > 0) return "walking";
  return walk.skipped.length > 0 ? "skipped_left" : "finished";
}

/** The next few after the current one, for "Up next". */
export const upNext = (walk: Walk, count = 3): NeedingDraft[] => walk.waiting.slice(1, 1 + count);

export interface WalkProgress {
  /** "Photo 7 of 42". */
  title: string;
  /** "6 photos done". */
  done: string;
  /** "36 left". */
  left: string;
  /** 0 to 1, for the bar. */
  fraction: number;
}

export function walkProgress(walk: Walk): WalkProgress {
  const position = Math.min(walk.taken + walk.skipped.length + 1, walk.total);
  return {
    title: `Photo ${position} of ${walk.total}`,
    done: `${walk.taken} ${walk.taken === 1 ? "photo" : "photos"} done`,
    left: `${Math.max(walk.total - walk.taken, 0)} left`,
    fraction: walk.total > 0 ? Math.min(walk.taken / walk.total, 1) : 0,
  };
}

/** The line on the card that opens the walk: "42 drafts need photos". */
export function needPhotosText(count: number): string {
  return `${count} ${count === 1 ? "draft needs" : "drafts need"} photos`;
}

/** The words under the shutter: what to put in the frame. */
export function frameHint(): string {
  return "Fit the whole item in the frame";
}

// ---- The uploads ------------------------------------------------------------------------

export type JobStatus = "queued" | "uploading" | "failed" | "done" | "gone";

/** One photo of one draft, on its way to the server. Kept on the phone until it is done. */
export interface PhotoJob {
  id: string;
  /** The draft's `name`. */
  name: string;
  title: string;
  /** The photo on this phone. */
  uri: string;
  width?: number;
  height?: number;
  /** The photo's address on Renit's bucket, once it is up: a retry then only attaches it. */
  url: string | null;
  status: JobStatus;
  error: string | null;
  /** The attach call was sent and its answer never came: it may have gone through. */
  attachSent: boolean;
}

/** The job that goes next: the first one waiting, in the order the photos were taken. */
export const nextJob = (jobs: readonly PhotoJob[]): PhotoJob | null => jobs.find((j) => j.status === "queued") ?? null;

/** Photos not yet on their draft. */
export const pendingJobs = (jobs: readonly PhotoJob[]) => jobs.filter((j) => j.status !== "done" && j.status !== "gone");

export interface JobCounts {
  uploading: number;
  failed: number;
}

/** What the strip says: those still going up (queued or uploading), and those that did not. */
export function jobCounts(jobs: readonly PhotoJob[]): JobCounts {
  return {
    uploading: jobs.filter((j) => j.status === "queued" || j.status === "uploading").length,
    failed: jobs.filter((j) => j.status === "failed").length,
  };
}

/** "2 photos uploading", "1 photo did not upload". Null when there is nothing to say. */
export function stripText(counts: JobCounts): { text: string; tone: "info" | "warning" } | null {
  const photos = (n: number) => `${n} ${n === 1 ? "photo" : "photos"}`;
  if (counts.failed > 0) {
    return {
      text: `${photos(counts.failed)} did not upload${counts.uploading > 0 ? `, ${counts.uploading} still going up` : ""}`,
      tone: "warning",
    };
  }
  if (counts.uploading > 0) return { text: `${photos(counts.uploading)} uploading`, tone: "info" };
  return null;
}

export interface JobOutcome {
  status: "failed" | "done" | "gone";
  message: string | null;
  /** The photo's address stays with the job: a retry only attaches it. */
  keepUrl: boolean;
  /** The attach may have gone through. */
  attachSent: boolean;
}

/**
 * What a failure means for a job.
 *
 * Making the photo (reading, resizing, the upload to the bucket) can only be tried
 * again. Attaching it can say more: the draft is no longer a draft (published or
 * archived while the shop was shooting), so there is nothing to attach to; it
 * already has five photos, so this one is not needed; the address was not
 * accepted, so the photo is made and sent again; or no answer came, in which case
 * the call may have gone through and the retry checks the draft first.
 */
export function classifyFailure(stage: "upload" | "attach", error: ApiError | null): JobOutcome {
  if (stage === "upload") {
    return { status: "failed", message: "It did not upload. Check your connection.", keepUrl: false, attachSent: false };
  }
  if (!error || error.status === 0 || error.status >= 500) {
    return { status: "failed", message: "We couldn't reach Renit. It will go through when you retry.", keepUrl: true, attachSent: true };
  }
  switch (error.code) {
    case "wrong_status":
      return { status: "gone", message: null, keepUrl: false, attachSent: false };
    case "too_many_photos":
      return { status: "done", message: null, keepUrl: false, attachSent: false };
    case "validation_error":
      return { status: "failed", message: "Renit couldn't accept that photo. It is sent again.", keepUrl: false, attachSent: false };
    case "not_found":
      return { status: "gone", message: null, keepUrl: false, attachSent: false };
    default:
      return { status: "failed", message: error.message ?? "Something went wrong. Try again.", keepUrl: true, attachSent: false };
  }
}

/** The file's own name: the part of an address that is the same on the bucket and on the CDN. */
const fileOf = (url: string) => url.split("?")[0].split("/").pop() ?? "";

/**
 * Whether a draft already has this photo, for the check before a repeated attach.
 * The phone sent the photo's address on the bucket and the server keeps it as a CDN
 * address, so the two are told apart by the file's name, which `uploadPhoto` makes
 * unique for every photo.
 */
export function hasPhoto(images: readonly string[] | null | undefined, url: string): boolean {
  const file = fileOf(url);
  return file !== "" && Boolean(images?.some((image) => fileOf(image) === file));
}

/** The words for a request that was refused because the account is not a shop. */
export function notAShopText(error: ApiError | null): string | null {
  return error?.code === "not_shop_owner" || error?.code === "not_owner"
    ? "Photos for drafts are for shops. Someone renting out their own things adds photos when listing."
    : null;
}
