import { describe, expect, it } from "@jest/globals";
import type { ApiError } from "../api-error";
import {
  NeedingDraft,
  PhotoJob,
  classifyFailure,
  currentDraft,
  frameHint,
  hasPhoto,
  jobCounts,
  needPhotosText,
  nextJob,
  notAShopText,
  onItsWay,
  pendingJobs,
  skip,
  retakeWalk,
  startWalk,
  stripText,
  took,
  upNext,
  walkProgress,
  walkSkipped,
  walkState,
} from "../draft-photos";

const draft = (n: number): NeedingDraft => ({ name: `PRO_${n}`, title: `Item ${n}`, shop_code: `LGT-0${n}` });
const drafts = [1, 2, 3, 4, 5].map(draft);

const job = (over: Partial<PhotoJob> = {}): PhotoJob => ({
  id: "j1",
  name: "PRO_1",
  title: "Item 1",
  uri: "file:///cache/1.jpg",
  url: null,
  status: "queued",
  error: null,
  attachSent: false,
  ...over,
});

const failure = (status: number, code: string | null, message: string | null = null): ApiError => ({
  status,
  code,
  message,
  details: null,
});

describe("the walk", () => {
  it("starts on the oldest draft, with the count the server gave", () => {
    const walk = startWalk(drafts, 5);
    expect(currentDraft(walk)?.name).toBe("PRO_1");
    expect(walkProgress(walk)).toEqual({ title: "Photo 1 of 5", done: "0 photos done", left: "5 left", fraction: 0 });
  });

  it("says where it is as SH-12 does: Photo 7 of 42, 6 photos done, 36 left", () => {
    const base = startWalk(Array.from({ length: 36 }, (_, i) => draft(i + 7)), 42);
    const walk = { ...base, taken: 6 };
    expect(walkProgress(walk)).toMatchObject({ title: "Photo 7 of 42", done: "6 photos done", left: "36 left" });
    expect(walkProgress({ ...walk, taken: 1 }).done).toBe("1 photo done");
  });

  it("a photo moves on to the next draft", () => {
    const walk = took(startWalk(drafts, 5));
    expect(currentDraft(walk)?.name).toBe("PRO_2");
    expect(walk.taken).toBe(1);
    expect(walkProgress(walk)).toMatchObject({ title: "Photo 2 of 5", left: "4 left" });
  });

  it("skipping puts the draft aside, and does not count it as done", () => {
    const walk = skip(startWalk(drafts, 5));
    expect(currentDraft(walk)?.name).toBe("PRO_2");
    expect(walk.skipped.map((d) => d.name)).toEqual(["PRO_1"]);
    expect(walkProgress(walk)).toMatchObject({ title: "Photo 2 of 5", done: "0 photos done", left: "5 left" });
  });

  it("shows the next three after the current one", () => {
    expect(upNext(startWalk(drafts, 5)).map((d) => d.name)).toEqual(["PRO_2", "PRO_3", "PRO_4"]);
    expect(upNext(took(took(took(startWalk(drafts, 5))))).map((d) => d.name)).toEqual(["PRO_5"]);
  });

  it("skipped drafts come round again when the shop asks, and the walk finishes when none are left", () => {
    let walk = startWalk([draft(1), draft(2)], 2);
    walk = skip(walk);
    walk = took(walk);
    expect(walkState(walk)).toBe("skipped_left");
    walk = walkSkipped(walk);
    expect(walkState(walk)).toBe("walking");
    expect(currentDraft(walk)?.name).toBe("PRO_1");
    walk = took(walk);
    expect(walkState(walk)).toBe("finished");
    expect(walkProgress(walk)).toMatchObject({ done: "2 photos done", left: "0 left", fraction: 1 });
  });

  it("an empty list is finished before it starts", () => {
    const walk = startWalk([], 0);
    expect(walkState(walk)).toBe("finished");
    expect(currentDraft(walk)).toBeNull();
    expect(walkProgress(walk).fraction).toBe(0);
  });

  it("does not ask again for a draft whose photo is already on its way from this phone", () => {
    const walk = startWalk(drafts.filter((d) => d.name !== "PRO_1" && d.name !== "PRO_3"), 5, new Set(["PRO_1", "PRO_3"]));
    expect(walk.waiting.map((d) => d.name)).toEqual(["PRO_2", "PRO_4", "PRO_5"]);
    expect(walk.total).toBe(3);
  });

  it("filters the list itself when the server still lists a draft that is on its way", () => {
    const walk = startWalk(drafts, 5, new Set(["PRO_1", "PRO_3"]));
    expect(walk.waiting.map((d) => d.name)).toEqual(["PRO_2", "PRO_4", "PRO_5"]);
    expect(walk.total).toBe(3);
  });

  it("never reads Skip on an empty walk as a draft", () => {
    expect(skip(startWalk([], 0)).skipped).toEqual([]);
  });

  it("writes the card's words and the viewfinder's hint", () => {
    expect(needPhotosText(42)).toBe("42 drafts need photos");
    expect(needPhotosText(1)).toBe("1 draft needs photos");
    expect(frameHint()).toBe("Fit the whole item in the frame");
  });
});

