import { describe, expect, it } from "@jest/globals";
import type { ApiError } from "../api-error";
import {
  Capture,
  CaptureDraft,
  RecordBooking,
  ShotList,
  PHOTO_MAX_BYTES,
  VIDEO_MAX_BYTES,
  addShot,
  applyAnswer,
  canSeal,
  captureBody,
  captureHeading,
  captureId,
  chooseList,
  draftState,
  draftsToKeep,
  dropFile,
  durationLabel,
  fallbackErrorText,
  fileName,
  files,
  genericShotList,
  localUris,
  includedRows,
  isShotList,
  listSourceNote,
  namesIn,
  needsIdMatch,
  nextStep,
  nextWork,
  noticeRows,
  orphanFiles,
  otherSetOffered,
  otherSide,
  overPhotoLimit,
  photoCount,
  readyToSend,
  recordCard,
  recordOpens,
  recordState,
  recordWanted,
  recoverShot,
  removedUris,
  seal,
  sendFailure,
  serverTakes,
  setIdMatch,
  setUrl,
  setVideo,
  setView,
  shotChip,
  shouldRelease,
  sizeLabel,
  staleRefusal,
  startDraft,
  tick,
  uploadProgress,
  videoLabel,
  videoProblem,
  withList,
  confirmFailure,
  pendingList,
  reopenForMissing,
  reopenedText,
  markNoMoreCodes,
  markCodeDead,
  needsDesk,
  DESK_FINISHES,
  NO_MORE_CODES,
  FILES_KEPT,
  MAX_LOST,
  videoHintText,
  withShooting,
} from "../capture";

/** The contract's example list: a PS5. */
const list = (over: Partial<ShotList> = {}): ShotList => ({
  shots: [
    { key: "front", label: "Front", hint: "The whole console, lights on" },
    { key: "back", label: "Back", hint: "" },
    { key: "serial", label: "Serial number", hint: "The sticker underneath" },
  ],
  video_hint: "About 20 seconds with the console switched on",
  included_items: ["Power cable", "HDMI cable"],
  included_items_source: "category",
  id_match_required: false,
  ...over,
});

const start = (over: Partial<Parameters<typeof startDraft>[0]> = {}) =>
  startDraft({ number: "RN-24831", moment: "handover", side: "customer", list: list(), ...over });

const file = (name: string) => ({ uri: `file:///captures/${name}`, taken_at: "2026-10-24T04:41:00Z", lat: 19.1364, long: 72.8296 });

/** Every shot and the video taken. */
function taken(draft: CaptureDraft = start()): CaptureDraft {
  let d = draft;
  for (const shot of d.list.shots) d = addShot(d, shot.key, file(`${shot.key}.jpg`));
  return setVideo(d, { uri: "file:///captures/video.mp4", taken_at: "2026-10-24T04:43:00Z", seconds: 18 });
}

/** Every file on the bucket. */
function uploaded(draft: CaptureDraft): CaptureDraft {
  let d = draft;
  for (const { slot, file: f } of files(d)) d = setUrl(d, slot, f.uri, `https://bucket.test/uploads/${f.uri.split("/").pop()}`);
  return d;
}

const err = (code: string | null, status = 409, details: Record<string, unknown> | null = null): ApiError => ({
  status,
  code,
  message: null,
  details,
});

describe("the walk", () => {
  it("asks for each shot in the list's order, then the video, then the ticks, then only waits", () => {
    let d = start();
    expect(nextStep(d)).toEqual({ kind: "shot", index: 0 });
    d = addShot(d, "front", file("front.jpg"));
    expect(nextStep(d)).toEqual({ kind: "shot", index: 1 });
    d = addShot(addShot(d, "back", file("back.jpg")), "serial", file("serial.jpg"));
    expect(nextStep(d)).toEqual({ kind: "video" });
    d = setVideo(d, { uri: "file:///captures/v.mp4", taken_at: "2026-10-24T04:43:00Z" });
    expect(nextStep(d)).toEqual({ kind: "checklist" });
    expect(nextStep(seal(d))).toEqual({ kind: "upload" });
  });

  it("starts with every included item unticked, and a tick toggles", () => {
    const d = start();
    expect(d.checklist).toEqual([
      { item: "Power cable", ticked: false },
      { item: "HDMI cable", ticked: false },
    ]);
    const ticked = tick(d, "HDMI cable");
    expect(ticked.checklist[1]).toEqual({ item: "HDMI cable", ticked: true });
    expect(tick(ticked, "HDMI cable").checklist[1].ticked).toBe(false);
  });

  it("a shot taken again replaces the first and must go up again", () => {
    const first = uploaded(addShot(start(), "front", file("front.jpg")));
    expect(first.shots.front.url).toMatch(/front\.jpg$/);
    const again = addShot(first, "front", file("front-2.jpg"));
    expect(again.shots.front).toMatchObject({ uri: "file:///captures/front-2.jpg", url: null });
  });

  it("cannot be finished before every shot and the video are taken", () => {
    const d = addShot(start(), "front", file("front.jpg"));
    expect(canSeal(d)).toBe(false);
    expect(seal(d).sealed).toBe(false);
    expect(seal(taken()).sealed).toBe(true);
  });

  it("asks the owner for the ID tick at the handover only when the server says so", () => {
    const asked = list({ id_match_required: true });
    expect(needsIdMatch(start({ side: "owner", list: asked }))).toBe(true);
    expect(needsIdMatch(start({ side: "customer", list: asked }))).toBe(false);
    expect(needsIdMatch(start({ side: "owner", moment: "return", list: asked }))).toBe(false);
    expect(needsIdMatch(start({ side: "owner" }))).toBe(false);

    const owner = taken(start({ side: "owner", list: asked }));
    expect(canSeal(owner)).toBe(false);
    expect(canSeal(setIdMatch(owner, true))).toBe(true);
  });

  it("one record for each booking, moment and side", () => {
    expect(captureId("RN-24831", "return", "owner")).toBe("RN-24831:return:owner");
    expect(start().id).toBe("RN-24831:handover:customer");
    expect(otherSide("owner")).toBe("customer");
    expect(otherSide("customer")).toBe("owner");
  });
});

describe("a list that changed on the server", () => {
  it("keeps the photos of shots still asked for, and the ticks", () => {
    const d = seal(tick(taken(), "Power cable"));
    const next = withList(
      d,
      list({
        shots: [
          { key: "front", label: "Front", hint: "" },
          { key: "ports", label: "Ports", hint: "" },
        ],
        included_items: ["Power cable", "2 controllers"],
      })
    );
    expect(Object.keys(next.shots)).toEqual(["front"]);
    expect(next.checklist).toEqual([
      { item: "Power cable", ticked: true },
      { item: "2 controllers", ticked: false },
    ]);
    // A new shot is asked for, so the record is open again.
    expect(next.sealed).toBe(false);
    expect(nextStep(next)).toEqual({ kind: "shot", index: 1 });
  });

  it("is left alone when nothing that matters changed", () => {
    const d = seal(taken());
    expect(withList(d, list({ video_hint: "Another hint" }))).toBe(d);
  });
});

