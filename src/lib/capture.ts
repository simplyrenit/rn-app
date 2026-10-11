import { ApiError, fieldErrors } from "@/lib/api-error";

/**
 * The capture: the photos, the video and the ticks both people record at the
 * handover and again at the return (API-CONTRACT OE-I; booking plan, "The
 * capture"). It is the evidence every claim rests on, so the rules are plain
 * functions that can be tested: what is shot next, what the screen says, what is
 * sent, and what a failure means.
 *
 * A record being made on this phone is a `CaptureDraft`. It is kept on the phone
 * until the server has every file (`capture-queue.ts`), so a lost connection or a
 * closed app loses nothing.
 */

export type Moment = "handover" | "return";
export type Side = "owner" | "customer";

export const otherSide = (side: Side): Side => (side === "owner" ? "customer" : "owner");

/**
 * How long the video may run, on both platforms (decision T-18). The system camera
 * is asked to stop by itself at this length; a camera app that ignores the limit is
 * caught afterwards (`videoProblem`).
 */
export const VIDEO_SECONDS = 15;
/** A camera stops a moment after the limit, not on it. */
export const VIDEO_GRACE_SECONDS = 2;
/**
 * The largest video the app sends. A 15-second clip is far below this at any usual
 * setting; it stops a 4K, high-frame-rate clip from holding up every other upload.
 * ponytail: no compression on Android (T-18); this ceiling and the length are the only bounds.
 */
export const VIDEO_MAX_BYTES = 250 * 1024 * 1024;

// ---- The contract's objects ---------------------------------------------------------------

export interface Shot {
  key: string;
  label: string;
  hint: string;
}

/** `GET /api/bookings/{number}/shot-list/`. */
export interface ShotList {
  shots: Shot[];
  video_hint: string;
  /** The checklist, ticked at handover and again at return. */
  included_items: string[];
  included_items_source?: "listing" | "category" | "generic";
  /** The owner looks at the customer's ID at the handover and ticks that the name matches. */
  id_match_required: boolean;
}

export interface CaptureShot {
  key: string;
  label: string;
  url: string;
  taken_at: string;
  lat?: number | null;
  long?: number | null;
}

export interface ChecklistItem {
  item: string;
  ticked: boolean;
}

export interface Capture {
  moment: Moment;
  side: Side;
  recorded_by_other_side: boolean;
  shots: CaptureShot[];
  video: { url: string; taken_at: string } | null;
  checklist: ChecklistItem[];
  id_match_ticked: boolean | null;
  /** What is still needed: shot keys, `video`, `id_match`, `confirmation_code`. */
  missing: string[];
  complete: boolean;
  completed_at: string | null;
}

/** `GET /api/bookings/{number}/captures/`. */
export type Captures = Record<Moment, Record<Side, Capture | null>>;

/** `captures` on a booking: whether each capture has finished uploading. */
export type CaptureFlags = Record<Moment, { mine: boolean; theirs: boolean }>;

/** `POST /api/bookings/{number}/phone-fallback/`. */
export interface PhoneFallback {
  moment: Moment;
  absent_side: Side;
  expires_at: string;
  /** Where the code went, masked: "··· ··· 2345". */
  sent_to: string;
}

// ---- The record being made on this phone -------------------------------------------------------

/** One photo or the video, on this phone. */
export interface LocalFile {
  uri: string;
  /** When it was taken, by the server's clock where the phone knows it. */
  taken_at: string;
  lat?: number;
  long?: number;
  /** The video's real length, when the camera said; never a rounded-down guess. */
  seconds?: number;
  /** The file's size, when the phone could read it. Shown before it is sent. */
  bytes?: number;
  /** Its address on Renit's bucket, once it is up. */
  url: string | null;
}

export interface CaptureDraft {
  /** `captureId`: one draft for each booking, moment and side. */
  id: string;
  number: string;
  moment: Moment;
  side: Side;
  /** This phone records the other person's set, because their phone failed (ENG-219). */
  forOther: boolean;
  /** The list it was started with, kept so the walk works with no connection. */
  list: ShotList;
  /** By shot key. */
  shots: Record<string, LocalFile>;
  video: LocalFile | null;
  checklist: ChecklistItem[];
  /** "ID matches the booking name". Only asked of the owner at the handover, when the server says so. */
  idMatch: boolean;
  /** The person has finished the walk: once every file is up, the record is sent. */
  sealed: boolean;
  /** The server has it all. */
  done: boolean;
  /** The other person's set is up and waits for the code they read out. */
  awaitingCode: boolean;
  /** Why it is not moving. `retry`: it goes again by itself; otherwise the person has to act. */
  error: { text: string; retry: boolean } | null;
  /**
   * The slot the camera was opened for and has not answered yet. On Android the
   * system may close the app while its camera is in front; the photo is then
   * handed back at the next start, and this says where it belongs.
   */
  shooting?: Slot | null;
  /** When the server first refused this record as not taken at the booking's stage. Kept a while, never deleted on one answer. */
  refusedAt?: string | null;
  /**
   * Why Renit's desk has to finish this record, once the phone cannot:
   *  - `codes`: no more codes can be sent for the other person (the server allows three for a booking and moment,
   *    and refused a fourth as `rate_limited`); the last one sent may still be valid, so the box for it stays;
   *  - `dead`: and the last code is spent or has run out, so it can never be confirmed from the phone;
   *  - `files`: the server took the same file out of the record again and again, and the phone stopped sending it.
   * The files stay on the phone until the desk has finished the record.
   */
  desk?: "codes" | "dead" | "files";
  /** How many times the server answered that it lacked a file the phone holds (the file is sent again each time). */
  lost?: number;
  /** Started from the general list the app carries, because the booking's own list could not be read. */
  generic?: boolean;
  /**
   * Photos of a record begun on the general list that the booking's own list does not ask for. They are not
   * required and not sent (the `PUT` carries the list's shots), but they are evidence of what the item looked
   * like at the door, so they stay on the phone until the record is let go of (app-4 review r2, finding 16).
   */
  spare?: Record<string, LocalFile>;
}

export const captureId = (number: string, moment: Moment, side: Side) => `${number}:${moment}:${side}`;

/** Whether this record needs the owner's ID tick before it can be finished. */
export function needsIdMatch(draft: Pick<CaptureDraft, "side" | "moment" | "list">): boolean {
  return draft.side === "owner" && draft.moment === "handover" && draft.list.id_match_required;
}

