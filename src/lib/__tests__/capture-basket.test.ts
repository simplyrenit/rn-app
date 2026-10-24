import { describe, expect, it, jest } from "@jest/globals";
import {
  Capture,
  CaptureBody,
  CaptureDraft,
  ShotList,
  addShot,
  applyPartial,
  canSeal,
  captureBody,
  nextWork,
  partialBody,
  partialDue,
  receivedIds,
  reopenForMissing,
  seal,
  setIdMatch,
  setReceived,
  setVideo,
  startDraft,
  tick,
  waiveReceived,
  withReceived,
} from "../capture";
import { CaptureQueueDeps, createCaptureQueue } from "../capture-queue";

// A basket's merged list (T11): two items, keys led by `l{n}_`, labels and checklist by the item's name.
const list: ShotList = {
  shots: [
    { key: "l1_front", label: "Camera: Front", hint: "" },
    { key: "l2_front", label: "Tripod: Front", hint: "" },
  ],
  video_hint: "",
  included_items: ["Camera: Battery", "Tripod: Bag"],
  included_items_source: "lines",
  id_match_required: true,
  lines: [
    { id: 11, n: 1, ref: "RN-21345·1", title: "Camera", prefix: "l1_", included_items: ["Camera: Battery"] },
    { id: 12, n: 2, ref: "RN-21345·2", title: "Tripod", prefix: "l2_", included_items: ["Tripod: Bag"] },
  ],
};
const photo = (name: string) => ({ uri: `file:///captures/${name}.jpg`, taken_at: "2026-10-24T04:41:00Z" });
const video = { uri: "file:///captures/video.mp4", taken_at: "2026-10-24T04:43:00Z", seconds: 12 };
const up = (draft: CaptureDraft, key: string): CaptureDraft => ({
  ...draft,
  shots: { ...draft.shots, [key]: { ...draft.shots[key], url: `https://bucket.test/${key}.jpg` } },
});
const owner = (moment: "handover" | "return" = "handover") => startDraft({ number: "RN-21345", moment, side: "owner", list });
const notYet = { complete: false, missing: ["video"] } as unknown as Capture;

describe("a basket's send names only what this phone did", () => {
  it("sends the checklist items it touched, the ID tick once made, and nothing of a one-item record changes", () => {
    let draft = up(addShot(owner(), "l1_front", photo("a")), "l1_front");
    expect(captureBody(draft)).toEqual({ shots: [expect.objectContaining({ key: "l1_front" })], checklist: [] });
    draft = setIdMatch(tick(draft, "Tripod: Bag"), true);
    expect(captureBody(draft).checklist).toEqual([{ item: "Tripod: Bag", ticked: true }]);
    expect(captureBody(draft).id_match_ticked).toBe(true);
    // A one-item record still sends its whole checklist and the ID tick either way.
    const plain = startDraft({ number: "RN-1", moment: "handover", side: "owner", list: { ...list, lines: undefined } });
    expect(captureBody(plain)).toMatchObject({ checklist: [{ item: "Camera: Battery", ticked: false }, { item: "Tripod: Bag", ticked: false }], id_match_ticked: false });
  });

  it("sends Received ticks, and ticks taken back as not_received, on the shop's return only", () => {
    let draft = setReceived(owner("return"), 11, true);
    draft = setReceived(setReceived(draft, 12, true), 12, false);
    expect(captureBody(draft)).toMatchObject({ received: [11], not_received: [12] });
    expect(captureBody(setReceived(owner("handover"), 11, true)).received).toBeUndefined();
  });

  it("counts another phone's Received ticks but never sends them as this phone's (review r1)", () => {
    const draft = withReceived(setReceived(owner("return"), 12, false), [11, 12]);
    expect(receivedIds(draft)).toEqual([11]);
    expect(captureBody(draft)).toMatchObject({ not_received: [12] });
    expect(captureBody(draft).received).toBeUndefined();
    expect(withReceived(draft, [12, 11])).toBe(draft);
  });

  it("lets go of the ticks the server took, so a later send can't undo another phone's untick", () => {
    const draft = setReceived(owner("return"), 11, true);
    const body = partialBody(draft);
    expect(body.received).toEqual([11]);
    const after = applyPartial(draft, { complete: false, missing: [], received: [11] }, body);
    expect(after.received).toEqual([]);
    expect(receivedIds(after)).toEqual([11]);
    expect(partialDue(after)).toBe(false);
    // Phone B unticks it: this phone's next send (a part ticked) no longer names it.
    const later = tick(withReceived(after, []), "Camera: Battery");
    expect(captureBody(later).received).toBeUndefined();
    expect(receivedIds(later)).toEqual([]);
  });

  it("sends the ID tick taken back on a basket, once this phone made it", () => {
    const ticked = setIdMatch(owner(), true);
    expect(captureBody(setIdMatch(ticked, false)).id_match_ticked).toBe(false);
    expect(captureBody(owner()).id_match_ticked).toBeUndefined();
  });
});