describe("what goes up, and in which order", () => {
  it("uploads the files in the order of the list, the video last, then sends", () => {
    let d = seal(taken());
    const order: string[] = [];
    for (let work = nextWork([d]); work && work.kind === "upload"; work = nextWork([d])) {
      order.push(work.slot === "video" ? "video" : work.slot.shot);
      d = setUrl(d, work.slot, work.file.uri, "https://bucket.test/x");
    }
    expect(order).toEqual(["front", "back", "serial", "video"]);
    expect(nextWork([d])).toEqual({ kind: "send", draft: d });
  });

  it("photos go first across every record, so none waits behind another record's video (review r1 #4)", () => {
    let a = seal(taken());
    let b = seal(taken(start({ moment: "return" })));
    const order: string[] = [];
    for (let work = nextWork([a, b]); work; work = nextWork([a, b])) {
      const which = work.draft.id === a.id ? "a" : "b";
      if (work.kind === "send") {
        order.push(`${which}:send`);
        if (which === "a") a = { ...a, done: true };
        else b = { ...b, done: true };
        continue;
      }
      order.push(`${which}:${work.slot === "video" ? "video" : work.slot.shot}`);
      if (which === "a") a = setUrl(a, work.slot, work.file.uri, "https://bucket.test/x");
      else b = setUrl(b, work.slot, work.file.uri, "https://bucket.test/x");
    }
    expect(order).toEqual([
      "a:front",
      "a:back",
      "a:serial",
      "b:front",
      "b:back",
      "b:serial",
      "a:video",
      "a:send",
      "b:video",
      "b:send",
    ]);
  });

  it("uploads before the person has finished, but sends only once they have", () => {
    const d = uploaded(taken());
    expect(readyToSend(d)).toBe(false);
    expect(nextWork([d])).toBeNull();
    expect(readyToSend(seal(d))).toBe(true);
  });

  it("skips a record that just failed and a finished one", () => {
    const a = seal(taken());
    const b = seal(taken(start({ moment: "return" })));
    expect(nextWork([{ ...a, done: true }, b])?.draft.id).toBe(b.id);
    expect(nextWork([a, b], new Set([a.id]))?.draft.id).toBe(b.id);
  });

  it("does not send again by itself what only a person can fix", () => {
    const d = { ...seal(uploaded(taken())), error: { text: "This record can't be saved from this phone right now.", retry: false } };
    expect(nextWork([d])).toBeNull();
    expect(nextWork([{ ...d, error: { text: "Waiting", retry: true } }])?.kind).toBe("send");
  });

  it("the address is written only to the file that went up", () => {
    const d = addShot(start(), "front", file("front.jpg"));
    const again = addShot(d, "front", file("front-2.jpg"));
    // The first photo finishes uploading after it was replaced.
    expect(setUrl(again, { shot: "front" }, "file:///captures/front.jpg", "https://bucket.test/front.jpg")).toBe(again);
  });

  it("a file that is gone has to be taken again", () => {
    const d = seal(taken());
    const dropped = dropFile(d, { shot: "back" }, "file:///captures/back.jpg");
    expect(dropped.shots.back).toBeUndefined();
    expect(dropped.sealed).toBe(false);
    expect(dropped.error).toEqual({ text: "A photo was lost before it could upload. Take it again.", retry: false });
    expect(nextStep(dropped)).toEqual({ kind: "shot", index: 1 });
    expect(dropFile(d, "video", "file:///captures/video.mp4").error?.text).toMatch(/video was lost/);
    // Not the file the slot holds now: nothing changes.
    expect(dropFile(d, { shot: "back" }, "file:///captures/old.jpg")).toBe(d);
  });
});

describe("the body of the PUT", () => {
  it("carries every uploaded shot with its time and place, the video, and the ticks", () => {
    const d = uploaded(tick(taken(), "Power cable"));
    expect(captureBody(d)).toEqual({
      shots: [
        { key: "front", url: "https://bucket.test/uploads/front.jpg", taken_at: "2026-10-24T04:41:00Z", lat: 19.1364, long: 72.8296 },
        { key: "back", url: "https://bucket.test/uploads/back.jpg", taken_at: "2026-10-24T04:41:00Z", lat: 19.1364, long: 72.8296 },
        { key: "serial", url: "https://bucket.test/uploads/serial.jpg", taken_at: "2026-10-24T04:41:00Z", lat: 19.1364, long: 72.8296 },
      ],
      video: { url: "https://bucket.test/uploads/video.mp4", taken_at: "2026-10-24T04:43:00Z" },
      checklist: [
        { item: "Power cable", ticked: true },
        { item: "HDMI cable", ticked: false },
      ],
    });
  });

  it("leaves the place out when the phone gave none, and never sends a file that is not up", () => {
    let d = addShot(start(), "front", { uri: "file:///captures/front.jpg", taken_at: "2026-10-24T04:41:00Z" });
    expect(captureBody(d).shots).toEqual([]);
    d = uploaded(d);
    expect(captureBody(d).shots).toEqual([
      { key: "front", url: "https://bucket.test/uploads/front.jpg", taken_at: "2026-10-24T04:41:00Z" },
    ]);
    expect(captureBody(d).video).toBeUndefined();
  });

  it("sends the ID tick only where it is asked for", () => {
    const owner = setIdMatch(taken(start({ side: "owner", list: list({ id_match_required: true }) })), true);
    expect(captureBody(owner).id_match_ticked).toBe(true);
    expect("id_match_ticked" in captureBody(taken())).toBe(false);
  });
});

