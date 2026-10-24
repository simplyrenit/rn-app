import { describe, expect, it } from "@jest/globals";
import type { ApiError } from "../api-error";
import { Capture, ShotList, addShot, setReceived, startDraft, tick } from "../capture";
import { endingFromError } from "../shop-ring";
import { goingOutRow } from "../shop-today";
import {
  ShopLine,
  acceptBody,
  acceptLabel,
  acceptNote,
  answeredLines,
  basketItems,
  basketTitle,
  cancelAfter,
  cancelBody,
  isBasket,
  itemTag,
  itemsChip,
  lineRows,
  raceCopy,
  raceLost,
  ringEyebrow,
  ringMoney,
  thingsLeft,
  tickedIds,
  unitsFree,
  videoWord,
} from "../shop-lines";

// The story of the Figma file: a camera, a lens and a tripod for Sat 24 – Mon 26 Oct, ₹200 delivery (ruling G6).
const line = (id: number, title: string, rent: string, deposit: string, over: Partial<ShopLine> = {}): ShopLine => ({
  id,
  n: id,
  ref: `RN-21345·${id}`,
  product: { name: title.toLowerCase(), title, cover_image: null },
  rent,
  deposit,
  owner_earns: rent,
  units: { in_use: 0, quantity: 1 },
  state: "live",
  ...over,
});
const camera = line(1, "Sony A7 IV camera", "1500.00", "20000.00", { units: { in_use: 0, quantity: 1 } });
const lens = line(2, "Sony FE 24-70 mm GM lens", "900.00", "5000.00", { units: { in_use: 1, quantity: 2 } });
const tripod = line(3, "Manfrotto tripod", "300.00", "1000.00", { units: { in_use: 1, quantity: 3 } });
const ring = { lines: [camera, lens, tripod], you_earn: "2900.00", extends: null, first_day: "2026-10-24", last_day: "2026-10-26" };

describe("a booking of several items", () => {
  it("is one with more than one line in any state; one item is never one", () => {
    expect(isBasket(ring)).toBe(true);
    expect(isBasket({ lines: [camera] })).toBe(false);
    expect(isBasket({})).toBe(false);
    expect(isBasket({ lines: [camera, { ...lens, state: "refused" }] })).toBe(true);
  });

  it("chips the live items only, and not one left alone", () => {
    expect(itemsChip(ring)).toBe("3 items");
    expect(itemsChip({ lines: [camera, lens, { ...tripod, state: "refused" }] })).toBe("2 items");
    expect(itemsChip({ lines: [camera, { ...lens, state: "refused" }] })).toBeNull();
    expect(itemsChip({ lines: [camera] })).toBeNull();
    expect(ringEyebrow(ring)).toBe("New booking · 3 items");
    expect(ringEyebrow({ lines: [camera] })).toBe("New booking");
  });

  it("puts the chip on a Today row of several items only (MR-06a)", () => {
    const row = {
      number: "RN-21345",
      product_title: "Sony A7 IV camera + 2 more",
      customer_first_name: "Aarav",
      customer_last_initial: "M",
      delivery_mode: "owner_delivery" as const,
      stage: "ready",
      window: null,
      deposit_state: "paid",
    };
    expect(goingOutRow({ ...row, lines: ring.lines }).items).toBe("3 items");
    expect("items" in goingOutRow({ ...row, lines: [camera] })).toBe(false);
  });
});

