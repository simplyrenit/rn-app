import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import axiosInstance from "@/lib/networkUtils";
import * as FileSystem from "expo-file-system";
import { uploadCaptureFile } from "../captures";

jest.mock("@react-native-async-storage/async-storage", () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn() } }));
jest.mock("@/lib/networkUtils", () => ({ __esModule: true, default: { post: jest.fn(), get: jest.fn(), put: jest.fn() } }));
jest.mock("@/lib/config", () => ({ BOOKINGS_ENDPOINT: "https://api.test/bookings/", GENERATE_SIGNED_URLS: "https://api.test/generate-presigned-urls/" }));
jest.mock("expo-file-system", () => ({
  uploadAsync: jest.fn(async () => ({ status: 200 })),
  FileSystemUploadType: { BINARY_CONTENT: 0 },
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
    const body = args[1] as { filenames: string[] };
    sent.push(...body.filenames);
    return { data: { presigned_urls: body.filenames.map((name) => `https://bucket.s3.ap-south-1.amazonaws.com/${serverKey(name)}?X-Amz-Signature=abc`) } };
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
        const url = await uploadCaptureFile(uri, kind, what);
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