describe("the server's answer", () => {
  const answer = (over: Partial<Capture>): Pick<Capture, "complete" | "missing"> => ({ complete: false, missing: [], ...over });

  it("complete: done", () => {
    const d = applyAnswer(seal(uploaded(taken())), answer({ complete: true }));
    expect(d.done).toBe(true);
    expect(draftState(d)).toBe("done");
  });

  it("a file the server lists as missing, and the phone still holds, is sent again from the kept copy: sealed, address cleared", () => {
    const d = applyAnswer(seal(uploaded(taken())), answer({ missing: ["serial", "video"] }));
    expect(d.done).toBe(false);
    expect(d.sealed).toBe(true);
    expect(d.error).toBeNull();
    // The local copy is still there, with no address: nothing is taken again.
    expect(d.shots.serial).toMatchObject({ uri: "file:///captures/serial.jpg", url: null });
    expect(d.video).toMatchObject({ uri: "file:///captures/video.mp4", url: null });
    expect(d.shots.front?.url).toBeTruthy();
    expect(draftState(d)).toBe("uploading");
    expect(readyToSend(d)).toBe(false);
    // The queue's next job is that upload, then the send.
    expect(nextWork([d])).toMatchObject({ kind: "upload", slot: { shot: "serial" } });
    expect(localUris(d)).toEqual(expect.arrayContaining(["file:///captures/serial.jpg", "file:///captures/video.mp4"]));
  });

  it("a file the phone no longer holds, or the ID tick, goes back to the person", () => {
    const sealed = seal(uploaded(taken(start({ side: "owner", list: list({ id_match_required: true }) }))));
    const gone = applyAnswer(sealed, answer({ missing: ["window"] }));
    expect(gone).toMatchObject({ sealed: false, done: false });
    expect(gone.error).toMatchObject({ retry: false });
    expect(draftState(gone)).toBe("stuck");
    const noTick = applyAnswer(sealed, answer({ missing: ["id_match"] }));
    expect(noTick).toMatchObject({ sealed: false, idMatch: false });
    expect(nextStep(noTick)).toEqual({ kind: "checklist" });
  });

  it("not complete with nothing named is not sent again by itself", () => {
    const d = applyAnswer(seal(uploaded(taken())), answer({ missing: [] }));
    expect(d).toMatchObject({ sealed: false, done: false });
    expect(d.error).toMatchObject({ retry: false });
  });

  it("a photo over the server's limit is made smaller first; one at the limit or of unknown size is sent as it is", () => {
    expect(overPhotoLimit(PHOTO_MAX_BYTES + 1)).toBe(true);
    expect(overPhotoLimit(PHOTO_MAX_BYTES)).toBe(false);
    expect(overPhotoLimit(null)).toBe(false);
    expect(overPhotoLimit(undefined)).toBe(false);
  });

  it("the other person's set is up when only their code is missing", () => {
    const d = applyAnswer(seal(uploaded(taken(start({ forOther: true })))), answer({ missing: ["confirmation_code"] }));
    expect(d).toMatchObject({ done: true, awaitingCode: true });
    expect(draftState(d)).toBe("code");
    // Kept on the phone until the code is typed.
    expect(draftsToKeep([d])).toEqual([d]);
    expect(draftsToKeep([{ ...d, awaitingCode: false }])).toEqual([]);
  });

  it("a refused send: locked means the server already has it; no answer is tried again; the rest needs a person", () => {
    expect(sendFailure(err("capture_locked"))).toEqual({ done: true });
    expect(sendFailure(null)).toMatchObject({ error: { retry: true } });
    expect(sendFailure(err(null, 0))).toMatchObject({ error: { retry: true } });
    expect(sendFailure(err(null, 503))).toMatchObject({ error: { retry: true } });
    expect(sendFailure(err("rate_limited", 429))).toMatchObject({ error: { retry: true } });
    expect(sendFailure(err("forbidden", 403))).toMatchObject({ error: { retry: false } });
    expect(sendFailure(err("validation_error", 400))).toMatchObject({ error: { retry: false } });
  });

  it("a 401 is the token running out on a bad connection, not a verdict: tried again by itself (review r1 #7)", () => {
    expect(sendFailure(err("not_authenticated", 401))).toEqual({
      error: { text: "Waiting for a connection. It uploads by itself when you are back online.", retry: true },
    });
    expect(sendFailure(err(null, 401))).toMatchObject({ error: { retry: true } });
    expect(sendFailure(err(null, 408))).toMatchObject({ error: { retry: true } });
  });

  it("a record the server says it does not take is stopped and kept, never deleted on that one answer (review r1 #6)", () => {
    for (const refused of [err("stage_not_allowed"), err("not_found", 404)]) {
      const out = sendFailure(refused);
      expect(out).toMatchObject({ refused: true, error: { retry: false } });
      expect("done" in out).toBe(false);
    }
    // Kept for a week from the first refusal, then let go of.
    const at = Date.parse("2026-10-24T05:00:00Z");
    expect(staleRefusal({ refusedAt: "2026-10-24T05:00:00Z" }, at + 6 * 24 * 3600_000)).toBe(false);
    expect(staleRefusal({ refusedAt: "2026-10-24T05:00:00Z" }, at + 8 * 24 * 3600_000)).toBe(true);
    expect(staleRefusal({ refusedAt: null }, at + 365 * 24 * 3600_000)).toBe(false);
    expect(staleRefusal({}, at)).toBe(false);
  });
});

describe("what the screens say", () => {
  it("how far the upload is", () => {
    let d = seal(taken());
    expect(uploadProgress(d)).toMatchObject({ uploaded: 0, total: 4, text: "0 of 4 uploaded", fraction: 0 });
    d = setUrl(d, { shot: "front" }, "file:///captures/front.jpg", "https://bucket.test/front.jpg");
    expect(uploadProgress(d)).toMatchObject({ uploaded: 1, text: "1 of 4 uploaded", fraction: 0.25 });
    expect(uploadProgress({ ...d, done: true })).toMatchObject({ uploaded: 4, text: "All uploaded", fraction: 1 });
  });

  it("a record waiting for a connection is in the waiting state", () => {
    const waiting = { ...seal(taken()), error: { text: "Waiting for a connection.", retry: true } };
    expect(draftState(waiting)).toBe("waiting");
    expect(draftState(seal(taken()))).toBe("uploading");
    expect(draftState(taken())).toBe("recording");
  });

  it("the notice: what is recorded, who can see it, how long it is kept", () => {
    const six = { shots: Array.from({ length: 6 }, (_, i) => ({ key: `k${i}`, label: `L${i}`, hint: "" })) };
    expect(noticeRows(six, "customer").map((r) => r.body)).toEqual([
      "Six photos and a 15-second video of the item",
      "You, the shop and Renit's staff",
      "Deleted 90 days after the rental closes",
    ]);
    expect(noticeRows(six, "owner")[1].body).toBe("You, the customer and Renit's staff");
    expect(photoCount(1)).toBe("One photo");
    expect(photoCount(14)).toBe("14 photos");
  });

  it("the chip, the length and the headings", () => {
    expect(shotChip(list(), 2)).toBe("Photo 3 of 3 · Serial number");
    expect(shotChip(list(), 9)).toBe("");
    expect(durationLabel(15)).toBe("0:15");
    expect(durationLabel(75)).toBe("1:15");
    expect(durationLabel(undefined)).toBe("0:00");
    expect(captureHeading("handover", false, "the shop")).toEqual({ header: "Handover", title: "Record its condition" });
    expect(captureHeading("return", false, "the shop").title).toBe("Record its condition again");
    expect(captureHeading("return", true, "Aarav")).toEqual({ header: "Return", title: "Record Aarav's set on this phone" });
  });

  it("what a refused fallback call says", () => {
    expect(fallbackErrorText(err("wrong_code", 409, { tries_left: 2 }))).toBe("That code is not right. 2 tries left.");
    expect(fallbackErrorText(err("wrong_code", 409, { tries_left: 1 }))).toBe("That code is not right. 1 try left.");
    expect(fallbackErrorText(err("code_expired"))).toMatch(/run out/);
    expect(fallbackErrorText(err("rate_limited", 429))).toMatch(/desk/);
    expect(fallbackErrorText(err("sms_unavailable", 503))).toMatch(/could not be sent/);
    expect(fallbackErrorText(null)).toMatch(/connection/);
  });
});