describe("the ring's ticks", () => {
  it("says the units free as G7 does", () => {
    expect(unitsFree(camera.units)).toBe("1 of 1 free");
    expect(unitsFree(lens.units)).toBe("1 of 2 free");
    expect(unitsFree(tripod.units)).toBe("2 of 3 free");
    expect(unitsFree(undefined)).toBeNull();
  });

  it("ticks every live item by default, and never one lost or taken while it rang", () => {
    expect(tickedIds(ring.lines, new Set(), new Set())).toEqual([1, 2, 3]);
    expect(tickedIds(ring.lines, new Set([3]), new Set())).toEqual([1, 2]);
    expect(tickedIds(ring.lines, new Set(), new Set([2]))).toEqual([1, 3]);
    expect(tickedIds([camera, { ...lens, state: "no_unit" }, tripod], new Set(), new Set())).toEqual([1, 3]);
  });

  it("counts Accept against every item asked for", () => {
    expect(acceptLabel(3, 3)).toBe("Accept all 3");
    expect(acceptLabel(2, 3)).toBe("Accept 2 of 3");
    expect(acceptLabel(1, 1)).toBe("Accept");
  });

  it("works out You earn as the ticks stand: the ticked items' earns plus the delivery (G6)", () => {
    expect(ringMoney(ring, [1, 2, 3])).toEqual({ rentLabel: "Rent (3 items)", rent: "₹2,700", delivery: "₹200", earn: "₹2,900" });
    expect(ringMoney(ring, [1, 2])).toEqual({ rentLabel: "Rent (2 items)", rent: "₹2,400", delivery: "₹200", earn: "₹2,600" });
    // MR-03: the lens lost; the camera and tripod are what is left.
    expect(ringMoney(ring, [1, 3]).earn).toBe("₹2,000");
    // Self pickup: no delivery line.
    expect(ringMoney({ ...ring, you_earn: "2700.00" }, [1]).delivery).toBeNull();
  });

  it("sends the ticked items, nothing for an extension (D24) and nothing for one item", () => {
    expect(acceptBody(ring, [1, 2])).toEqual({ lines: [1, 2] });
    expect(acceptBody({ ...ring, extends: "RN-21300" }, [1, 2])).toEqual({});
    expect(acceptBody({ lines: [camera] }, [1])).toEqual({});
  });

  it("tells the shop what the customer is told either way", () => {
    expect(acceptNote("Aarav", 2, 3)).toBe("Aarav sees what you can give and pays for 2 items, or cancels.");
    expect(acceptNote("Aarav", 3, 3)).toBe("Can't do any refunds Aarav in full. Nothing is marked on your shop.");
  });
});

describe("an Accept race", () => {
  const err = (code: string, details: Record<string, unknown> | null): ApiError => ({ status: 409, code, message: null, details });

  it("reads the lost items from 409 no_unit_free, and nothing else as one", () => {
    expect(raceLost(err("no_unit_free", { lines: [2] }))).toEqual([2]);
    expect(raceLost(err("no_unit_free", { days: ["2026-10-24"] }))).toBeNull();
    expect(raceLost(err("no_unit_free", { lines: [] }))).toBeNull();
    expect(raceLost(err("ring_ended", { lines: [2] }))).toBeNull();
    expect(raceLost(null)).toBeNull();
  });

  it("keeps the request ringing: only a no_unit_free without lines ends it", () => {
    expect(endingFromError(err("no_unit_free", { lines: [2] }))).toBeNull();
    expect(endingFromError(err("no_unit_free", { days: ["2026-10-24"] }))).toMatchObject({ system: true, reason: "no_unit" });
  });

  it("names the item and what is left to do (MR-03)", () => {
    expect(raceCopy([lens], 2)).toEqual({
      title: "Sony FE 24-70 mm GM lens was just booked",
      body: "Another booking took the last one on these dates, so we unticked it. Accept the other 2, or say you can't do any.",
    });
    expect(raceCopy([lens, tripod], 0).title).toBe("Sony FE 24-70 mm GM lens and Manfrotto tripod were just booked");
    expect(raceCopy([lens, tripod], 0).body).toContain("Say you can't do any.");
  });
});

describe("an answered basket", () => {
  it("says what was accepted and what was left out (MR-03b)", () => {
    const answered = { ...ring, lines: [camera, lens, { ...tripod, state: "refused" }] };
    expect(answeredLines(answered)).toBe("Accepted 2 of 3. Manfrotto tripod unticked · blocked Sat 24 – Mon 26 Oct.");
    expect(answeredLines({ ...ring, lines: [camera, { ...lens, state: "no_unit" }, tripod] })).toBe(
      "Accepted 2 of 3. Sony FE 24-70 mm GM lens no longer free."
    );
    expect(answeredLines(ring)).toBeNull();
    expect(answeredLines({ ...ring, lines: [camera] })).toBeNull();
  });
});