describe("a basket's record goes to the server as its photos go up", () => {
  it("is due once something is up and changed since the last send, before the video, never for the other person's set", () => {
    const fresh = owner();
    expect(partialDue(fresh)).toBe(false);
    const draft = up(addShot(fresh, "l1_front", photo("a")), "l1_front");
    expect(partialDue(draft)).toBe(true);
    const sent = applyPartial(draft, notYet, partialBody(draft));
    expect(partialDue(sent)).toBe(false);
    expect(partialDue(up(addShot(sent, "l2_front", photo("b")), "l2_front"))).toBe(true);
    expect(partialDue({ ...draft, forOther: true })).toBe(false);
    expect(partialDue({ ...draft, error: { text: "Update Renit to record these items.", retry: false, status: 400 } })).toBe(false);
    const plain = startDraft({ number: "RN-1", moment: "handover", side: "owner", list: { ...list, lines: undefined } });
    expect(partialDue(up(addShot(plain, "l1_front", photo("a")), "l1_front"))).toBe(false);
  });

  it("is sent before the video goes up, so the code can open while it uploads (D19)", () => {
    let draft = up(up(addShot(addShot(owner(), "l1_front", photo("a")), "l2_front", photo("b")), "l1_front"), "l2_front");
    draft = setVideo(draft, video);
    expect(nextWork([draft])).toMatchObject({ kind: "send", partial: true });
    const sent = applyPartial(draft, notYet, partialBody(draft));
    expect(nextWork([sent])).toMatchObject({ kind: "upload", slot: "video" });
  });

  it("never carries the video before the person has finished: the server would lock the record (review r1)", () => {
    let draft = up(addShot(owner(), "l1_front", photo("a")), "l1_front");
    draft = setVideo(draft, video);
    draft = { ...draft, video: { ...draft.video!, url: "https://bucket.test/video.mp4" } };
    expect(partialBody(draft).video).toBeUndefined();
    const sent = applyPartial(draft, notYet, partialBody(draft));
    expect(nextWork([sent])).toBeNull();
    // Done: the finished send carries it.
    expect(nextWork([seal(setIdMatch(up(addShot(sent, "l2_front", photo("b")), "l2_front"), true))])).toMatchObject({
      kind: "send",
    });
  });

  it("is done when the answer is complete (another phone's video made it whole)", () => {
    const draft = up(addShot(owner(), "l1_front", photo("a")), "l1_front");
    expect(applyPartial(draft, { complete: true, missing: [] }, partialBody(draft)).done).toBe(true);
  });

  it("goes through the queue: shots first, then the video, then the finished send", async () => {
    const order: string[] = [];
    const deps: CaptureQueueDeps = {
      upload: jest.fn(async (uri: string, kind: "photo" | "video") => {
        order.push(`${kind} ${uri.split("/").pop()}`);
        return `https://bucket.test/${uri.split("/").pop()}`;
      }),
      send: jest.fn(async (_draft: CaptureDraft, body: CaptureBody) => {
        order.push(body.video ? "send with video" : `send ${body.shots.length} shots`);
        return (body.video ? { complete: true, missing: [] } : notYet) as Capture;
      }),
      load: jest.fn(async () => [] as CaptureDraft[]),
      save: jest.fn(async () => undefined),
      discard: jest.fn(async () => undefined),
    };
    const queue = createCaptureQueue(deps);
    await queue.init("shop");
    const id = queue.start(owner()).id;
    queue.update(id, (d) => addShot(d, "l1_front", photo("a")));
    await queue.idle();
    expect(order).toEqual(["photo a.jpg", "send 1 shots"]);
    queue.update(id, (d) => addShot(d, "l2_front", photo("b")));
    queue.update(id, (d) => setVideo(d, video));
    queue.update(id, (d) => seal(setIdMatch(d, true)));
    await queue.idle();
    expect(order).toEqual(["photo a.jpg", "send 1 shots", "photo b.jpg", "send 2 shots", "video video.mp4", "send with video"]);
    expect(queue.getDrafts()[0].done).toBe(true);
  });
});

describe("a basket's return is finished only with every item Received (D51)", () => {
  it("is not asked once the desk took the return by hand (T11, OR12)", () => {
    const draft = setVideo(addShot(addShot(owner("return"), "l1_front", photo("a")), "l2_front", photo("b")), video);
    expect(canSeal(draft)).toBe(false);
    expect(canSeal(waiveReceived(draft))).toBe(true);
    expect(captureBody(waiveReceived(setReceived(draft, 11, true))).received).toBeUndefined();
  });

  it("can't be sealed with an item unticked", () => {
    let draft = owner("return");
    draft = setVideo(addShot(addShot(draft, "l1_front", photo("a")), "l2_front", photo("b")), video);
    expect(canSeal(setReceived(draft, 11, true))).toBe(false);
    expect(canSeal(setReceived(setReceived(draft, 11, true), 12, true))).toBe(true);
  });

  it("opens again, unticked, when the server says an item is not Received", () => {
    let draft = setReceived(setReceived(owner("return"), 11, true), 12, true);
    draft = reopenForMissing({ ...draft, sealed: true }, ["l2_received"]);
    expect(draft.received).toEqual([11]);
    expect(draft.sealed).toBe(false);
    expect(draft.error?.text).toMatch(/^Tick every item Received/);
    // Ticking it again clears the words, and so does the desk taking the return by hand.
    expect(setReceived(draft, 12, true).error).toBeNull();
    expect(waiveReceived(draft).error).toBeNull();
  });
});