describe("when a record can be made and finished (review r1 #1, #2): one rule for every screen", () => {
  const at = (stage: string, over: Partial<RecordBooking> = {}): RecordBooking => ({ stage, exit: "", can: [], ...over });
  const state = (moment: "handover" | "return", booking: RecordBooking, over: Partial<Parameters<typeof recordState>[0]> = {}) =>
    recordState({ moment, booking, onServer: false, draft: null, ...over });

  it("the server takes a handover record from ready to closed, and a return record while out, returned or closed (P4-9)", () => {
    for (const stage of ["ready", "out", "returned", "closed"]) expect(recordWanted("handover", at(stage))).toBe(true);
    for (const stage of ["ringing", "accepted", "confirmed"]) expect(recordWanted("handover", at(stage))).toBe(false);
    for (const stage of ["out", "returned"]) expect(recordWanted("return", at(stage))).toBe(true);
    for (const stage of ["ready", "confirmed"]) expect(recordWanted("return", at(stage))).toBe(false);
    expect(recordWanted("return", at("closed"))).toBe(true);
    // A booking that ended early has nothing to record.
    expect(recordWanted("handover", at("ready", { exit: "no_show" }))).toBe(false);
    // The server's own list also says so.
    expect(serverTakes("return", at("closed", { can: ["capture_return"] }))).toBe(true);
    expect(serverTakes("return", at("closed"))).toBe(true);
  });

  it("the record can be begun after the code is typed: the handover's while out, the return's while returned", () => {
    // The shop typed the customer's code before recording: the booking is `out` and the button is still there.
    expect(state("handover", at("out"))).toBe("start");
    expect(state("handover", at("returned"))).toBe("start");
    // The customer typed the shop's code before recording the return.
    expect(state("return", at("returned"))).toBe("start");
    expect(state("return", at("out"))).toBe("start");
    expect(state("handover", at("ready"))).toBe("start");
    expect(recordOpens(state("handover", at("out")))).toBe(true);
  });

  it("is not offered before its time, after an early ending, or once the server has it", () => {
    expect(state("handover", at("confirmed"))).toBe("none");
    expect(state("return", at("ready"))).toBe("none");
    expect(state("handover", at("ready", { exit: "cancelled_by_owner" }))).toBe("none");
    expect(state("handover", at("out"), { onServer: true })).toBe("none");
  });

  it("on a closed booking a new record is asked for only while money waits on it: the owner's payout", () => {
    expect(state("handover", at("closed"))).toBe("none");
    expect(state("handover", at("closed"), { stake: true })).toBe("start");
    // The server takes a return record through `closed` (P4-9), but none is begun on a closed booking, money or not (A-28).
    expect(state("return", at("closed"), { stake: true })).toBe("none");
    expect(state("return", at("closed"))).toBe("none");
    // One begun before it closed is carried on and sent.
    expect(state("return", at("closed"), { draft: addShot(start({ moment: "return" }), "front", file("front.jpg")) })).toBe("continue");
  });

  it("a record begun here can always be carried on, whatever the stage", () => {
    const walking = addShot(start(), "front", file("front.jpg"));
    for (const stage of ["ready", "out", "returned", "closed"]) {
      expect(state("handover", at(stage), { draft: walking })).toBe("continue");
    }
    // Finished by the person, then a photo was lost or the server asked for more: open again, after the code too.
    const reopened = dropFile(seal(taken()), { shot: "back" }, "file:///captures/back.jpg");
    expect(state("handover", at("out"), { draft: reopened })).toBe("continue");
    // A file the phone does not hold is asked for from the person (one it holds is sent again by itself).
    const asked = applyAnswer(seal(uploaded(taken())), { complete: false, missing: ["window"] });
    expect(state("handover", at("returned"), { draft: asked })).toBe("continue");
  });

  it("a finished record that is not on the server yet shows as uploading, waiting or stuck", () => {
    const sealed = seal(taken());
    expect(state("handover", at("out"), { draft: sealed })).toBe("uploading");
    expect(state("handover", at("out"), { draft: { ...sealed, error: { text: "Waiting", retry: true } } })).toBe("waiting");
    expect(state("handover", at("out"), { draft: { ...sealed, error: { text: "Refused", retry: false } } })).toBe("stuck");
    expect(state("handover", at("out"), { draft: { ...sealed, done: true } })).toBe("none");
  });

  it("the other person's set is never begun from a card, but is carried on and waits for its code", () => {
    expect(state("handover", at("ready"), { forOther: true })).toBe("none");
    const theirs = taken(start({ side: "owner", forOther: true }));
    expect(state("handover", at("out"), { forOther: true, draft: theirs })).toBe("continue");
    const up = { ...seal(uploaded(theirs)), done: true, awaitingCode: true };
    // The code can still be typed after the handover code went in.
    expect(state("handover", at("out"), { forOther: true, draft: up })).toBe("code");
    expect(state("handover", at("out"), { forOther: true, draft: up, onServer: true })).toBe("none");
  });

  it("the other person's set may be begun here while the booking takes a record and theirs is not in", () => {
    expect(otherSetOffered("handover", at("ready"), false, null)).toBe(true);
    // After the code too: their phone may have died before they finished.
    expect(otherSetOffered("handover", at("out"), false, null)).toBe(true);
    expect(otherSetOffered("return", at("returned"), false, null)).toBe(true);
    expect(otherSetOffered("handover", at("out"), true, null)).toBe(false);
    expect(otherSetOffered("handover", at("out"), false, start({ side: "owner", forOther: true }))).toBe(false);
    expect(otherSetOffered("return", at("closed"), false, null)).toBe(false);
    expect(otherSetOffered("handover", at("closed"), false, null)).toBe(false);
  });

  it("a record on the phone is let go of only when the server has it or the booking shows it is not wanted", () => {
    const d = start({ moment: "return" });
    expect(shouldRelease(d, at("returned"), false)).toBe(false);
    expect(shouldRelease(d, at("returned"), true)).toBe(true);
    // The booking closed while it was still uploading: it is sent, not let go of (P4-9).
    const uploading = seal(taken(start({ moment: "return" })));
    expect(shouldRelease(uploading, at("closed"), false)).toBe(false);
    // One begun and never finished is let go of on a closed booking (review app-5 r2 #9), but not while the booking is open.
    expect(shouldRelease(d, at("closed"), false)).toBe(true);
    expect(shouldRelease(d, at("returned"), false)).toBe(false);
    // A finished record that has been sent and is waiting only for its code is not touched.
    expect(shouldRelease({ ...uploading, done: true }, at("closed"), false)).toBe(false);
    // The handover's unfinished record is not let go of: the owner's payout waits for it.
    expect(shouldRelease(addShot(start(), "front", file("front.jpg")), at("closed"), false)).toBe(false);
    // A handover record is still taken on a closed booking.
    expect(shouldRelease(start(), at("closed"), false)).toBe(false);
    // The booking ended before a handover: nothing to record.
    expect(shouldRelease(start(), at("ready", { exit: "no_show" }), false)).toBe(true);
  });
});