const untickedList = (items: readonly string[], kept: readonly ChecklistItem[] = []): ChecklistItem[] =>
  items.map((item) => ({ item, ticked: kept.some((k) => k.item === item && k.ticked) }));

export function startDraft(input: {
  number: string;
  moment: Moment;
  side: Side;
  forOther?: boolean;
  list: ShotList;
  generic?: boolean;
}): CaptureDraft {
  return {
    id: captureId(input.number, input.moment, input.side),
    number: input.number,
    moment: input.moment,
    side: input.side,
    forOther: Boolean(input.forOther),
    list: input.list,
    shots: {},
    video: null,
    checklist: untickedList(input.list.included_items),
    idMatch: false,
    sealed: false,
    done: false,
    awaitingCode: false,
    error: null,
    shooting: null,
    refusedAt: null,
    generic: Boolean(input.generic),
  };
}

/**
 * The server's list has changed since the draft began (staff edit lists without a
 * release). The photos of shots it still asks for are kept, the ticks too; the
 * walk then asks for whatever is new.
 */
export function withList(draft: CaptureDraft, list: ShotList): CaptureDraft {
  const same =
    list.shots.length === draft.list.shots.length &&
    list.shots.every((shot, i) => shot.key === draft.list.shots[i]?.key) &&
    list.included_items.join("\n") === draft.list.included_items.join("\n") &&
    list.id_match_required === draft.list.id_match_required;
  if (same) return draft;
  const asked = new Set(list.shots.map((shot) => shot.key));
  const shots = Object.fromEntries(Object.entries(draft.shots).filter(([key]) => asked.has(key)));
  // The general list is a stand-in for the booking's own: what it took and the real list does not ask for is kept, not deleted.
  const dropped = draft.generic ? Object.fromEntries(Object.entries(draft.shots).filter(([key]) => !asked.has(key))) : {};
  const next: CaptureDraft = {
    ...draft,
    list,
    shots,
    ...(Object.keys(dropped).length > 0 ? { spare: { ...draft.spare, ...dropped } } : {}),
    checklist: untickedList(list.included_items, draft.checklist),
    // The booking's own list has arrived: the record is no longer on the general one.
    generic: false,
  };
  // A shot was added, or the ID tick is now asked for: the person has something left to do.
  return canSeal(next) ? next : { ...next, sealed: false };
}

export type CaptureStep =
  | { kind: "shot"; index: number }
  | { kind: "video" }
  | { kind: "checklist" }
  | { kind: "upload" };

/** What the person does next: the first shot not taken, then the video, then the ticks, then nothing but wait. */
export function nextStep(draft: CaptureDraft): CaptureStep {
  const index = draft.list.shots.findIndex((shot) => !draft.shots[shot.key]);
  if (index >= 0) return { kind: "shot", index };
  if (!draft.video) return { kind: "video" };
  return draft.sealed ? { kind: "upload" } : { kind: "checklist" };
}

/** A photo was taken (or taken again) for one shot of the list. */
export function addShot(draft: CaptureDraft, key: string, file: Omit<LocalFile, "url">): CaptureDraft {
  return { ...draft, shots: { ...draft.shots, [key]: { ...file, url: null } }, error: null, shooting: null };
}

export function setVideo(draft: CaptureDraft, file: Omit<LocalFile, "url">): CaptureDraft {
  return { ...draft, video: { ...file, url: null }, error: null, shooting: null };
}

/** The camera is about to open for this slot (or, with null, has come back with nothing). */
export function withShooting(draft: CaptureDraft, slot: Slot | null): CaptureDraft {
  return { ...draft, shooting: slot };
}

/** A photo or a video the camera handed back after the app was closed under it: it goes into the slot that was waiting. */
export function recoverShot(
  draft: CaptureDraft,
  taken: { kind: "photo" | "video"; file: Omit<LocalFile, "url"> }
): CaptureDraft {
  const slot = draft.shooting;
  if (!slot) return draft;
  if (slot === "video") return taken.kind === "video" ? setVideo(draft, taken.file) : withShooting(draft, null);
  return taken.kind === "photo" ? addShot(draft, slot.shot, taken.file) : withShooting(draft, null);
}

export function tick(draft: CaptureDraft, item: string): CaptureDraft {
  return { ...draft, checklist: draft.checklist.map((c) => (c.item === item ? { ...c, ticked: !c.ticked } : c)) };
}

export function setIdMatch(draft: CaptureDraft, ticked: boolean): CaptureDraft {
  return { ...draft, idMatch: ticked };
}

/** Every shot and the video are taken, and the ID tick is made where it is asked for. */
export function canSeal(draft: CaptureDraft): boolean {
  return (
    draft.list.shots.every((shot) => Boolean(draft.shots[shot.key])) &&
    Boolean(draft.video) &&
    (!needsIdMatch(draft) || draft.idMatch)
  );
}

/** "Done" on the checklist: from here the record is sent as soon as its files are up. */
export function seal(draft: CaptureDraft): CaptureDraft {
  return canSeal(draft) ? { ...draft, sealed: true, error: null } : draft;
}

/** Which file of a draft: a shot's key, or the video. */
export type Slot = { shot: string } | "video";

const fileAt = (draft: CaptureDraft, slot: Slot): LocalFile | null =>
  slot === "video" ? draft.video : draft.shots[slot.shot] ?? null;

const withFile = (draft: CaptureDraft, slot: Slot, file: LocalFile | null): CaptureDraft => {
  if (slot === "video") return { ...draft, video: file };
  const shots = { ...draft.shots };
  if (file) shots[slot.shot] = file;
  else delete shots[slot.shot];
  return { ...draft, shots };
};

/** The files of a draft in the order they go up: the shots as the list has them, then the video. */
export function files(draft: CaptureDraft): { slot: Slot; file: LocalFile }[] {
  const out: { slot: Slot; file: LocalFile }[] = [];
  for (const shot of draft.list.shots) {
    const file = draft.shots[shot.key];
    if (file) out.push({ slot: { shot: shot.key }, file });
  }
  if (draft.video) out.push({ slot: "video", file: draft.video });
  return out;
}

/**
 * The file is up. Written only if the slot still holds that file: a shot taken
 * again while the first one was going up keeps its own, new, file.
 */
export function setUrl(draft: CaptureDraft, slot: Slot, uri: string, url: string): CaptureDraft {
  const file = fileAt(draft, slot);
  return file && file.uri === uri ? withFile(draft, slot, { ...file, url }) : draft;
}