describe("the uploads", () => {
  it("go in the order the photos were taken, one at a time", () => {
    const jobs = [job({ id: "a", status: "done" }), job({ id: "b", status: "uploading" }), job({ id: "c" }), job({ id: "d" })];
    expect(nextJob(jobs)?.id).toBe("c");
    expect(nextJob([job({ status: "failed" })])).toBeNull();
  });

  it("what is not on its draft yet is pending", () => {
    const jobs = [job({ id: "a", status: "done" }), job({ id: "b", status: "gone" }), job({ id: "c", status: "failed" }), job({ id: "d" })];
    expect(pendingJobs(jobs).map((j) => j.id)).toEqual(["c", "d"]);
  });

  it("the strip counts what is going up and what did not", () => {
    const jobs = [job({ id: "a", status: "uploading" }), job({ id: "b" }), job({ id: "c", status: "failed" }), job({ id: "d", status: "done" })];
    expect(jobCounts(jobs)).toEqual({ uploading: 2, failed: 1, missing: 0 });
    expect(stripText({ uploading: 2, failed: 0, missing: 0 })).toEqual({ text: "2 photos uploading", tone: "info" });
    expect(stripText({ uploading: 1, failed: 0, missing: 0 })?.text).toBe("1 photo uploading");
    expect(stripText({ uploading: 0, failed: 1, missing: 0 })).toEqual({ text: "1 photo did not upload", tone: "warning" });
    expect(stripText({ uploading: 2, failed: 3, missing: 0 })?.text).toBe("3 photos did not upload, 2 still going up");
    expect(stripText({ uploading: 0, failed: 0, missing: 0 })).toBeNull();
  });
});

describe("classifyFailure: what a failure means for a photo", () => {
  it("a photo that could not be made or put on the bucket is tried again from the start", () => {
    expect(classifyFailure("upload", null)).toEqual({
      status: "failed",
      message: "It did not upload. Check your connection.",
      keepUrl: false,
      attachSent: false,
    });
  });

  it("an attach with no answer may have gone through: the retry keeps the address and checks the draft", () => {
    for (const error of [null, failure(0, null), failure(502, null), failure(500, "server_error")]) {
      expect(classifyFailure("attach", error)).toMatchObject({ status: "failed", keepUrl: true, attachSent: true });
    }
  });

  it("a draft that is no longer a draft has nothing to attach to: the photo is dropped", () => {
    expect(classifyFailure("attach", failure(409, "wrong_status"))).toMatchObject({ status: "gone", message: null });
    expect(classifyFailure("attach", failure(404, "not_found"))).toMatchObject({ status: "gone" });
  });

  it("a draft with five photos already does not need this one", () => {
    expect(classifyFailure("attach", failure(409, "too_many_photos"))).toMatchObject({ status: "done" });
  });

  it("an address the server did not accept is made again", () => {
    expect(classifyFailure("attach", failure(400, "validation_error"))).toMatchObject({
      status: "failed",
      keepUrl: false,
      attachSent: false,
    });
  });

  it("a 400 shows the server's plain reason for the photo, and the photo is made and sent again", () => {
    const refused = (text: string) => ({ status: 400, code: "validation_error", message: null, details: { fields: { url: [text] } } });
    for (const text of [
      "This photo is over 15 MB. Save a smaller copy and add it again.",
      "This file is not a photo Renit can open. Save it as a JPEG and add it again.",
      "That file belongs to a booking's record.",
      "Upload the photo to Renit first.",
    ]) {
      expect(classifyFailure("attach", refused(text))).toEqual({ status: "failed", message: text, keepUrl: false, attachSent: false });
    }
  });

  it("503 storage_unavailable and photo_not_checked mean nothing was added: the photo and its address are kept to send again", () => {
    for (const code of ["storage_unavailable", "photo_not_checked"]) {
      expect(classifyFailure("attach", { status: 503, code, message: "Renit could not look at this photo just now. Send it again.", details: null })).toEqual({
        status: "failed",
        message: "Renit could not look at this photo just now. Send it again.",
        keepUrl: true,
        // Not "may have gone through": the retry sends it again without reading the draft first.
        attachSent: false,
      });
    }
    // Any other 5xx may have gone through.
    expect(classifyFailure("attach", { status: 503, code: "payments_unavailable", message: null, details: null })).toMatchObject({ attachSent: true });
  });

  it("any other refusal shows the server's words and keeps the address", () => {
    expect(classifyFailure("attach", failure(403, "forbidden", "Not yours."))).toMatchObject({
      status: "failed",
      message: "Not yours.",
      keepUrl: true,
    });
    expect(classifyFailure("attach", failure(429, "rate_limited")).message).toBe("Something went wrong. Try again.");
  });
});

