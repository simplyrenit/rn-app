import { describe, expect, it, jest } from "@jest/globals";
import { MAX_EVIDENCE_PHOTOS, failedPhotosText, forgetAddresses, refusedFiles, uploadKeeping, urlsOf } from "../evidence";

const photo = (n: number, url: string | null = null) => ({ uri: `file:///p${n}.jpg`, url });

describe("uploadKeeping", () => {
  it("uploads each photo that is not up and keeps the order", async () => {
    const upload = jest.fn(async (uri: string) => `https://cdn/${uri.slice(-6)}`);
    const out = await uploadKeeping([photo(1), photo(2)], upload);
    expect(out.failed).toBe(0);
    expect(out.photos.map((p) => p.url)).toEqual(["https://cdn/p1.jpg", "https://cdn/p2.jpg"]);
  });

  it("does not upload a photo that is already up", async () => {
    const upload = jest.fn(async () => "https://cdn/new");
    const out = await uploadKeeping([photo(1, "https://cdn/old"), photo(2)], upload);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(out.photos.map((p) => p.url)).toEqual(["https://cdn/old", "https://cdn/new"]);
  });

  it("goes on past a failure, so one bad photo loses none of the others", async () => {
    const upload = jest.fn(async (uri: string) => {
      if (uri.endsWith("p2.jpg")) throw new Error("no signal");
      return `https://cdn/${uri.slice(-6)}`;
    });
    const out = await uploadKeeping([photo(1), photo(2), photo(3)], upload);
    expect(upload).toHaveBeenCalledTimes(3);
    expect(out.failed).toBe(1);
    expect(out.photos.map((p) => p.url)).toEqual(["https://cdn/p1.jpg", null, "https://cdn/p3.jpg"]);
  });

  it("tries only the photos that failed at the next press", async () => {
    let up = false;
    const upload = jest.fn(async (uri: string) => {
      if (uri.endsWith("p2.jpg") && !up) throw new Error("no signal");
      return `https://cdn/${uri.slice(-6)}`;
    });
    const first = await uploadKeeping([photo(1), photo(2)], upload);
    up = true;
    upload.mockClear();
    const second = await uploadKeeping(first.photos, upload);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledWith("file:///p2.jpg");
    expect(second.failed).toBe(0);
    expect(urlsOf(second.photos)).toEqual(["https://cdn/p1.jpg", "https://cdn/p2.jpg"]);
  });
});

describe("urlsOf", () => {
  it("gives the addresses in order, or null while one is missing", () => {
    expect(urlsOf([photo(1, "a"), photo(2, "b")])).toEqual(["a", "b"]);
    expect(urlsOf([photo(1, "a"), photo(2)])).toBeNull();
    expect(urlsOf([])).toEqual([]);
  });
});

describe("failedPhotosText", () => {
  it("says what was kept when only some failed", () => {
    expect(failedPhotosText(2, 5)).toBe("2 of 5 photos did not upload. Check your connection and try again: the others are kept.");
  });
  it("says it plainly when all failed", () => {
    expect(failedPhotosText(1, 1)).toBe("The photo did not upload. Check your connection and try again.");
    expect(failedPhotosText(3, 3)).toBe("The 3 photos did not upload. Check your connection and try again.");
  });
});

describe("a report whose files the server refused (T-23)", () => {
  const refusal = (field: string, text: string) => ({
    status: 400,
    code: "validation_error",
    message: null,
    details: { fields: { [field]: [text] } },
  });

  it("says the server's sentence for the field, and nothing for another field or another error", () => {
    const e = refusal("evidence", "This file is not on Renit's storage. Upload it again.");
    expect(refusedFiles(e, "evidence")).toBe("This file is not on Renit's storage. Upload it again.");
    expect(refusedFiles(e, "photos")).toBeNull();
    expect(refusedFiles({ ...e, code: "reply_late" }, "evidence")).toBeNull();
    expect(refusedFiles(null, "photos")).toBeNull();
  });

  it("forgets the address of every photo taken for the report, so the next press uploads it afresh; a capture's own photo keeps its address", () => {
    const out = forgetAddresses([
      { uri: "file:///a.jpg", url: "https://cdn/a" },
      { uri: "https://cdn/shot", url: "https://cdn/shot", fixed: true },
    ]);
    expect(out.map((p) => p.url)).toEqual([null, "https://cdn/shot"]);
  });

  it("the form takes ten photos, the most the server takes", () => {
    expect(MAX_EVIDENCE_PHOTOS).toBe(10);
  });
});
