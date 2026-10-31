import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import axiosInstance from "@/lib/networkUtils";
import * as FileSystem from "expo-file-system";
import { prepareImage } from "../list-flow/images";
import { createHash } from "crypto";
import { uploadCaptureFile } from "../captures";

jest.mock("@react-native-async-storage/async-storage", () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn() } }));
jest.mock("@/lib/networkUtils", () => ({ __esModule: true, default: { post: jest.fn(), get: jest.fn(), put: jest.fn() } }));
jest.mock("@/lib/config", () => ({ BOOKINGS_ENDPOINT: "https://api.test/bookings/", GENERATE_SIGNED_URLS: "https://api.test/generate-presigned-urls/" }));
jest.mock("../list-flow/images", () => ({ prepareImage: jest.fn(async () => "file:///cache/small.jpg") }));
jest.mock("expo-file-system", () => ({
  getInfoAsync: jest.fn(async () => ({ exists: true, size: 4 * 1024 * 1024 })),
  uploadAsync: jest.fn(async () => ({ status: 200 })),
  FileSystemUploadType: { BINARY_CONTENT: 0 },
  EncodingType: { Base64: "base64" },
  // No file to read unless a test gives one: the upload then goes without a hash, as an older build's.
  readAsStringAsync: jest.fn(async () => {
    throw new Error("no file");
  }),
}));

type Call = jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
const post = (axiosInstance as unknown as { post: Call }).post;

/**
 * What rn-api does with a file name: `rnfiles.fields.upload_to_func` (Django's `slugify` of the base name, the extension
 * kept, under `uploads/<year>/<month>/<day>/<8 random>/`). Copied here so the test can prove the key the server will see.
 */
function serverKey(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : "";
  const slug = base
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
  return `uploads/2026/10/11/a1b2c3d4/${slug}${ext}`;
}

/** `handover.files.is_capture_key` and `KEY` of lane I: a capture's file is under `uploads/` and its name starts `capture-`. */
const isCaptureKey = (key: string) => key.startsWith("uploads/") && (key.split("/").pop() ?? "").startsWith("capture-");
const KEY = /^uploads(\/[A-Za-z0-9_-][A-Za-z0-9._-]*)+$/;

let sent: string[];
beforeEach(() => {
  jest.clearAllMocks();
  sent = [];
  post.mockImplementation(async (...args: unknown[]) => {
    const body = args[1] as { filenames: string[]; sha256s?: string[] };
    sent.push(...body.filenames);
    // As rn-api signs it: the checksum header is listed only when a hash was given.
    const headers = body.sha256s ? "content-type%3Bhost%3Bx-amz-checksum-sha256" : "content-type%3Bhost";
    return {
      data: {
        presigned_urls: body.filenames.map(
          (name) => `https://bucket.s3.ap-south-1.amazonaws.com/${serverKey(name)}?X-Amz-SignedHeaders=${headers}&X-Amz-Signature=abc`,
        ),
      },
    };
  });
});

describe("every capture file is named so the server takes it (T-23: `uploads/…/capture-*`)", () => {
  const uploads: [string, "photo" | "video", string][] = [
    ["a photo", "photo", "file:///captures/front.jpg"],
    ["a video from an Android phone", "video", "file:///captures/clip.mp4"],
    ["a video from an iPhone", "video", "file:///captures/clip.MOV"],
  ];
  const whats = [
    "RN-24831-handover-customer",
    "RN-24831-return-owner",
    "RN-24831-not-as-described",
    "RN-24831-fault",
    "RN-24831-damage",
    "claim-12-reply",
    "  ??  ",
  ];

  for (const [label, kind, uri] of uploads) {
    it(`names ${label} capture-… whatever it is for, and the server's key keeps that`, async () => {
      for (const what of whats) {
        const { url } = await uploadCaptureFile(uri, kind, what);
        const filename = sent[sent.length - 1];
        expect(filename.startsWith("capture-")).toBe(true);
        const key = new URL(url).pathname.slice(1);
        expect(key).toBe(serverKey(filename));
        expect(isCaptureKey(key)).toBe(true);
        expect(KEY.test(key)).toBe(true);
        // The signature is cut off: the address stored is the plain one.
        expect(url).not.toContain("?");
      }
    });
  }

  it("gives each upload its own name, so two never overwrite each other", async () => {
    await uploadCaptureFile("file:///captures/a.jpg", "photo", "RN-24831-handover-customer");
    await uploadCaptureFile("file:///captures/b.jpg", "photo", "RN-24831-handover-customer");
    expect(new Set(sent).size).toBe(2);
  });

  it("sends only the three kinds of ending the server accepts: .jpg for a photo, .mp4 or .mov for a video", async () => {
    await uploadCaptureFile("file:///captures/a.jpg", "photo", "x");
    await uploadCaptureFile("file:///captures/a.mp4", "video", "x");
    await uploadCaptureFile("file:///captures/a.mov", "video", "x");
    expect(sent.map((name) => name.split(".").pop())).toEqual(["jpg", "mp4", "mov"]);
    expect((FileSystem.uploadAsync as unknown as jest.Mock).mock.calls.length).toBe(3);
  });
});