describe("the record's card", () => {
  const card = (over: Partial<Parameters<typeof recordCard>[0]>) =>
    recordCard({ state: "start", moment: "handover", role: "owner", otherName: "Aarav", stage: "out", draft: null, ...over });

  it("tells the owner plainly that the payout waits for the handover record, only while it really does", () => {
    const view = card({ stake: true });
    expect(view).toMatchObject({
      title: "Your handover record",
      text: "Not recorded yet. Take the photos and the video of the item now.",
      stake: "Your payout for this rental waits for it: you are paid once it has uploaded.",
      button: { label: "Record its condition", action: "open" },
      tone: "warning",
    });
    // Before the code there is no payout to wait for, and recording is simply the next step.
    expect(card({ stage: "ready" })).toMatchObject({ stake: null, tone: "info" });
    // The customer's handover record has no payout on it.
    expect(card({ role: "customer", stake: true })?.stake).toBeNull();
    // Staff paid by hand (no stake), or an extension (its payout waits for no capture): the line is not written from the stage.
    expect(card({ stake: false })?.stake).toBeNull();
    expect(card({})?.stake).toBeNull();
  });

  it("says what waits on a return record after the code", () => {
    expect(card({ moment: "return", stage: "returned", role: "customer" })?.stake).toBe(
      "Your deposit comes back sooner once both return records are in."
    );
    expect(card({ moment: "return", stage: "returned" })?.stake).toBe("The rental closes once both return records are in.");
    expect(card({ moment: "return", stage: "out" })).toMatchObject({ stake: null, tone: "info" });
  });

  it("no more codes can be sent: the box for the last code stays, with Get help; once it is spent, only the desk is left", () => {
    const theirs = { ...seal(uploaded(taken(start({ side: "owner", forOther: true })))), done: true, awaitingCode: true };
    expect(card({ state: "code", forOther: true, draft: theirs })).toMatchObject({
      text: "It is uploaded. Type the code Aarav reads out to confirm it.",
      button: { label: "Type the code" },
    });
    const noMore = markNoMoreCodes(theirs);
    expect(noMore.desk).toBe("codes");
    expect(needsDesk(noMore)).toBe(true);
    // The last code sent may still be valid: the person can still type it, and Get help is beside it.
    expect(card({ state: "code", forOther: true, draft: noMore })).toMatchObject({ text: NO_MORE_CODES, button: { label: "Type the code" }, help: true });
    // Spent or run out: no box, no new code, the desk.
    const dead = markCodeDead(noMore);
    expect(dead.desk).toBe("dead");
    expect(card({ state: "code", forOther: true, draft: dead })).toMatchObject({ text: DESK_FINISHES, button: null, help: true });
    // A code spent before the limit was known marks nothing.
    expect(markCodeDead(theirs)).toBe(theirs);
    expect(markNoMoreCodes(dead)).toBe(dead);
    // The same after a send the server refused because the code had run out.
    const refused = markCodeDead(markNoMoreCodes({ ...theirs, done: false, awaitingCode: false, error: { text: "x", retry: false } }));
    expect(card({ state: "stuck", forOther: true, draft: refused })).toMatchObject({ text: DESK_FINISHES, button: null, help: true });
    // Stuck with no more codes (the last one may not be spent yet): the desk panel and Get help, as before.
    const stuckNoMore = markNoMoreCodes({ ...theirs, done: false, awaitingCode: false, error: { text: "x", retry: false } });
    expect(card({ state: "stuck", forOther: true, draft: stuckNoMore })).toMatchObject({ text: DESK_FINISHES, button: null, help: true });
    // A record that never waited for a code has nothing to run out.
    expect(card({ state: "stuck", draft: { ...start(), error: { text: "x", retry: false } } })?.help).toBeUndefined();
    expect(fallbackErrorText(err("rate_limited", 429))).toMatch(/desk has to finish/);
  });

  it("the server keeps taking the same file out: counted, and after a few the phone stops, keeps the files and says so with Get help", () => {
    let d = seal(uploaded(taken()));
    for (let round = 1; round < MAX_LOST; round += 1) {
      d = applyAnswer(d, { complete: false, missing: ["back"] });
      expect(d.lost).toBe(round);
      expect(d.desk).toBeUndefined();
      // Sent again: the address is cleared, the file stays, the record stays sealed.
      expect(d.shots.back).toMatchObject({ uri: "file:///captures/back.jpg", url: null });
      expect(d.sealed).toBe(true);
      d = setUrl(d, { shot: "back" }, "file:///captures/back.jpg", "https://bucket.test/uploads/back.jpg");
    }
    // The last time it is the same: stopped. Addresses as they were, nothing to upload, nothing sent by itself.
    const stopped = applyAnswer(d, { complete: false, missing: ["back"] });
    expect(stopped).toMatchObject({ desk: "files", lost: MAX_LOST, sealed: true, done: false, error: { text: FILES_KEPT, retry: false } });
    expect(stopped.shots.back.url).toBe("https://bucket.test/uploads/back.jpg");
    expect(nextWork([stopped])).toBeNull();
    expect(localUris(stopped)).toContain("file:///captures/back.jpg");
    expect(card({ state: "stuck", draft: stopped })).toMatchObject({ text: FILES_KEPT, button: null, help: true });
    // The stop is lifted when a send is taken: complete, or with only the code missing. The count starts over.
    expect(applyAnswer(stopped, { complete: true, missing: [] })).toMatchObject({ done: true, awaitingCode: false });
    expect(applyAnswer(stopped, { complete: true, missing: [] }).desk).toBeUndefined();
    expect(applyAnswer(stopped, { complete: true, missing: [] }).lost).toBeUndefined();
    const codeOnly = applyAnswer({ ...stopped, forOther: true }, { complete: false, missing: ["confirmation_code"] });
    expect(codeOnly).toMatchObject({ done: true, awaitingCode: true });
    expect(codeOnly.desk).toBeUndefined();
    expect(card({ state: "code", forOther: true, draft: codeOnly })).toMatchObject({ button: { label: "Type the code" } });
    // The marks about the codes are not the stop's: they stay.
    expect(applyAnswer({ ...stopped, desk: "codes", forOther: true }, { complete: false, missing: ["confirmation_code"] }).desk).toBe("codes");
    // A file the phone does not hold goes back to the person and is not counted.
    expect(applyAnswer(seal(uploaded(taken())), { complete: false, missing: ["window"] }).lost).toBeUndefined();
  });

  it("after a confirm said a file is missing, the words follow what the phone does", () => {
    const sealedUp = { ...seal(uploaded(taken(start({ side: "owner", forOther: true })))), done: true, awaitingCode: true };
    // Every file still held: it is sent again by itself, nothing to take again.
    expect(reopenedText(reopenForMissing(sealedUp, ["serial"]))).toBe(
      "A file of this record did not reach Renit. It is being sent again by itself. Ask for the code again once it is up."
    );
    // A file the phone does not hold: it is asked for from the person.
    expect(reopenedText(reopenForMissing(sealedUp, ["window"]))).toBe("A file of this record did not upload. Take what is missing again, then finish.");
  });

  it("a record that needs a photo opens the capture; it is not a Try again", () => {
    const lost = dropFile(seal(taken()), { shot: "back" }, "file:///captures/back.jpg");
    expect(card({ state: "continue", draft: lost })).toMatchObject({
      text: "A photo was lost before it could upload. Take it again.",
      button: { label: "Continue recording", action: "open" },
    });
    expect(card({ state: "continue", draft: addShot(start(), "front", file("front.jpg")) })?.text).toBe(
      "Started, not finished: 1 of 4 taken."
    );
  });

  it("an upload shows how far it is and the video's size; waiting says so and offers a new try", () => {
    const sealed = seal(setVideo(taken(), { uri: "file:///captures/video.mp4", taken_at: "2026-10-24T04:43:00Z", seconds: 14, bytes: 40 * 1024 * 1024 }));
    expect(card({ state: "uploading", draft: sealed })).toMatchObject({
      text: "Uploading. 0 of 4 uploaded. The video is 40 MB. It carries on while the app is open.",
      button: null,
      tone: "info",
    });
    const waiting = { ...sealed, error: { text: "Waiting for a connection. It uploads by itself when you are back online.", retry: true } };
    expect(card({ state: "waiting", draft: waiting })).toMatchObject({
      text: "0 of 4 uploaded. Waiting for a connection. It uploads by itself when you are back online. The video is 40 MB.",
      button: { label: "Try again", action: "retry" },
      tone: "warning",
    });
    expect(card({ state: "stuck", draft: { ...sealed, error: { text: "Renit did not take this record.", retry: false } } })).toMatchObject({
      text: "Renit did not take this record.",
      button: { label: "Try again", action: "retry" },
    });
  });

  it("a stuck set recorded for the other person opens the capture screen, where a new code is sent (review app-4 r2 #15)", () => {
    const theirs = { ...seal(taken(startDraft({ number: "RN-24831", moment: "handover", side: "customer", forOther: true, list: list() }))), error: { text: "Renit did not take this record.", retry: false } };
    expect(card({ state: "stuck", forOther: true, draft: theirs })).toMatchObject({
      button: { label: "Send Aarav a new code", action: "open" },
    });
  });

  it("the other person's set is named as theirs and asks for their code", () => {
    expect(card({ state: "code", forOther: true })).toMatchObject({
      title: "Aarav's handover record",
      text: "It is uploaded. Type the code Aarav reads out to confirm it.",
      button: { label: "Type the code", action: "open" },
      stake: null,
    });
    expect(card({ state: "none" })).toBeNull();
  });
});

