import type { ApiError } from "@/lib/api-error";

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
  /** Started from the general list the app carries, because the booking's own list could not be read. */
  generic?: boolean;
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
  const next: CaptureDraft = {
    ...draft,
    list,
    shots,
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
 * Anything else still missing goes back to the person: the shots are asked for
 * again, and the draft is open for them.
 */
export function applyAnswer(draft: CaptureDraft, capture: Pick<Capture, "complete" | "missing">): CaptureDraft {
  if (capture.complete) return { ...draft, done: true, awaitingCode: false, error: null };
  const missing = capture.missing ?? [];
  const beyondCode = missing.filter((m) => m !== "confirmation_code");
  if (beyondCode.length === 0 && missing.includes("confirmation_code")) {
    return { ...draft, done: true, awaitingCode: true, error: null };
  }
  let next: CaptureDraft = { ...draft, sealed: false };
  for (const what of beyondCode) {
    if (what === "video") next = { ...next, video: null };
    else if (what === "id_match") next = { ...next, idMatch: false };
    else if (next.shots[what]) next = withFile(next, { shot: what }, null);
  }
  return {
    ...next,
    error: { text: "Renit still needs something for this record. Add what is missing and finish again.", retry: false },
  };
}

/** The other person read out the code and the server took it. */
export const codeConfirmed = (draft: CaptureDraft): CaptureDraft => ({ ...draft, awaitingCode: false });

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
  error: ApiError | null
): { done: true } | { error: NonNullable<CaptureDraft["error"]>; refused?: true } {
  if (error?.code === "capture_locked") return { done: true };
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
      return { error: { text: "This record can't be saved from this phone right now.", retry: false } };
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

/** Every local file of a draft, to clear away once the server has them. */
export const localUris = (draft: CaptureDraft) => files(draft).map(({ file }) => file.uri);

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
 * OE-I, `PUT …/captures/{moment}/{side}/`; A-3, A2-3). A capture stays writable
 * after the code is typed: the handover's through `out`, `returned` and `closed`
 * (the owner's payout waits for it), the return's through `returned`. After
 * `closed` a missing return record has been settled without (decision A-28).
 */
const TAKEN_IN: Record<Moment, readonly string[]> = {
  handover: ["ready", "out", "returned", "closed"],
  return: ["out", "returned"],
};

/** What the rule needs of a booking, either side's. */
export interface RecordBooking {
  stage: string;
  exit: string;
  can: readonly string[];
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
  if (booking.stage === "closed" && !input.stake) return "none";
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
  return !theirsOnServer && !draft && booking.stage !== "closed" && serverTakes(moment, booking);
}

/** True when a screen should offer the button that opens the capture: to begin the record, or to carry it on. */
export const recordOpens = (state: RecordState) => state === "start" || state === "continue";

/**
 * Whether this phone should let go of a record it holds: the server has the
 * complete one (another phone made it), or the booking shows it is not wanted any
 * more (it ended early, or closed without a return record).
 */
export function shouldRelease(draft: Pick<CaptureDraft, "moment">, booking: RecordBooking, onServer: boolean): boolean {
  return onServer || !serverTakes(draft.moment, booking);
}

export interface RecordCardView {
  state: Exclude<RecordState, "none">;
  title: string;
  text: string;
  /** What hangs on it, said plainly: the owner's payout, the rental closing. */
  stake: string | null;
  button: { label: string; action: "open" | "retry" } | null;
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
}): RecordCardView | null {
  const { state, moment, role, draft } = input;
  if (state === "none") return null;
  const forOther = Boolean(input.forOther);
  const title = forOther ? `${input.otherName}'s ${moment} record` : `Your ${moment} record`;
  const progress = draft ? uploadProgress(draft) : null;
  const size = draft?.video?.bytes ? ` The video is ${sizeLabel(draft.video.bytes)}.` : "";
  const stake = forOther
    ? null
    : role === "owner" && moment === "handover" && input.stage !== "ready"
      ? "Your payout for this rental waits for it: you are paid once it has uploaded."
      : moment === "return" && input.stage === "returned"
        ? role === "customer"
          ? "Your deposit comes back sooner once both return records are in."
          : "The rental closes once both return records are in."
        : null;
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
        button: { label: "Try again", action: "retry" },
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
      return "No more codes can be sent for this booking. Renit's desk can finish it by phone.";
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
    case "stage_not_allowed":
      return "This booking has moved on, so this can't be done now.";
    default:
      return error.message ?? "Something went wrong on our side. Try again.";
  }
}