/** The file is no longer on the phone (the system cleared it): it has to be taken again. */
export function dropFile(draft: CaptureDraft, slot: Slot, uri: string): CaptureDraft {
  const file = fileAt(draft, slot);
  if (!file || file.uri !== uri) return draft;
  return {
    ...withFile(draft, slot, null),
    sealed: false,
    error: {
      text: slot === "video" ? "The video was lost before it could upload. Record it again." : "A photo was lost before it could upload. Take it again.",
      retry: false,
    },
  };
}

/** Sealed, and every file is on the bucket: the record can be sent. */
export function readyToSend(draft: CaptureDraft): boolean {
  return draft.sealed && !draft.done && canSeal(draft) && files(draft).every(({ file }) => file.url !== null);
}

export type Work =
  | { kind: "upload"; draft: CaptureDraft; slot: Slot; file: LocalFile }
  | { kind: "send"; draft: CaptureDraft };

/**
 * The next thing the queue does: a file to put on the bucket, or a finished
 * record to send. Photos go first, across every record on the phone, so a small
 * file is never stuck behind a large video (review r1 #4); then, record by record
 * in the order they were started, its video and its send. `skip` holds the drafts
 * that have just failed, so one bad draft does not hold up the rest of a run.
 */
export function nextWork(drafts: readonly CaptureDraft[], skip: ReadonlySet<string> = new Set()): Work | null {
  const live = drafts.filter((draft) => !draft.done && !skip.has(draft.id));
  for (const draft of live) {
    const photo = files(draft).find(({ slot, file }) => slot !== "video" && file.url === null);
    if (photo) return { kind: "upload", draft, ...photo };
  }
  for (const draft of live) {
    const video = files(draft).find(({ slot, file }) => slot === "video" && file.url === null);
    if (video) return { kind: "upload", draft, ...video };
    // A send the server refused for a reason only a person can fix is not sent again by itself.
    if (readyToSend(draft) && !(draft.error && !draft.error.retry)) return { kind: "send", draft };
  }
  return null;
}

/** `PUT /api/bookings/{number}/captures/{moment}/{side}/`. */
export interface CaptureBody {
  shots: { key: string; url: string; taken_at: string; lat?: number; long?: number }[];
  video?: { url: string; taken_at: string };
  checklist: ChecklistItem[];
  id_match_ticked?: boolean;
}

/** What is sent: every file that is up, the ticks, and the ID tick where it is asked for. */
export function captureBody(draft: CaptureDraft): CaptureBody {
  const body: CaptureBody = { shots: [], checklist: draft.checklist };
  for (const shot of draft.list.shots) {
    const file = draft.shots[shot.key];
    if (!file?.url) continue;
    body.shots.push({
      key: shot.key,
      url: file.url,
      taken_at: file.taken_at,
      // The place is left out when the phone could not give one; it is never made up.
      ...(typeof file.lat === "number" && typeof file.long === "number" ? { lat: file.lat, long: file.long } : {}),
    });
  }
  if (draft.video?.url) body.video = { url: draft.video.url, taken_at: draft.video.taken_at };
  if (needsIdMatch(draft)) body.id_match_ticked = draft.idMatch;
  return body;
}

/**
 * The server's answer to the send. Complete: done. For the other person's set,
 * "only the code is missing" also ends the upload: the code is the next step.
 * A file the server lists under `missing` was not on the bucket, or was too big, and is out of its record: the phone
 * still holds it, so it is sent again from the kept copy (`reopenForMissing`, as on the confirm); only a file the
 * phone no longer holds, or the ID tick, goes back to the person.
 */
export function applyAnswer(draft: CaptureDraft, capture: Pick<Capture, "complete" | "missing">): CaptureDraft {
  if (capture.complete) return { ...stopLifted(draft), done: true, awaitingCode: false, error: null };
  const missing = capture.missing ?? [];
  const beyondCode = missing.filter((m) => m !== "confirmation_code");
  if (beyondCode.length === 0 && missing.includes("confirmation_code")) {
    return { ...stopLifted(draft), done: true, awaitingCode: true, error: null };
  }
  // Not complete and nothing named: sent again by itself it would only be refused again. The person finishes it again.
  if (beyondCode.length === 0) return { ...draft, sealed: false, error: STILL_NEEDS };
  return reopenForMissing(draft, beyondCode);
}

const STILL_NEEDS: NonNullable<CaptureDraft["error"]> = {
  text: "Renit still needs something for this record. Add what is missing and finish again.",
  retry: false,
};

/** The photo size the server takes (API-CONTRACT Common); it takes a larger one out of the record and asks for it again. */
export const PHOTO_MAX_BYTES = 15 * 1024 * 1024;

/** A photo that must be made smaller before it is sent: the server would refuse it. Unknown size: sent as it is. */
export const overPhotoLimit = (bytes: number | null | undefined): boolean => typeof bytes === "number" && bytes > PHOTO_MAX_BYTES;

/** What a refused confirm of the other person's set lists as still missing, other than the code itself. */
function missingBeyondCode(error: ApiError | null): string[] {
  const missing = error?.details?.missing;
  return Array.isArray(missing) ? missing.filter((m): m is string => typeof m === "string" && m !== "confirmation_code") : [];
}

/**
 * What a refused confirm of the other person's set means (`POST …/phone-fallback/confirm/`):
 *  - `confirmed`: 409 `capture_locked`, the set is already complete (a confirm whose answer was lost).
 *  - `reopened`: 409 `capture_incomplete` with files still missing (one never reached the bucket and was taken out of
 *    the record): the draft is opened again for exactly those, as for a send (`applyAnswer`), and the code is asked again after.
 *  - `error`: anything else, in words; a 503 `storage_unavailable` says to try again, and nothing is lost.
 */
export type ConfirmResult = { kind: "confirmed" } | { kind: "reopened"; missing: string[] } | { kind: "error"; text: string };

export function confirmFailure(error: ApiError | null): ConfirmResult {
  if (error?.code === "capture_locked") return { kind: "confirmed" };
  if (error?.code === "capture_incomplete") {
    const beyond = missingBeyondCode(error);
    if (beyond.length > 0) return { kind: "reopened", missing: beyond };
  }
  return { kind: "error", text: fallbackErrorText(error) };
}

/** After this many times the server has taken a file out of the same record, the phone stops sending it again. */
export const MAX_LOST = 5;