describe("the booking's line table (MR-07)", () => {
  it("chips each item in the one vocabulary and strikes the ones left out", () => {
    const rows = lineRows({ ...ring, stage: "confirmed", lines: [camera, lens, { ...tripod, state: "refused" }] });
    expect(rows.map((r) => r.chip?.label)).toEqual(["Accepted", "Accepted", "Not available · dates blocked"]);
    expect(rows[2]).toMatchObject({ off: true, earn: "₹300", deposit: "Deposit share ₹1,000", meta: "Blocked Sat 24 – Mon 26 Oct" });
    expect(rows[0]).toMatchObject({ off: false, ref: "RN-21345·1", meta: null });
    // While it rings nothing is accepted yet.
    expect(lineRows({ ...ring, stage: "ringing" })[0].chip).toBeNull();
    expect(lineRows({ ...ring, stage: "ringing", lines: [{ ...lens, state: "no_unit" }] })[0].chip).toEqual({
      label: "No longer free",
      tone: "danger",
    });
  });
});

describe("the cancel sheet (MR-08, D46)", () => {
  it("names the item it can't give, or none", () => {
    expect(cancelBody(2)).toEqual({ confirm: true, line: 2 });
    expect(cancelBody(null)).toEqual({ confirm: true });
  });

  it("says the rest can be booked again", () => {
    expect(cancelAfter("Aarav", ring, 2)).toBe("Aarav can book Sony A7 IV camera and Manfrotto tripod again without Sony FE 24-70 mm GM lens.");
    expect(cancelAfter("Aarav", ring, null)).toBeNull();
    expect(cancelAfter("Aarav", { lines: [camera, { ...lens, state: "refused" }] }, 1)).toBeNull();
  });
});