describe("the video (decision T-18)", () => {
  it("is at most 15 seconds, and a longer one is asked for again with its real length", () => {
    expect(videoProblem({ seconds: 15, bytes: 30 * 1024 * 1024 })).toBeNull();
    // A camera stops a moment after the limit.
    expect(videoProblem({ seconds: 17 })).toBeNull();
    // A camera app that ignored the limit: never labelled shorter than it is.
    expect(videoProblem({ seconds: 180 })).toBe("That video is 3:00 long. Record it again, up to 0:15.");
  });

  it("is refused when it is too large to send", () => {
    expect(videoProblem({ seconds: 15, bytes: VIDEO_MAX_BYTES + 1 })).toMatch(/too large to send/);
    expect(videoProblem({ seconds: 15, bytes: VIDEO_MAX_BYTES })).toBeNull();
  });

  it("is taken as it is when the phone cannot say its length or size", () => {
    expect(videoProblem({})).toBeNull();
    expect(videoProblem({ seconds: null, bytes: null })).toBeNull();
  });

  it("shows its size before it is sent", () => {
    expect(sizeLabel(40 * 1024 * 1024)).toBe("40 MB");
    expect(sizeLabel(2.5 * 1024 * 1024)).toBe("2.5 MB");
    expect(sizeLabel(3 * 1024 * 1024)).toBe("3 MB");
    expect(sizeLabel(850 * 1024)).toBe("850 KB");
    expect(sizeLabel(undefined)).toBe("");
    expect(videoLabel({ seconds: 14, bytes: 40 * 1024 * 1024 })).toBe("Video · 0:14 · 40 MB");
    // No length is shown rather than a wrong one.
    expect(videoLabel({ bytes: 40 * 1024 * 1024 })).toBe("Video · 40 MB");
    expect(videoLabel(null)).toBe("Video");
  });
});