/**
 * The record opened again for what a refused confirm said was missing: it was uploaded and waiting for its code
 * (`done`), and is now not. A file the phone still holds (it is kept while the record waits for its code) is simply
 * sent again, by itself; one it no longer holds, or the ID tick, is asked for from the person. The same for a send
 * whose answer lists a file under `missing` (`applyAnswer`).
 *
 * The times the server takes a held file out are counted (`lost`). After `MAX_LOST` the phone stops: the files stay on
 * the phone, nothing is sent again by itself, and the card says Renit's desk has to look (`desk: "files"`).
 */
export function reopenForMissing(draft: CaptureDraft, missing: string[]): CaptureDraft {
  let next: CaptureDraft = { ...draft, done: false, awaitingCode: false, error: null };
  let held = false;
  for (const what of missing) {
    if (what === "confirmation_code") continue;
    if (what === "id_match") next = { ...next, idMatch: false, sealed: false };
    else if (what === "video") {
      if (next.video) {
        held = true;
        next = { ...next, video: { ...next.video, url: null } };
      } else next = { ...next, sealed: false };
    } else {
      const file = next.shots[what];
      if (file) held = true;
      next = file ? withFile(next, { shot: what }, { ...file, url: null }) : { ...next, sealed: false };
    }
  }
  if (held) {
    const lost = (draft.lost ?? 0) + 1;
    if (lost >= MAX_LOST) {
      // Stopped: addresses stay as they were, so nothing is uploaded or sent again by itself; the files are kept.
      return { ...draft, lost, desk: "files", error: { text: FILES_KEPT, retry: false } };
    }
    next = { ...next, lost };
  }
  return next.sealed ? next : { ...next, error: STILL_NEEDS };
}

/**
 * A send the server took, with nothing of the record missing but possibly its code: the phone's stop on a file the server
 * kept losing (`desk: "files"`, and the count behind it) is over. The marks about the codes stay: they are about the codes.
 */
const stopLifted = (draft: CaptureDraft): CaptureDraft => {
  if (draft.desk !== "files" && !draft.lost) return draft;
  const { lost: _lost, ...rest } = draft;
  return draft.desk === "files" ? (({ desk: _desk, ...kept }) => kept)(rest) : rest;
};

/** The words when the phone has stopped sending a file the server keeps taking out. */
export const FILES_KEPT =
  "Renit keeps losing a file of this record after it is sent. Nothing is lost: the photos and video are kept on this phone. Tell Renit's desk through Get help and they will sort it out.";

/** The server did not find a file after it was sent, twice in one run: it is sent again on the next try, with nothing lost. */
export const resendLater = (): NonNullable<CaptureDraft["error"]> => ({
  text: "Renit did not find a file after it was sent. It is sent again soon.",
  retry: true,
});

/** Renit's desk has to finish this record (`desk`): no more codes, or a file the server keeps losing. */
export const needsDesk = (draft: CaptureDraft): boolean => Boolean(draft.desk);
/** No more codes can be sent (`rate_limited`): the last one sent may still be valid, so the box for it stays. */
export const markNoMoreCodes = (draft: CaptureDraft): CaptureDraft => (draft.desk ? draft : { ...draft, desk: "codes" });
/** And the last code is spent or has run out: it can never be confirmed from here. */
export const markCodeDead = (draft: CaptureDraft): CaptureDraft => (draft.desk === "codes" ? { ...draft, desk: "dead" } : draft);

/** The words when a record's code can never be confirmed from the phone, with Get help beside them. */
export const DESK_FINISHES = "No more codes can be sent for this record, so Renit's desk has to finish it. Tell the desk through Get help and it will be done by phone.";
/** While the last code sent may still work. */
export const NO_MORE_CODES = "No more codes can be sent for this record. If the last one has not run out, type it. If it has, tell Renit's desk through Get help and they will finish it by phone.";

/**
 * What to tell the person after a confirm said files were missing and the record was opened again for them
 * (`reopenForMissing`): the words follow what the phone does. Every file still held is sent again by itself, with
 * nothing to do but wait; only a file the phone no longer holds, or the ID tick, is asked for from the person.
 */
export const reopenedText = (reopened: Pick<CaptureDraft, "sealed">): string =>
  reopened.sealed
    ? "A file of this record did not reach Renit. It is being sent again by itself. Ask for the code again once it is up."
    : "A file of this record did not upload. Take what is missing again, then finish.";

/** The other person read out the code and the server took it. */
export const codeConfirmed = (draft: CaptureDraft): CaptureDraft => ({ ...draft, awaitingCode: false });

const STORAGE_UNAVAILABLE = "We could not check your photos just now. Try again.";
const OFFLINE = "Waiting for a connection. It uploads by itself when you are back online.";

/** A file did not go up: it is tried again, by itself. */
export const uploadFailure = (): NonNullable<CaptureDraft["error"]> => ({ text: OFFLINE, retry: true });

/**
 * What a refused send means.
 *  - `capture_locked`: the server already has a complete record (an earlier send
 *    whose answer was lost), so this one is done.
 *  - No answer, a fault, too many calls, or a 401 (the access token ran out and its
 *    refresh did not get through, which is a network failure and not a verdict):
 *    tried again, by itself.
 *  - `stage_not_allowed`, `not_found`: the server says it does not take this record
 *    now. `refused`: the sending stops and the screen says so, but the files stay on
 *    the phone. Evidence is not deleted on one answer; it goes when the booking
 *    itself shows the record is not wanted (`recordWanted`), or after some days.
 *  - Anything else needs a person.
 */
export function sendFailure(
  error: ApiError | null,
  record: { forOther?: boolean } = {}
): { done: true } | { error: NonNullable<CaptureDraft["error"]>; refused?: true } {
  if (error?.code === "capture_locked") return { done: true };
  // Renit's storage could not be asked about the photos (503): nothing is lost, and it is tried again, by itself or on Try again.
  if (error?.code === "storage_unavailable") return { error: { text: STORAGE_UNAVAILABLE, retry: true } };
  if (
    !error ||
    error.status === 0 ||
    error.status >= 500 ||
    error.status === 429 ||
    error.status === 408 ||
    error.status === 401
  ) {
    return { error: { text: OFFLINE, retry: true } };
  }
  switch (error.code) {
    case "stage_not_allowed":
    case "not_found":
      return {
        error: {
          text: "Renit did not take this record for the booking as it stands. It is kept on this phone; try again, or ask Renit's desk.",
          retry: false,
        },
        refused: true,
      };
    case "forbidden":
      // The other person's set is taken only while a code for it can still be typed: when it has run out the way on
      // is a new code, not a dead end (the card and the capture screen both offer "Send a new code").
      return record.forOther
        ? { error: { text: "The code for the other person has run out. Send a new one, then try again.", retry: false } }
        : { error: { text: "This record can't be saved from this phone right now.", retry: false } };
    case "validation_error":
      // The server's own sentence for the field: a capture holds at most 40 photos, and the like.
      return { error: { text: Object.values(fieldErrors(error))[0] ?? error.message ?? "Renit couldn't accept this record. Try again.", retry: false } };
    default:
      return { error: { text: error.message ?? "Renit couldn't accept this record. Try again.", retry: false } };
  }
}