describe("hasPhoto", () => {
  const sent = "https://bucket.s3.ap-south-1.amazonaws.com/uploads/u1/listing-3f2a.jpg";

  it("finds the photo under its CDN address: the server rewrites the bucket address", () => {
    expect(hasPhoto(["https://cdn.example/uploads/u1/listing-9a8b.jpg", "https://cdn.example/uploads/u1/listing-3f2a.jpg"], sent)).toBe(true);
  });

  it("does not find another photo, or a draft with none", () => {
    expect(hasPhoto(["https://cdn.example/uploads/u1/listing-9a8b.jpg"], sent)).toBe(false);
    expect(hasPhoto([], sent)).toBe(false);
    expect(hasPhoto(undefined, sent)).toBe(false);
    expect(hasPhoto(["https://cdn.example/x.jpg"], "")).toBe(false);
  });

  it("ignores a signature left on the address", () => {
    expect(hasPhoto(["https://cdn.example/uploads/u1/listing-3f2a.jpg"], `${sent}?X-Amz-Signature=abc`)).toBe(true);
  });
});

describe("notAShopText", () => {
  it("explains that photos for drafts are for shops", () => {
    expect(notAShopText(failure(403, "not_shop_owner"))).toMatch(/for shops/);
    expect(notAShopText(failure(403, "not_owner"))).toMatch(/for shops/);
    expect(notAShopText(failure(500, null))).toBeNull();
    expect(notAShopText(null)).toBeNull();
  });
});

describe("review round 1, finding 4: a failed photo does not hide its draft", () => {
  it("only photos still going up keep their draft out of the walk", () => {
    const jobs = [
      job({ id: "a", name: "PRO_1", status: "queued" }),
      job({ id: "b", name: "PRO_2", status: "uploading" }),
      job({ id: "c", name: "PRO_3", status: "failed" }),
      job({ id: "d", name: "PRO_4", status: "done" }),
    ];
    expect([...onItsWay(jobs)].sort()).toEqual(["PRO_1", "PRO_2"]);
    const walk = startWalk(drafts, 5, onItsWay(jobs));
    expect(walk.waiting.map((d) => d.name)).toEqual(["PRO_3", "PRO_4", "PRO_5"]);
  });

  it("'Take again' puts the drafts of the failed photos at the front, and they stop counting as taken", () => {
    let walk = startWalk(drafts, 5);
    walk = took(took(took(walk)));
    expect(walk.taken).toBe(3);
    const failed = [job({ id: "a", name: "PRO_1", title: "Item 1", shop_code: "LGT-01" }), job({ id: "b", name: "PRO_2", title: "Item 2" })];
    const again = retakeWalk(walk, failed);
    expect(again.waiting.map((d) => d.name)).toEqual(["PRO_1", "PRO_2", "PRO_4", "PRO_5"]);
    expect(again.waiting[0]).toEqual({ name: "PRO_1", title: "Item 1", shop_code: "LGT-01" });
    expect(again.waiting[1].shop_code).toBe("");
    expect(again.taken).toBe(1);
    expect(walkState(again)).toBe("walking");
    expect(currentDraft(again)?.name).toBe("PRO_1");
  });

  it("brings a finished walk back to life, and takes a draft out of the skipped ones", () => {
    let walk = startWalk([draft(1), draft(2)], 2);
    walk = skip(walk);
    walk = took(walk);
    expect(walkState(walk)).toBe("skipped_left");
    const again = retakeWalk(walk, [job({ name: "PRO_2", title: "Item 2" }), job({ id: "x", name: "PRO_1", title: "Item 1" })]);
    expect(again.skipped).toEqual([]);
    expect(again.waiting.map((d) => d.name)).toEqual(["PRO_2", "PRO_1"]);
    expect(again.taken).toBe(0);
  });

  it("never lists a draft twice, and never goes below none taken", () => {
    const walk = startWalk(drafts, 5);
    const again = retakeWalk(walk, [job({ name: "PRO_1", title: "Item 1" }), job({ id: "y", name: "PRO_1", title: "Item 1" })]);
    expect(again.waiting.filter((d) => d.name === "PRO_1")).toHaveLength(1);
    expect(again.taken).toBe(0);
  });

  it("tells a photo whose file is gone from one that failed to upload", () => {
    const jobs = [job({ id: "a", status: "failed" }), job({ id: "b", status: "failed", missing: true }), job({ id: "c", status: "failed", missing: true })];
    expect(jobCounts(jobs)).toEqual({ uploading: 0, failed: 1, missing: 2 });
    expect(stripText({ uploading: 0, failed: 0, missing: 2 })).toEqual({ text: "2 photos no longer on this phone", tone: "warning" });
    expect(stripText({ uploading: 1, failed: 1, missing: 1 })?.text).toBe("1 photo did not upload, 1 photo no longer on this phone, 1 still going up");
    expect(classifyFailure("file", null)).toMatchObject({ status: "failed", missing: true, keepUrl: false });
  });
});