describe("each item's record (MR-06b, MR-09, MR-10)", () => {
  const list: ShotList = {
    shots: [
      { key: "l1_front", label: "Sony A7 IV camera: Front", hint: "" },
      { key: "l1_back", label: "Sony A7 IV camera: Back", hint: "" },
      { key: "l3_folded", label: "Manfrotto tripod: Folded", hint: "" },
      { key: "l3_head", label: "Manfrotto tripod: Head", hint: "" },
    ],
    video_hint: "",
    included_items: ["Sony A7 IV camera: Battery", "Manfrotto tripod: Bag"],
    included_items_source: "lines",
    id_match_required: true,
    lines: [
      { id: 1, n: 1, ref: "RN-21345·1", title: "Sony A7 IV camera", prefix: "l1_", included_items: ["Sony A7 IV camera: Battery"] },
      { id: 3, n: 3, ref: "RN-21345·3", title: "Manfrotto tripod", prefix: "l3_", included_items: ["Manfrotto tripod: Bag"] },
    ],
  };
  const photo = (name: string) => ({ uri: `file:///captures/${name}.jpg`, taken_at: "2026-10-24T04:41:00Z" });
  const capture = (over: Partial<Capture> = {}): Capture => ({
    moment: "handover",
    side: "owner",
    recorded_by_other_side: false,
    shots: [],
    video: null,
    checklist: [],
    id_match_ticked: null,
    missing: [],
    complete: false,
    completed_at: null,
    ...over,
  });

  it("groups the merged list by item, with the item's name taken off each label", () => {
    const items = basketItems(list, null, null);
    expect(items.map((i) => i.title)).toEqual(["Sony A7 IV camera", "Manfrotto tripod"]);
    expect(items[0].shots.map((s) => s.label)).toEqual(["Front", "Back"]);
    expect(items[0].parts).toEqual([{ item: "Sony A7 IV camera: Battery", label: "Battery", ticked: false }]);
    expect(items.map((i) => i.word)).toEqual(["not_started", "not_started"]);
    expect(basketItems(null, null, null)).toEqual([]);
  });

  it("counts a shot done once the server or the bucket has it; uploading or failed while only on this phone", () => {
    let draft = startDraft({ number: "RN-21345", moment: "handover", side: "owner", list });
    draft = addShot(addShot(draft, "l1_front", photo("a")), "l1_back", photo("b"));
    draft = { ...draft, shots: { ...draft.shots, l1_front: { ...draft.shots.l1_front, url: "https://bucket.test/a.jpg" } } };
    const items = basketItems(list, draft, capture({ shots: [{ key: "l3_folded", label: "", url: "u", taken_at: "" }] }));
    expect(items[0].shots.map((s) => s.state)).toEqual(["done", "uploading"]);
    expect(items[0].word).toBe("in_progress");
    expect(items[1].shots.map((s) => s.state)).toEqual(["done", "missing"]);
    expect(itemTag(items[0])).toEqual({ label: "In progress", tone: "info" });

    const failing = basketItems(list, { ...draft, error: { text: "offline", retry: true } }, null);
    expect(failing[0].shots[1].state).toBe("failed");
    expect(itemTag(failing[0])).toEqual({ label: "1 not sent", tone: "danger" });
  });

  it("takes parts and Received ticks this phone made over the server's, and the server's for the rest", () => {
    let draft = startDraft({ number: "RN-21345", moment: "return", side: "owner", list });
    draft = setReceived(tick(draft, "Sony A7 IV camera: Battery"), 1, true);
    const server = capture({
      moment: "return",
      checklist: [
        { item: "Sony A7 IV camera: Battery", ticked: false },
        { item: "Manfrotto tripod: Bag", ticked: true },
      ],
      received: [3],
    });
    const items = basketItems(list, draft, server);
    expect(items.map((i) => i.parts[0].ticked)).toEqual([true, true]);
    expect(items.map((i) => i.received)).toEqual([true, true]);
    // Unticked here: this phone's word wins over the server's tick.
    expect(basketItems(list, setReceived(draft, 3, false), server)[1].received).toBe(false);
  });

  it("lists what the code still waits for, each with its way on, and never the video (D19)", () => {
    let draft = startDraft({ number: "RN-21345", moment: "handover", side: "owner", list });
    draft = addShot(draft, "l1_front", photo("a"));
    draft = { ...draft, error: { text: "offline", retry: true } };
    const rows = thingsLeft(basketItems(list, draft, null), { idTick: true, firstName: "Aarav" });
    expect(rows.map((r) => [r.text, r.action])).toEqual([
      ["Sony A7 IV camera · Front · not sent", "retry"],
      ["Sony A7 IV camera · Back · not taken", "take"],
      ["Manfrotto tripod · Folded · not taken", "take"],
      ["Manfrotto tripod · Head · not taken", "take"],
      ["Check Aarav's ID", "tick"],
    ]);
    const atReturn = thingsLeft(basketItems(list, null, null), { idTick: false, firstName: "Aarav", received: true });
    expect(atReturn[0]).toMatchObject({ text: "Sony A7 IV camera · not ticked Received", action: "tick" });
  });

  it("says where the one video stands", () => {
    const draft = startDraft({ number: "RN-21345", moment: "handover", side: "owner", list });
    const taken = { ...draft, video: { uri: "file:///v.mp4", taken_at: "", url: null } };
    expect(videoWord(null, null)).toBe("not_started");
    expect(videoWord(taken, null)).toBe("uploading");
    expect(videoWord({ ...taken, error: { text: "", retry: true } }, null)).toBe("failed");
    expect(videoWord(null, capture({ video: { url: "u", taken_at: "" } }))).toBe("in");
  });

  it("titles the screen by the items", () => {
    expect(basketTitle("handover", { ...ring, delivery_mode: "owner_delivery" }, "Aarav")).toBe("Deliver 3 items to Aarav");
    expect(basketTitle("handover", { ...ring, delivery_mode: "pickup" }, "Aarav")).toBe("Hand 3 items to Aarav");
    expect(basketTitle("return", { ...ring, delivery_mode: "pickup" }, "Aarav")).toBe("Take 3 items back");
  });
});