/** How long a record the server refused is kept on the phone before it is let go of. */
export const REFUSED_KEEP_MS = 7 * 24 * 60 * 60 * 1000;

/** True for a record the server refused long enough ago that it will never be taken. */
export function staleRefusal(draft: Pick<CaptureDraft, "refusedAt">, nowMs: number): boolean {
  const at = Date.parse(draft.refusedAt ?? "");
  return Number.isFinite(at) && nowMs - at > REFUSED_KEEP_MS;
}

/** The drafts worth keeping on the phone: everything the server does not have yet, or that waits for a code. */
export const draftsToKeep = (drafts: readonly CaptureDraft[]) => drafts.filter((d) => !d.done || d.awaitingCode);

/** Every local file of a draft, to clear away once the server has them (the spare photos too, with the record). */
export const localUris = (draft: CaptureDraft) => [
  ...files(draft).map(({ file }) => file.uri),
  ...Object.values(draft.spare ?? {}).map((file) => file.uri),
];

export type DraftState = "recording" | "uploading" | "waiting" | "stuck" | "code" | "done";

/** Where a record stands, in one word, for the screens. */
export function draftState(draft: CaptureDraft): DraftState {
  if (draft.done) return draft.awaitingCode ? "code" : "done";
  if (draft.error) return draft.error.retry ? "waiting" : "stuck";
  return draft.sealed ? "uploading" : "recording";
}

export interface UploadProgress {
  uploaded: number;
  total: number;
  /** 0 to 1, for the bar. */
  fraction: number;
  /** "5 of 7 uploaded". */
  text: string;
}

/** How much of a record is on the bucket: every shot of the list, and the video. */
export function uploadProgress(draft: CaptureDraft): UploadProgress {
  const all = files(draft);
  const total = draft.list.shots.length + 1;
  const uploaded = draft.done ? total : all.filter(({ file }) => file.url !== null).length;
  return {
    uploaded,
    total,
    fraction: total > 0 ? Math.min(uploaded / total, 1) : 0,
    text: draft.done ? "All uploaded" : `${uploaded} of ${total} uploaded`,
  };
}

