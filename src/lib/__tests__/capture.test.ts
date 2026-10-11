import { describe, expect, it } from "@jest/globals";
import type { ApiError } from "../api-error";
import {
  Capture,
  CaptureDraft,
  ShotList,
  addShot,
  applyAnswer,
  canSeal,
  captureBody,
  captureHeading,
  captureId,
  draftState,
  draftsToKeep,
  dropFile,
  durationLabel,
  fallbackErrorText,
  files,
  includedRows,
  needsIdMatch,
  nextStep,
  nextWork,
  noticeRows,
  otherSide,
  photoCount,
  readyToSend,
  seal,
  sendFailure,
  setIdMatch,
  setUrl,
  setVideo,
  setView,
  shotChip,
  startDraft,
  tick,
  uploadLine,
  uploadProgress,
  withList,
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
    const d = { ...seal(uploaded(taken())), error: { text: "This booking has moved on.", retry: false } };
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

  it("something missing goes back to the person", () => {
    const d = applyAnswer(seal(uploaded(taken())), answer({ missing: ["serial", "video"] }));
    expect(d.done).toBe(false);
    expect(d.sealed).toBe(false);
    expect(d.shots.serial).toBeUndefined();
    expect(d.video).toBeNull();
    expect(d.shots.front?.url).toBeTruthy();
    expect(draftState(d)).toBe("stuck");
    expect(nextStep(d)).toEqual({ kind: "shot", index: 2 });
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
    expect(sendFailure(err("stage_not_allowed"))).toMatchObject({ error: { retry: false } });
    expect(sendFailure(err("validation_error", 400))).toMatchObject({ error: { retry: false } });
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

  it("the line on a day-of screen: nothing while recording or once it is up", () => {
    expect(uploadLine(null)).toBeNull();
    expect(uploadLine(taken())).toBeNull();
    expect(uploadLine({ ...seal(taken()), done: true })).toBeNull();
    expect(uploadLine(seal(taken()))).toEqual({
      text: "Your photos and video are uploading. 0 of 4 uploaded.",
      tone: "info",
    });
    const waiting = { ...seal(taken()), error: { text: "Waiting for a connection.", retry: true } };
    expect(uploadLine(waiting)).toEqual({ text: "0 of 4 uploaded. Waiting for a connection.", tone: "warning" });
    expect(draftState(waiting)).toBe("waiting");
  });

  it("the notice: what is recorded, who can see it, how long it is kept", () => {
    const six = { shots: Array.from({ length: 6 }, (_, i) => ({ key: `k${i}`, label: `L${i}`, hint: "" })) };
    expect(noticeRows(six, "customer").map((r) => r.body)).toEqual([
      "Six photos and a 20-second video of the item",
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
    expect(durationLabel(20)).toBe("0:20");
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