describe("a photo over the size the server takes is made smaller, and sent (the server takes it out of the record otherwise)", () => {
  const uploadAsync = FileSystem.uploadAsync as unknown as jest.Mock;
  const info = FileSystem.getInfoAsync as unknown as Call;

  it("sends the smaller copy, not the file kept on the phone", async () => {
    info.mockResolvedValueOnce({ exists: true, size: 16 * 1024 * 1024 });
    await uploadCaptureFile("file:///captures/big.jpg", "photo", "x");
    expect(prepareImage).toHaveBeenCalledWith("file:///captures/big.jpg");
    expect(uploadAsync.mock.calls[0][1]).toBe("file:///cache/small.jpg");
  });

  it("sends a photo within the limit as it is, and a video never goes through the photo resize", async () => {
    await uploadCaptureFile("file:///captures/ok.jpg", "photo", "x");
    expect(prepareImage).not.toHaveBeenCalled();
    expect(uploadAsync.mock.calls[0][1]).toBe("file:///captures/ok.jpg");
    await uploadCaptureFile("file:///captures/clip.mp4", "video", "x");
    expect(prepareImage).not.toHaveBeenCalled();
  });

  it("sends the file as it is when its size cannot be read", async () => {
    info.mockRejectedValueOnce(new Error("no"));
    await uploadCaptureFile("file:///captures/odd.jpg", "photo", "x");
    expect(prepareImage).not.toHaveBeenCalled();
    expect(uploadAsync.mock.calls[0][1]).toBe("file:///captures/odd.jpg");
  });
});

describe("the upload carries the SHA-256 of its bytes, so the bucket refuses any others (ENG-350)", () => {
  const uploadAsync = FileSystem.uploadAsync as unknown as jest.Mock;
  const info = FileSystem.getInfoAsync as unknown as Call;
  const read = FileSystem.readAsStringAsync as unknown as Call;
  /** A file of 2.5 MB and a bit, so the last piece is short. */
  const bytes = Buffer.from(Array.from({ length: 2.5 * 1024 * 1024 + 100 }, (_, i) => (i * 7) & 0xff));

  beforeEach(() => {
    info.mockResolvedValue({ exists: true, size: bytes.length });
    read.mockImplementation(async (...args: unknown[]) => {
      const { position, length } = args[1] as { position: number; length: number };
      return bytes.subarray(position, position + length).toString("base64");
    });
  });

  it("hashes the file a piece at a time and signs the hash into the upload", async () => {
    const digest = createHash("sha256").update(bytes).digest();

    const uploaded = await uploadCaptureFile("file:///captures/clip.mp4", "video", "x");

    expect(read).toHaveBeenCalledTimes(41); // 64 KB at a time
    expect(uploaded.sha256).toBe(digest.toString("hex"));
    expect((post.mock.calls[0][1] as { sha256s: string[] }).sha256s).toEqual([digest.toString("hex")]);
    expect(uploadAsync.mock.calls[0][2]).toMatchObject({
      headers: { "Content-Type": "video/mp4", "x-amz-checksum-sha256": digest.toString("base64") },
    });
  });

  it("fails when the bucket refuses the bytes, so the queue sends the kept file again", async () => {
    (uploadAsync as unknown as Call).mockResolvedValueOnce({ status: 400 }); // S3's BadDigest
    await expect(uploadCaptureFile("file:///captures/front.jpg", "photo", "x")).rejects.toThrow("Upload failed: 400");
  });

  it("leaves the hash out when the server did not sign it (an rn-api without ENG-350), so the bucket still takes the file", async () => {
    post.mockResolvedValueOnce({ data: { presigned_urls: ["https://bucket.s3.ap-south-1.amazonaws.com/uploads/x/capture-x.jpg?X-Amz-SignedHeaders=content-type%3Bhost"] } });

    const uploaded = await uploadCaptureFile("file:///captures/front.jpg", "photo", "x");

    expect(uploaded).toEqual({ url: "https://bucket.s3.ap-south-1.amazonaws.com/uploads/x/capture-x.jpg" });
    expect(uploadAsync.mock.calls[0][2]).toEqual(expect.objectContaining({ headers: { "Content-Type": "image/jpeg" } }));
  });

  it("hashes a kept file once across failed tries, and afresh after the bucket refused it", async () => {
    const network = new Error("Network request failed");
    post.mockRejectedValueOnce(network).mockRejectedValueOnce(network);
    await expect(uploadCaptureFile("file:///captures/kept.mp4", "video", "x")).rejects.toThrow(network);
    await expect(uploadCaptureFile("file:///captures/kept.mp4", "video", "x")).rejects.toThrow(network);
    expect(read).toHaveBeenCalledTimes(41); // one hash for both tries

    (uploadAsync as unknown as Call).mockResolvedValueOnce({ status: 400 });
    await expect(uploadCaptureFile("file:///captures/kept.mp4", "video", "x")).rejects.toThrow("Upload failed: 400");
    await uploadCaptureFile("file:///captures/kept.mp4", "video", "x");
    expect(read).toHaveBeenCalledTimes(82); // the refusal dropped it: hashed again
  });

  it("sends no hash when the file reads back shorter than its size", async () => {
    read.mockImplementation(async () => Buffer.from("short").toString("base64"));

    expect((await uploadCaptureFile("file:///captures/front.jpg", "photo", "x")).sha256).toBeUndefined();
  });

  it("sends a file it cannot read without a hash rather than not at all", async () => {
    read.mockRejectedValue(new Error("unreadable"));

    const uploaded = await uploadCaptureFile("file:///captures/front.jpg", "photo", "x");

    expect(uploaded.sha256).toBeUndefined();
    expect("sha256s" in (post.mock.calls[0][1] as object)).toBe(false);
    expect(uploadAsync.mock.calls[0][2]).toEqual(expect.objectContaining({ headers: { "Content-Type": "image/jpeg" } }));
  });
});