/** A file's size as a person reads it: "38 MB", "850 KB". */
export function sizeLabel(bytes: number | null | undefined): string {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  const mb = n / (1024 * 1024);
  if (mb >= 10) return `${Math.round(mb)} MB`;
  if (mb >= 1) return `${mb.toFixed(1).replace(/\.0$/, "")} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

/**
 * Why a video just recorded cannot be used, or null. The length and the size are
 * the file's own: a camera app that ignored the limit is asked again, and a clip
 * is never labelled shorter than it is.
 */
export function videoProblem(video: { seconds?: number | null; bytes?: number | null }): string | null {
  const seconds = Number(video.seconds);
  if (Number.isFinite(seconds) && seconds > VIDEO_SECONDS + VIDEO_GRACE_SECONDS) {
    return `That video is ${durationLabel(seconds)} long. Record it again, up to ${durationLabel(VIDEO_SECONDS)}.`;
  }
  const bytes = Number(video.bytes);
  if (Number.isFinite(bytes) && bytes > VIDEO_MAX_BYTES) {
    return `That video is ${sizeLabel(bytes)}, too large to send. Set the camera to 1080p or lower and record it again.`;
  }
  return null;
}

/** "Video · 0:14 · 38 MB": the video as the checklist and the upload step name it. */
export function videoLabel(video: Pick<LocalFile, "seconds" | "bytes"> | null | undefined): string {
  return ["Video", video?.seconds ? durationLabel(video.seconds) : "", sizeLabel(video?.bytes)].filter(Boolean).join(" · ");
}

// ---- When a record can still be made (one rule for every screen) --------------------------------

/**
 * The stages in which the server takes a capture for each moment (API-CONTRACT
 * OE-I, `PUT …/captures/{moment}/{side}/`; A-3, A2-3, P4-9). A capture stays writable
 * after the code is typed: the handover's through `out`, `returned` and `closed`
 * (the owner's payout waits for it), the return's through `closed` too (P4-9). A
 * return record begun and still uploading when the booking closes at 48 hours is
 * therefore sent, not let go of; but no new return record is begun on a closed
 * booking (`recordState`), since the booking was settled without it (decision A-28).
 */
const TAKEN_IN: Record<Moment, readonly string[]> = {
  handover: ["ready", "out", "returned", "closed"],
  return: ["out", "returned", "closed"],
};

/** What the rule needs of a booking, either side's. */
export interface RecordBooking {
  stage: string;
  exit: string;
  can: readonly string[];
  /**
   * The booking this one extends. An extension is `out` with no handover of its own (the item is
   * already with the customer, and its payout waits for no capture), so no handover record is
   * offered on it (review app-4 r2, finding 14). The shop's booking carries no such field.
   */
  extends?: string | null;
}

/**
 * Whether a record for this moment is still of use to the booking: it has not
 * ended early, and it is at a stage in which the server takes the capture. A draft
 * on the phone is let go of only when this says no: the booking itself, not one
 * refused call, decides that evidence is not wanted.
 */
export function recordWanted(moment: Moment, booking: Pick<RecordBooking, "stage" | "exit">): boolean {
  return !booking.exit && TAKEN_IN[moment].includes(booking.stage);
}

/** The server takes a record now: its own `can` list says so, or the contract's stages do. */
export function serverTakes(moment: Moment, booking: RecordBooking): boolean {
  return booking.can.includes(`capture_${moment}`) || recordWanted(moment, booking);
}

export type RecordState = "none" | "start" | "continue" | "uploading" | "waiting" | "stuck" | "code";

export interface RecordInput {
  moment: Moment;
  booking: RecordBooking;
  /** The booking's flag for this side: the server has the complete record. */
  onServer: boolean;
  /** The record this phone holds for this side, if any. */
  draft: CaptureDraft | null | undefined;
  /** Money still waits on this record (the owner's payout on the handover record). */
  stake?: boolean;
  /** The other person's set, recorded here because their phone failed: carried on from a card, never begun from one. */
  forOther?: boolean;
  /**
   * A screen about the booking as a whole (its details, the shop's booking page): a return record is not offered
   * from it until it is begun or the booking is `returned`, so the first tap is on the return screens, at the
   * return, and not on day one of a rental (review app-4 r2, finding 17).
   */
  begunOnly?: boolean;
}

/**
 * Where one side's record stands, and so what every screen offers. The one rule
 * (review round 1, findings 1 and 2): a record can be made and finished for as
 * long as the server takes it, whatever the stage and whichever code has been
 * typed, and a record that is not finished is never out of sight.
 *
 *  - `start`: nothing on this phone, nothing complete on the server, and the
 *    server still takes it. On a closed booking only while money waits on it.
 *  - `continue`: a record was begun here and the person has something left to do
 *    (the walk is unfinished, a file was lost, or the server asked for more).
 *  - `uploading`, `waiting`, `stuck`: finished by the person, not yet on the server.
 *  - `code`: the other person's set is up and waits for the code they read out.
 *  - `none`: the server has it, or it is no longer taken and nothing is held here.
 */
export function recordState(input: RecordInput): RecordState {
  const { draft, moment, booking } = input;
  if (draft?.done) return draft.awaitingCode && !input.onServer ? "code" : "none";
  if (input.onServer) return "none";
  if (draft) {
    if (!draft.sealed) return "continue";
    return draft.error ? (draft.error.retry ? "waiting" : "stuck") : "uploading";
  }
  if (input.forOther || !serverTakes(moment, booking)) return "none";
  if (moment === "handover" && booking.extends) return "none";
  if (input.begunOnly && moment === "return" && booking.stage === "out") return "none";
  // A closed booking was settled without a return record (A-28): none is begun on it, though one begun is carried on.
  // The handover's only while the owner's payout waits for it.
  if (booking.stage === "closed" && (moment === "return" || !input.stake)) return "none";
  return "start";
}

/**
 * Whether this phone may begin the other person's set because their phone
 * failed: the booking still takes a record for the moment, theirs is not on the
 * server, and none was begun here already (that one is carried on from its card).
 */
export function otherSetOffered(
  moment: Moment,
  booking: RecordBooking,
  theirsOnServer: boolean,
  draft: CaptureDraft | null | undefined
): boolean {
  return !theirsOnServer && !draft && booking.stage !== "closed" && serverTakes(moment, booking) && !(moment === "handover" && booking.extends);
}

/** True when a screen should offer the button that opens the capture: to begin the record, or to carry it on. */
export const recordOpens = (state: RecordState) => state === "start" || state === "continue";

/**
 * Whether this phone should let go of a record it holds: the server has the
 * complete one (another phone made it), or the booking shows it is not wanted any
 * more (it ended early, or closed without a return record).
 */
export function shouldRelease(draft: Pick<CaptureDraft, "moment" | "sealed" | "done">, booking: RecordBooking, onServer: boolean): boolean {
  if (onServer || !serverTakes(draft.moment, booking)) return true;
  // The booking has closed (P4-9 keeps the return's door open): a return record the person finished is kept until it is
  // sent, but one begun and never finished is let go of, or its "Continue recording" card and photos would stay for good.
  return draft.moment === "return" && booking.stage === "closed" && !draft.sealed && !draft.done;
}

export interface RecordCardView {
  state: Exclude<RecordState, "none">;
  title: string;
  text: string;
  /** What hangs on it, said plainly: the owner's payout, the rental closing. */
  stake: string | null;
  button: { label: string; action: "open" | "retry" } | null;
  /** The card offers Get help (the desk has to finish this record). */
  help?: boolean;
  progress: UploadProgress | null;
  tone: "info" | "warning";
}

/**
 * One side's record as a card on a booking's screens: its state in words, what
 * waits on it, and the one button that moves it on. Null when there is nothing to
 * show. `role` is whose phone this is; `stage` is the booking's.
 */
export function recordCard(input: {
  state: RecordState;
  moment: Moment;
  role: Side;
  forOther?: boolean;
  otherName: string;
  stage: string;
  draft: CaptureDraft | null | undefined;
  /** The owner's payout really waits on this record (`payoutPending`): the card says so only then. */
  stake?: boolean;
}): RecordCardView | null {
  const { state, moment, role, draft } = input;
  if (state === "none") return null;
  const forOther = Boolean(input.forOther);
  const title = forOther ? `${input.otherName}'s ${moment} record` : `Your ${moment} record`;
  const progress = draft ? uploadProgress(draft) : null;
  const size = draft?.video?.bytes ? ` The video is ${sizeLabel(draft.video.bytes)}.` : "";
  const stake = forOther
    ? null
    : role === "owner" && moment === "handover" && input.stake
      ? "Your payout for this rental waits for it: you are paid once it has uploaded."
      : moment === "return" && input.stage === "returned"
        ? role === "customer"
          ? "Your deposit comes back sooner once both return records are in."
          : "The rental closes once both return records are in."
        : null;
  // The desk has to finish this record (`desk`): no new code, or no more sending of a file the server keeps losing.
  if (draft?.desk && (state === "code" || state === "stuck")) {
    if (draft.desk === "files") {
      return { state, title, text: FILES_KEPT, stake: null, button: null, help: true, progress, tone: "warning" };
    }
    // The last code may still be valid: the box for it stays.
    if (draft.desk === "codes" && state === "code") {
      return { state, title, text: NO_MORE_CODES, stake: null, button: { label: "Type the code", action: "open" }, help: true, progress: null, tone: "warning" };
    }
    return { state, title, text: DESK_FINISHES, stake: null, button: null, help: true, progress: null, tone: "warning" };
  }
  switch (state) {
    case "start":
      return {
        state,
        title,
        text:
          moment === "handover"
            ? "Not recorded yet. Take the photos and the video of the item now."
            : "Not recorded yet. Take the photos and the video of the item as it came back.",
        stake,
        button: { label: "Record its condition", action: "open" },
        progress: null,
        // At the moment itself it is simply the next thing to do; after the code it is overdue.
        tone: input.stage === (moment === "handover" ? "ready" : "out") ? "info" : "warning",
      };
    case "continue": {
      const taken = draft ? files(draft).length : 0;
      const total = draft ? draft.list.shots.length + 1 : 0;
      return {
        state,
        title,
        text: draft?.error?.text ?? `Started, not finished: ${taken} of ${total} taken.`,
        stake,
        button: { label: "Continue recording", action: "open" },
        progress: null,
        tone: "warning",
      };
    }
    case "uploading":
      return {
        state,
        title,
        text: `Uploading. ${progress?.text ?? ""}.${size} It carries on while the app is open.`,
        stake,
        button: null,
        progress,
        tone: "info",
      };
    case "waiting":
      return {
        state,
        title,
        text: `${progress?.text ?? ""}. ${draft?.error?.text ?? OFFLINE}${size}`,
        stake,
        button: { label: "Try again", action: "retry" },
        progress,
        tone: "warning",
      };
    case "stuck":
      return {
        state,
        title,
        text: draft?.error?.text ?? "This record needs you.",
        stake,
        // The other person's set is saved only while a code is out for it, and the capture screen is where a new one is sent:
        // "Try again" here would get the same answer for ever (review app-4 r2, finding 15).
        button: draft?.forOther
          ? { label: `Send ${input.otherName} a new code`, action: "open" }
          : { label: "Try again", action: "retry" },
        progress,
        tone: "warning",
      };
    default:
      return {
        state,
        title,
        text: `It is uploaded. Type the code ${input.otherName} reads out to confirm it.`,
        stake: null,
        button: { label: "Type the code", action: "open" },
        progress: null,
        tone: "warning",
      };
  }
}