describe("the list a record starts from (review r1 #5)", () => {
  it("is the server's when it answers, else the copy the phone kept, else the general list", () => {
    const fetched = list();
    const kept = list({ video_hint: "kept" });
    expect(chooseList({ fetched, kept, offline: false, idMatch: false })).toEqual({ list: fetched, source: "server" });
    expect(chooseList({ fetched: undefined, kept, offline: false, idMatch: false })).toEqual({ list: kept, source: "kept" });
    // No connection and no copy: the capture still begins.
    const general = chooseList({ fetched: undefined, kept: null, offline: true, idMatch: true });
    expect(general?.source).toBe("generic");
    expect(general?.list.shots.map((shot) => shot.key)).toEqual(["front", "back", "left_side", "right_side", "marks", "label"]);
    expect(general?.list.id_match_required).toBe(true);
  });

  it("waits while a read may still answer, and until the phone's copy has been looked for", () => {
    expect(chooseList({ fetched: undefined, kept: null, offline: false, idMatch: false })).toBeNull();
    expect(chooseList({ fetched: undefined, kept: undefined, offline: true, idMatch: false })).toBeNull();
  });

  it("says so when the list is not the server's of this moment", () => {
    expect(listSourceNote("server")).toBeNull();
    expect(listSourceNote("kept")).toMatch(/as the phone last read it/);
    expect(listSourceNote("generic")).toMatch(/Renit's general list/);
  });

  it("a record begun on the general list takes the booking's own list when it arrives, and keeps the shots they share", () => {
    const d = seal(taken(startDraft({ number: "RN-24831", moment: "handover", side: "customer", list: genericShotList(false), generic: true })));
    expect(d.generic).toBe(true);
    const next = withList(d, list());
    expect(next.generic).toBe(false);
    expect(Object.keys(next.shots).sort()).toEqual(["back", "front"]);
    // The booking's list asks for the serial number too: the record is open for it.
    expect(next.sealed).toBe(false);
    expect(nextStep(next)).toEqual({ kind: "shot", index: 2 });
  });

  it("uses a list read back from the phone only if it has the shape of one", () => {
    expect(isShotList(list())).toBe(true);
    expect(isShotList(genericShotList(false))).toBe(true);
    expect(isShotList(null)).toBe(false);
    expect(isShotList({ shots: [] })).toBe(false);
    expect(isShotList({ shots: [{ key: "front" }], included_items: [] })).toBe(false);
  });
});

describe("files that leave a record (review r1 #8)", () => {
  it("a shot taken again, a shot the list dropped and a lost file each leave their old file behind", () => {
    const d = taken();
    expect(removedUris(d, addShot(d, "front", file("front-2.jpg")))).toEqual(["file:///captures/front.jpg"]);
    expect(removedUris(d, setVideo(d, { uri: "file:///captures/video-2.mp4", taken_at: "2026-10-24T04:44:00Z" }))).toEqual([
      "file:///captures/video.mp4",
    ]);
    expect(removedUris(d, withList(d, list({ shots: [{ key: "front", label: "Front", hint: "" }] }))).sort()).toEqual([
      "file:///captures/back.jpg",
      "file:///captures/serial.jpg",
    ]);
    expect(removedUris(d, tick(d, "Power cable"))).toEqual([]);
    // The whole record is let go of.
    expect(removedUris(d, null)).toHaveLength(4);
  });

  it("the sweep takes only files nothing names and that are older than a day", () => {
    const now = Date.parse("2026-10-25T10:00:00Z");
    const day = 24 * 3600_000;
    const found = [
      { name: "named.jpg", modifiedMs: now - 5 * day },
      { name: "orphan-old.jpg", modifiedMs: now - 2 * day },
      { name: "orphan-new.jpg", modifiedMs: now - 3600_000 },
      { name: "odd.jpg", modifiedMs: Number.NaN },
    ];
    expect(orphanFiles(found, new Set(["named.jpg"]), now)).toEqual(["orphan-old.jpg"]);
  });

  it("finds every file a kept list names, whatever its shape and whichever folder path it was saved under", () => {
    const kept = [
      { shots: { front: { uri: "file:///var/A1/Documents/captures/a.jpg" } }, video: { uri: "file:///var/A1/Documents/captures/v.mov" } },
      { uri: "file:///data/user/0/app/files/captures/job.jpg", url: "https://bucket.test/uploads/x.jpg" },
      { uri: "file:///cache/ImagePicker/not-ours.jpg" },
    ];
    expect([...namesIn(kept, "captures/")].sort()).toEqual(["a.jpg", "job.jpg", "v.mov"]);
    expect(fileName("file:///var/A2/Documents/captures/a.jpg?x=1")).toBe("a.jpg");
    expect(namesIn(null, "captures/").size).toBe(0);
  });
});

describe("a photo the camera hands back after the app was closed under it (review r1 #13)", () => {
  it("goes into the slot that was waiting for the camera", () => {
    const waiting = withShooting(start(), { shot: "back" });
    const back = recoverShot(waiting, { kind: "photo", file: file("back.jpg") });
    expect(back.shots.back).toMatchObject({ uri: "file:///captures/back.jpg", url: null });
    expect(back.shooting).toBeNull();
    const video = recoverShot(withShooting(taken(), "video"), {
      kind: "video",
      file: { uri: "file:///captures/again.mp4", taken_at: "2026-10-24T04:50:00Z", seconds: 12 },
    });
    expect(video.video?.uri).toBe("file:///captures/again.mp4");
  });

  it("is not put in a slot of the other kind, or anywhere when nothing was waiting", () => {
    const waiting = withShooting(start(), "video");
    const out = recoverShot(waiting, { kind: "photo", file: file("x.jpg") });
    expect(out.video).toBeNull();
    expect(out.shooting).toBeNull();
    const idle = start();
    expect(recoverShot(idle, { kind: "photo", file: file("x.jpg") })).toBe(idle);
  });

  it("a shot taken the usual way clears the mark", () => {
    expect(addShot(withShooting(start(), { shot: "front" }), "front", file("front.jpg")).shooting).toBeNull();
  });
});

describe("the two sets side by side", () => {
  const capture = (over: Partial<Capture> = {}): Capture => ({
    moment: "handover",
    side: "owner",
    recorded_by_other_side: false,
    shots: [{ key: "front", label: "Front", url: "https://cdn.test/h-front.jpg", taken_at: "2026-10-24T04:41:00Z" }],
    video: { url: "https://cdn.test/h-video.mp4", taken_at: "2026-10-24T04:43:00Z" },
    checklist: [
      { item: "Power cable", ticked: true },
      { item: "HDMI cable", ticked: false },
    ],
    id_match_ticked: null,
    missing: ["back", "serial"],
    complete: false,
    completed_at: null,
    ...over,
  });

  it("from the server's capture: the list's tiles, filled where a photo is in", () => {
    const view = setView(capture(), null, list());
    expect(view.state).toBe("partial");
    expect(view.shots).toEqual([
      { key: "front", label: "Front", uri: "https://cdn.test/h-front.jpg" },
      { key: "back", label: "Back", uri: null },
      { key: "serial", label: "Serial number", uri: null },
    ]);
    expect(view.video).toEqual({ taken: true, url: "https://cdn.test/h-video.mp4", label: "Video" });
    expect(setView(capture({ complete: true, missing: [] }), null, list()).state).toBe("in");
  });

  it("from the record on this phone while it uploads: its own photos, at once", () => {
    const view = setView(null, taken(), null);
    expect(view.state).toBe("partial");
    expect(view.shots[0]).toEqual({ key: "front", label: "Front", uri: "file:///captures/front.jpg" });
    // The video plays from the bucket, so not before it is up.
    expect(view.video).toEqual({ taken: true, url: null, label: "Video · 0:18" });
  });

  it("empty tiles when nothing is here yet, and the capture's own shots when there is no list", () => {
    expect(setView(null, null, list())).toMatchObject({ state: "none", video: { taken: false, url: null } });
    expect(setView(null, start(), null).state).toBe("none");
    expect(setView(capture(), null, null).shots).toEqual([{ key: "front", label: "Front", uri: "https://cdn.test/h-front.jpg" }]);
  });

  it("what's included: my ticks, and a note where the other side left one unticked", () => {
    const mine = [
      { item: "Power cable", ticked: true },
      { item: "HDMI cable", ticked: true },
    ];
    expect(includedRows(mine, capture().checklist, "the shop", list().included_items)).toEqual([
      { item: "Power cable", ticked: true, note: null },
      { item: "HDMI cable", ticked: true, note: "Not ticked by the shop" },
    ]);
    // Before this side has ticked anything, the other side's ticks show.
    expect(includedRows(null, capture().checklist, "the shop")).toEqual([
      { item: "Power cable", ticked: true, note: null },
      { item: "HDMI cable", ticked: false, note: "Not ticked by the shop" },
    ]);
    expect(includedRows(null, null, "the shop")).toEqual([]);
  });
});

describe("a record shot on the general list keeps what the booking's own list does not ask for (review app-4 r2 #16)", () => {
  const general = () => seal(taken(startDraft({ number: "RN-24831", moment: "handover", side: "customer", list: genericShotList(false), generic: true })));

  it("puts the photos the real list drops aside instead of deleting them", () => {
    const d = general();
    const next = withList(d, list());
    expect(Object.keys(next.shots).sort()).toEqual(["back", "front"]);
    expect(Object.keys(next.spare ?? {}).sort()).toEqual(Object.keys(d.shots).filter((key) => !["front", "back"].includes(key)).sort());
    // Nothing leaves the phone: the dropped photos are still named, so neither the list change nor the sweep deletes them.
    expect(Object.keys(next.spare ?? {}).length).toBeGreaterThan(0);
    expect(removedUris(d, next)).toEqual([]);
    expect(localUris(next)).toEqual(expect.arrayContaining(Object.values(next.spare ?? {}).map((f) => f.uri)));
  });

  it("clears them with the record, and never sends them", () => {
    const next = withList(general(), list());
    expect(removedUris(next, null).length).toBe(localUris(next).length);
    expect(files(next).map((f) => f.file.uri)).not.toEqual(expect.arrayContaining(Object.values(next.spare ?? {}).map((f) => f.uri)));
  });

  it("is only for a record begun on the general list: a staff edit of a real list still drops and deletes", () => {
    const d = taken();
    const next = withList(d, list({ shots: [{ key: "front", label: "Front", hint: "" }] }));
    expect(next.spare).toBeUndefined();
    expect(removedUris(d, next).sort()).toEqual(["file:///captures/back.jpg", "file:///captures/serial.jpg"]);
  });
});

describe("an extension has no handover record, and the booking pages leave the return to its own screens (review app-4 r2 #14, #17)", () => {
  const at = (stage: string, over: Partial<RecordBooking> = {}): RecordBooking => ({ stage, exit: "", can: [], ...over });
  const state = (moment: "handover" | "return", booking: RecordBooking, over: Partial<Parameters<typeof recordState>[0]> = {}) =>
    recordState({ moment, booking, onServer: false, draft: null, ...over });

  it("offers no handover record on an extension, though it is out", () => {
    expect(state("handover", at("out", { extends: "RN-24831" }))).toBe("none");
    expect(state("handover", at("out", { extends: null }))).toBe("start");
    // The return record is still its own to make.
    expect(state("return", at("out", { extends: "RN-24831" }))).toBe("start");
    expect(otherSetOffered("handover", at("out", { extends: "RN-24831" }), false, null)).toBe(false);
    expect(otherSetOffered("handover", at("out"), false, null)).toBe(true);
  });

  it("a record begun on an extension is still carried on", () => {
    expect(state("handover", at("out", { extends: "RN-24831" }), { draft: addShot(start(), "front", file("front.jpg")) })).toBe("continue");
  });

  it("a booking page offers the return record only once it is begun or the item is back", () => {
    expect(state("return", at("out"), { begunOnly: true })).toBe("none");
    expect(state("return", at("returned"), { begunOnly: true })).toBe("start");
    expect(state("return", at("out"), { begunOnly: true, draft: addShot(start({ moment: "return" }), "front", file("front.jpg")) })).toBe("continue");
    // The return screens themselves are not held back.
    expect(state("return", at("out"))).toBe("start");
    // The handover record is not held back on a booking page.
    expect(state("handover", at("out"), { begunOnly: true })).toBe("start");
  });
});

describe("the video hint and the picker's pending result", () => {
  it("shows the limit the app enforces in place of a longer one the list names", () => {
    expect(videoHintText("About 20 seconds. If the item switches on, show it working.")).toBe("Up to 15 seconds. If the item switches on, show it working.");
    expect(videoHintText("About 20 seconds with the console switched on. Show the power light.")).toBe("Up to 15 seconds with the console switched on. Show the power light.");
    expect(videoHintText("Keep it to about 30 seconds.")).toBe("Keep it to up to 15 seconds.");
    expect(videoHintText("If the item switches on, show it working.")).toBe("If the item switches on, show it working.");
    expect(videoHintText("")).toBe("");
  });

  it("reads one result, a list of them, or none", () => {
    expect(pendingList(null)).toEqual([]);
    expect(pendingList(undefined)).toEqual([]);
    expect(pendingList({ canceled: false })).toEqual([{ canceled: false }]);
    expect(pendingList([{ canceled: false }, { canceled: true }])).toEqual([{ canceled: false }, { canceled: true }]);
    expect(pendingList([])).toEqual([]);
  });
});

describe("the new answers of the capture calls (lane I, T-23)", () => {
  const e = (code: string, status = 409, details: Record<string, unknown> | null = null): ApiError => ({ status, code, message: null, details });

  it("503 storage_unavailable on a send says it plainly, loses nothing and is tried again", () => {
    expect(sendFailure(e("storage_unavailable", 503))).toEqual({
      error: { text: "We could not check your photos just now. Try again.", retry: true },
    });
  });

  it("409 capture_locked on a send means it is already complete", () => {
    expect(sendFailure(e("capture_locked"))).toEqual({ done: true });
  });

  it("400 beyond 40 shots shows the server's own sentence for the field", () => {
    const error: ApiError = { status: 400, code: "validation_error", message: "Check the fields.", details: { fields: { shots: ["A capture holds at most 40 photos."] } } };
    expect(sendFailure(error)).toEqual({ error: { text: "A capture holds at most 40 photos.", retry: false } });
    expect(sendFailure({ ...error, details: null })).toEqual({ error: { text: "Check the fields.", retry: false } });
  });

  it("403 on the other person's set, when its code ran out, is a new code and not a dead end", () => {
    const out = sendFailure(e("forbidden", 403), { forOther: true });
    expect(out).toEqual({ error: { text: "The code for the other person has run out. Send a new one, then try again.", retry: false } });
    // The person's own record keeps its plain line.
    expect(sendFailure(e("forbidden", 403))).toEqual({ error: { text: "This record can't be saved from this phone right now.", retry: false } });
  });

  it("the confirm of the other person's set: complete already, a file missing, or only words", () => {
    // A repeated confirm after a lost answer learns the set is complete.
    expect(confirmFailure(e("capture_locked"))).toEqual({ kind: "confirmed" });
    // A file never reached the bucket: the record opens again for exactly that.
    expect(confirmFailure(e("capture_incomplete", 409, { missing: ["serial", "confirmation_code"] }))).toEqual({ kind: "reopened", missing: ["serial"] });
    // Recording is not finished at all: only the code is missing is the one thing it does not list.
    expect(confirmFailure(e("capture_incomplete"))).toEqual({ kind: "error", text: "Finish recording first. The code confirms the whole record." });
    expect(confirmFailure(e("capture_incomplete", 409, { missing: ["confirmation_code"] }))).toEqual({
      kind: "error",
      text: "Finish recording first. The code confirms the whole record.",
    });
    expect(confirmFailure(e("storage_unavailable", 503))).toEqual({ kind: "error", text: "We could not check your photos just now. Try again." });
    expect(confirmFailure(e("wrong_code", 409, { tries_left: 2 }))).toEqual({ kind: "error", text: "That code is not right. 2 tries left." });
  });

  it("says each in words on the fallback calls", () => {
    expect(fallbackErrorText(e("capture_incomplete", 409, { missing: ["front"] }))).toBe("A file of this record did not upload. Send it again.");
    expect(fallbackErrorText(e("storage_unavailable", 503))).toBe("We could not check your photos just now. Try again.");
    expect(fallbackErrorText(e("capture_locked"))).toBe("This record is already complete.");
  });

  it("a record opened again for a file the server lacks sends that file again from the copy the phone kept, and asks for nothing", () => {
    const waiting = { ...seal(uploaded(taken())), done: true, awaitingCode: true };
    const next = reopenForMissing(waiting, ["back", "confirmation_code"]);
    expect(next.done).toBe(false);
    expect(next.awaitingCode).toBe(false);
    // Still finished by the person; the file is kept and its address cleared, so the queue puts it up again.
    expect(next.sealed).toBe(true);
    expect(next.shots.back).toMatchObject({ uri: "file:///captures/back.jpg", url: null });
    expect(next.shots.front.url).not.toBeNull();
    expect(nextWork([next], new Set())).toMatchObject({ kind: "upload" });
  });

  it("a file the phone no longer holds, and the ID tick, are asked for from the person", () => {
    const waiting = { ...seal(uploaded(taken())), done: true, awaitingCode: true };
    const gone = reopenForMissing({ ...waiting, shots: { front: waiting.shots.front } }, ["back"]);
    expect(gone.sealed).toBe(false);
    expect(gone.error?.text).toMatch(/still needs something/);
    expect(nextStep(gone)).toEqual({ kind: "shot", index: 1 });
    expect(reopenForMissing(waiting, ["id_match"]).sealed).toBe(false);
    expect(reopenForMissing({ ...waiting, video: null }, ["video"]).sealed).toBe(false);
  });
});