// ---- Files that have left a record ---------------------------------------------------------------

/** The local files a change took out of a record (a shot taken again, a list that dropped one, a lost file). */
export function removedUris(before: CaptureDraft, after: CaptureDraft | null): string[] {
  const kept = new Set(after ? localUris(after) : []);
  return localUris(before).filter((uri) => !kept.has(uri));
}

/** The name of a file, without its folder: the part that is the same whatever the app's folder is today. */
export const fileName = (uri: string) => uri.split("?")[0].split("/").pop() ?? "";

/** How old a file nothing names must be before the sweep takes it: a photo just taken is not yet in any list. */
export const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * The files of the app's capture folder that nothing on this phone names any
 * more and that are old enough to be sure of it. `named` holds the names every
 * kept list still holds, for every account.
 */
export function orphanFiles(
  found: readonly { name: string; modifiedMs: number }[],
  named: ReadonlySet<string>,
  nowMs: number,
  minAgeMs: number = ORPHAN_AGE_MS
): string[] {
  return found
    .filter((file) => !named.has(file.name) && Number.isFinite(file.modifiedMs) && nowMs - file.modifiedMs > minAgeMs)
    .map((file) => file.name);
}

/** Every file name held anywhere inside something read back from storage, whatever its shape. */
export function namesIn(value: unknown, folder: string, into: Set<string> = new Set()): Set<string> {
  if (typeof value === "string") {
    if (value.includes(`/${folder}`)) into.add(fileName(value));
  } else if (Array.isArray(value)) {
    for (const item of value) namesIn(item, folder, into);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) namesIn(item, folder, into);
  }
  return into;
}

// ---- The list to shoot from ------------------------------------------------------------------------

/**
 * The general list the app carries, for a capture that has to begin with no
 * connection and no copy of the booking's own list (review round 1, finding 5).
 * It is Renit's generic list (ops draft ENG-216), with the same keys, so the
 * server's own generic list is met; a product whose sub-category has its own list
 * is asked for the rest once the phone is back online.
 */
export function genericShotList(idMatch: boolean): ShotList {
  return {
    shots: [
      { key: "front", label: "Front", hint: "The whole item from the front. Fill the frame with the item, not the room." },
      { key: "back", label: "Back", hint: "The whole item from behind, at the same distance." },
      { key: "left_side", label: "Left side", hint: "The whole left side, edge to edge." },
      { key: "right_side", label: "Right side", hint: "The whole right side, edge to edge." },
      { key: "marks", label: "Marks and wear", hint: "Close-up of every scratch, dent or crack. If there is none, show the most-used part." },
      { key: "label", label: "Label or serial number", hint: "Brand label, model or serial number, sharp enough to read." },
    ],
    video_hint: "If the item switches on, show it working. If not, move slowly around every side.",
    included_items: ["The item itself", "Charger or power cable", "Other cables", "Case, bag or box", "Manual and small parts"],
    included_items_source: "generic",
    id_match_required: idMatch,
  };
}

/** A shot list read back from the phone is used only if it has the shape of one. */
export function isShotList(value: unknown): value is ShotList {
  const list = value as Partial<ShotList> | null;
  return Boolean(
    list &&
      Array.isArray(list.shots) &&
      list.shots.length > 0 &&
      list.shots.every((shot) => shot && typeof shot.key === "string" && typeof shot.label === "string") &&
      Array.isArray(list.included_items)
  );
}

export type ListSource = "server" | "kept" | "generic";

/**
 * Which list a new record starts from: the server's answer; else the copy of it
 * kept on the phone from an earlier read; else, when the read has failed or the
 * person will not wait, the general list. Null while it is still worth waiting.
 * `kept`: undefined until the phone's copy has been looked for, null when there is none.
 */
export function chooseList(input: {
  fetched: ShotList | null | undefined;
  kept: ShotList | null | undefined;
  offline: boolean;
  idMatch: boolean;
}): { list: ShotList; source: ListSource } | null {
  if (input.fetched) return { list: input.fetched, source: "server" };
  if (input.kept) return { list: input.kept, source: "kept" };
  if (input.kept === null && input.offline) return { list: genericShotList(input.idMatch), source: "generic" };
  return null;
}

/** What the notice says about a list that did not come from the server just now. */
export function listSourceNote(source: ListSource): string | null {
  if (source === "kept") return "No connection just now. This is the list for this item as the phone last read it; your photos are sent when you are back online.";
  if (source === "generic") {
    return "No connection, so this is Renit's general list for any item. Shoot it now; your photos are sent when you are back online, and the app asks then if this item needs a shot more.";
  }
  return null;
}

// ---- The words -----------------------------------------------------------------------------

const NUMBER_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

/** "Six photos", "One photo", "14 photos". */
export function photoCount(n: number): string {
  return `${NUMBER_WORDS[n] ?? String(n)} ${n === 1 ? "photo" : "photos"}`;
}

export interface NoticeRow {
  icon: "camera" | "eye" | "clock";
  title: string;
  body: string;
}

/**
 * What both people are told before their first capture (booking plan, "Both
 * people are told first"): what is recorded, who can see it, how long it is kept.
 */
export function noticeRows(list: Pick<ShotList, "shots">, side: Side): NoticeRow[] {
  return [
    {
      icon: "camera",
      title: "What is recorded",
      body: `${photoCount(list.shots.length)} and a ${VIDEO_SECONDS}-second video of the item`,
    },
    {
      icon: "eye",
      title: "Who can see it",
      body: side === "customer" ? "You, the shop and Renit's staff" : "You, the customer and Renit's staff",
    },
    { icon: "clock", title: "How long it is kept", body: "Deleted 90 days after the rental closes" },
  ];
}

export const FRAME_NOTE = "Point the camera at the item, not at people or the room.";
export const CAMERA_ONLY = "Camera only. Photos from your gallery can't be used.";

/** "Photo 4 of 6 · Both controllers". */
export function shotChip(list: Pick<ShotList, "shots">, index: number): string {
  const shot = list.shots[index];
  return shot ? `Photo ${index + 1} of ${list.shots.length} · ${shot.label}` : "";
}

/**
 * The shot lists' `video_hint` texts (ops draft ENG-216) still begin "About 20 seconds", and the limit is 15
 * (decision T-18): the chip under it says "up to 0:15" and a clip of 20 is refused. So the hint is shown with
 * the limit the app enforces, whatever number the list names.
 * ponytail: remove once the lists say 15 themselves; the pattern touches only "about N seconds".
 */
export function videoHintText(hint: string): string {
  return hint.replace(/\b(about|around|roughly)\s+\d+\s*(?:seconds?|secs?)\b/gi, (match) =>
    `${match[0] === match[0].toUpperCase() ? "Up" : "up"} to ${VIDEO_SECONDS} seconds`
  );
}

/**
 * What the picker's `getPendingResultAsync()` gave back, as a list. The installed picker returns one result or null on
 * Android although its type says a list; any of the three is read (review app-4 r2, finding 13).
 */
export function pendingList<T>(value: T | readonly T[] | null | undefined): T[] {
  if (Array.isArray(value)) return [...value] as T[];
  return value ? [value as T] : [];
}

/** A length as the frames write it: "0:20". */
export function durationLabel(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The capture screen's heading: whose record this is, and for which moment. */
export function captureHeading(moment: Moment, forOther: boolean, otherName: string): { header: string; title: string } {
  return {
    header: moment === "handover" ? "Handover" : "Return",
    title: forOther
      ? `Record ${otherName}'s set on this phone`
      : moment === "handover"
        ? "Record its condition"
        : "Record its condition again",
  };
}

// ---- The two sets, side by side (BK-18, SH-10) -------------------------------------------------

export interface Tile {
  key: string;
  label: string;
  /** The photo: its address on the bucket, or the file on this phone while it uploads. Null when not taken. */
  uri: string | null;
}

export interface SetView {
  /** `in`: the server has it all. `partial`: some of it is here. `none`: nothing yet. */
  state: "in" | "partial" | "none";
  shots: Tile[];
  /** `url` is where it plays from once it is on the bucket. */
  video: { taken: boolean; url: string | null; label: string };
}

/**
 * One set as tiles. From the server's capture when there is one; else from the
 * record on this phone (its own photos show at once, before they are up); else
 * the empty tiles of the list.
 */
export function setView(
  capture: Capture | null | undefined,
  draft: CaptureDraft | null | undefined,
  list: Pick<ShotList, "shots"> | null | undefined
): SetView {
  const shots = list?.shots ?? draft?.list.shots ?? capture?.shots ?? [];
  if (capture) {
    return {
      state: capture.complete ? "in" : "partial",
      shots: shots.map((shot) => ({
        key: shot.key,
        label: shot.label,
        uri: capture.shots.find((s) => s.key === shot.key)?.url ?? null,
      })),
      video: { taken: Boolean(capture.video), url: capture.video?.url ?? null, label: "Video" },
    };
  }
  if (draft) {
    return {
      state: Object.keys(draft.shots).length > 0 || draft.video ? "partial" : "none",
      shots: shots.map((shot) => ({ key: shot.key, label: shot.label, uri: draft.shots[shot.key]?.uri ?? null })),
      video: {
        taken: Boolean(draft.video),
        url: draft.video?.url ?? null,
        label: draft.video?.seconds ? `Video · ${durationLabel(draft.video.seconds)}` : "Video",
      },
    };
  }
  return {
    state: "none",
    shots: shots.map((shot) => ({ key: shot.key, label: shot.label, uri: null })),
    video: { taken: false, url: null, label: "Video" },
  };
}

export interface IncludedRow {
  item: string;
  ticked: boolean;
  /** Said when the other person's record has this item unticked. */
  note: string | null;
}

/**
 * "What's included": the items, ticked as this side ticked them. Where the other
 * side left one unticked, the row says so, so a missing cable is seen at the door.
 */
export function includedRows(
  mine: readonly ChecklistItem[] | null | undefined,
  theirs: readonly ChecklistItem[] | null | undefined,
  theirName: string,
  items: readonly string[] = []
): IncludedRow[] {
  const names = items.length > 0 ? items : (mine ?? theirs ?? []).map((c) => c.item);
  return names.map((item) => {
    const own = mine?.find((c) => c.item === item);
    const other = theirs?.find((c) => c.item === item);
    return {
      item,
      ticked: own ? own.ticked : Boolean(other?.ticked),
      note: other && !other.ticked ? `Not ticked by ${theirName}` : null,
    };
  });
}

// ---- When one phone fails (ENG-219) --------------------------------------------------------------

/** What a refused fallback call says. */
export function fallbackErrorText(error: ApiError | null): string {
  if (!error || error.status === 0) return "We couldn't reach Renit. Check your connection and try again.";
  switch (error.code) {
    case "rate_limited":
      return "No more codes can be sent for this booking. Renit's desk has to finish this record: use Get help.";
    case "sms_unavailable":
      return "The code could not be sent just now. Try again in a moment.";
    case "wrong_code": {
      const left = error.details?.tries_left;
      return typeof left === "number"
        ? `That code is not right. ${left} ${left === 1 ? "try" : "tries"} left.`
        : "That code is not right.";
    }
    case "code_expired":
      return "That code has run out. Send a new one.";
    case "storage_unavailable":
      return STORAGE_UNAVAILABLE;
    case "capture_incomplete":
      return missingBeyondCode(error).length > 0
        ? "A file of this record did not upload. Send it again."
        : "Finish recording first. The code confirms the whole record.";
    case "capture_locked":
      return "This record is already complete.";
    case "stage_not_allowed":
      return "This booking has moved on, so this can't be done now.";
    default:
      return error.message ?? "Something went wrong on our side. Try again.";
  }
}
