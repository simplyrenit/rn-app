import { prepareImage } from "@/backend/list-flow/images";
import { Capture, CaptureBody, Captures, Moment, PhoneFallback, ShotList, Side, base64Bytes, isShotList, overPhotoLimit } from "@/lib/capture";
import { BOOKINGS_ENDPOINT, GENERATE_SIGNED_URLS } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { Sha256, toBase64, toHex } from "@/lib/sha256";
import { uuidv4 } from "@/lib/uuid";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { useQuery } from "react-query";

/** API-CONTRACT OE-I: the capture endpoints. Both sides call the same paths. */
const url = (number: string, action: string) => `${BOOKINGS_ENDPOINT}${encodeURIComponent(number)}/${action}`;

export const shotListQueryKey = (number: string) => ["shot-list", number];
export const capturesQueryKey = (number: string) => ["captures", number];

const keptListKey = (number: string) => `renit-shot-list:${number}`;

/**
 * What to shoot for this booking's item, the checklist, and whether the ID tick
 * is asked for. Each answer is also kept on the phone under the booking's number,
 * so a capture can begin at a door with no signal (review round 1, finding 5).
 */
export async function fetchShotList(number: string): Promise<ShotList> {
  const list = (await axiosInstance.get<ShotList>(url(number, "shot-list/"))).data;
  if (isShotList(list)) void AsyncStorage.setItem(keptListKey(number), JSON.stringify(list)).catch(() => undefined);
  return list;
}

/** The copy of a booking's list this phone kept from an earlier read, or null. */
export async function readKeptShotList(number: string): Promise<ShotList | null> {
  try {
    const kept: unknown = JSON.parse((await AsyncStorage.getItem(keptListKey(number))) ?? "null");
    return isShotList(kept) ? kept : null;
  } catch {
    return null;
  }
}

/**
 * The list changes rarely (staff edit it in the admin), so one read serves the
 * whole handover. The day-of, rental, handover and return screens read it as soon
 * as they open, before anyone taps Record, which is what puts the copy on the phone.
 */
export function useShotList(number: string, enabled = true) {
  return useQuery(shotListQueryKey(number), () => fetchShotList(number), { enabled, staleTime: 5 * 60_000, retry: 1 });
}

/** Both sides' captures, at the handover and at the return. */
export async function fetchCaptures(number: string): Promise<Captures> {
  return (await axiosInstance.get<Captures>(url(number, "captures/"))).data;
}

/** How often the two sets are read again while one of them is still on its way. */
export const CAPTURES_POLL_MS = 5000;

/**
 * The two sets. Read again every few seconds while `waitingFor` says a set is
 * still to come and the screen is in front: the other person is standing there.
 */
export function useCaptures(number: string, poll: boolean, enabled = true) {
  return useQuery(capturesQueryKey(number), () => fetchCaptures(number), {
    enabled,
    staleTime: 0,
    refetchInterval: poll ? CAPTURES_POLL_MS : false,
    retry: 1,
  });
}

/** Saves or adds to a capture. `409 capture_locked` once it is complete. */
export async function putCapture(number: string, moment: Moment, side: Side, body: CaptureBody): Promise<Capture> {
  return (await axiosInstance.put<{ capture: Capture }>(url(number, `captures/${moment}/${side}/`), body)).data.capture;
}

/** One phone failed: a code goes by SMS to the other person, and this phone may record their set. */
export async function startPhoneFallback(number: string, moment: Moment): Promise<PhoneFallback> {
  return (await axiosInstance.post<PhoneFallback>(url(number, "phone-fallback/"), { moment })).data;
}

/** The person whose phone failed reads out the code; this confirms the set recorded for them. */
export async function confirmPhoneFallback(number: string, moment: Moment, code: string): Promise<Capture> {
  return (await axiosInstance.post<{ capture: Capture }>(url(number, "phone-fallback/confirm/"), { moment, code })).data
    .capture;
}

// ---- One file to the bucket ---------------------------------------------------------------------

/** The iPhone's camera records QuickTime; everything else here is MP4 or JPEG. */
function typeOf(uri: string, kind: "photo" | "video"): { ext: string; type: string } {
  if (kind === "photo") return { ext: "jpg", type: "image/jpeg" };
  return /\.mov$/i.test(uri.split("?")[0]) ? { ext: "mov", type: "video/quicktime" } : { ext: "mp4", type: "video/mp4" };
}

/**
 * How much of a file is read at a time to hash it. Small, so a video is never held whole in memory and each piece of
 * hashing (about 25 ms of the interpreter's time) leaves the screen free to draw and answer taps between pieces: the
 * queue hashes while the person is still walking through the shots (review r1).
 */
const HASH_CHUNK_BYTES = 64 * 1024;

/**
 * The SHA-256 of a file on the phone, as 32 bytes, read a chunk at a time. Null when it can't be read: the file is then
 * sent without one, as an older build sends it; a hash never stops a record from going up.
 */
export async function fileSha256(uri: string): Promise<Uint8Array | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    if (!info.exists || typeof info.size !== "number") return null;
    const hash = new Sha256();
    for (let position = 0; position < info.size; position += HASH_CHUNK_BYTES) {
      const length = Math.min(HASH_CHUNK_BYTES, info.size - position);
      const chunk = base64Bytes(await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64, position, length }));
      // A short read would hash other bytes than are sent, and the bucket would refuse the file every time.
      if (chunk.length !== length) return null;
      hash.update(chunk);
    }
    return hash.digest();
  } catch {
    return null;
  }
}

/** A file on Renit's bucket: its address, and the SHA-256 (hex) the bucket checked it against, when there was one. */
export interface Uploaded {
  url: string;
  sha256?: string;
}

/**
 * Puts one file on Renit's bucket through the existing presigned path and
 * resolves to its address (the presigned URL without its signature). The file is
 * streamed from disk, so a video is never held in memory. `what` names the file:
 * every upload gets its own name, so two never overwrite each other. A photo over the size the server takes (it takes
 * it out of the record and asks for it again) is made smaller first; the file kept on the phone stays as it was.
 *
 * ENG-350: the exact bytes sent are hashed first, and the upload carries that SHA-256, so the bucket refuses any other
 * bytes (a 400 here, and the queue tries again from the file it keeps). The server keeps the hash with the record.
 */
export async function uploadCaptureFile(uri: string, kind: "photo" | "video", what: string): Promise<Uploaded> {
  const info = kind === "photo" ? await FileSystem.getInfoAsync(uri, { size: true }).catch(() => null) : null;
  const file = info?.exists && overPhotoLimit(info.size) ? await prepareImage(uri) : uri;
  const { ext, type } = typeOf(file, kind);
  const safe = what.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const digest = await fileSha256(file);
  const sha256 = digest ? toHex(digest) : undefined;
  const { data } = await axiosInstance.post<{ presigned_urls: string[] }>(GENERATE_SIGNED_URLS, {
    filenames: [`capture-${safe}-${uuidv4()}.${ext}`],
    file_types: [type],
    ...(sha256 ? { sha256s: [sha256] } : {}),
  });
  const presigned = data.presigned_urls?.[0];
  if (!presigned) throw new Error("No presigned URL returned");
  // Sent only when the server signed it into the address: a server that does not know `sha256s` signs no checksum,
  // and the bucket refuses an unsigned one. Without it the file goes up, and is recorded, with no hash.
  const checked = Boolean(digest) && signsChecksum(presigned);
  const result = await FileSystem.uploadAsync(presigned, file, {
    httpMethod: "PUT",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    // Signed into the address: without it, or with other bytes, the bucket refuses the upload.
    headers: { "Content-Type": type, ...(checked && digest ? { "x-amz-checksum-sha256": toBase64(digest) } : {}) },
  });
  if (result.status < 200 || result.status >= 300) throw new Error(`Upload failed: ${result.status}`);
  return { url: presigned.split("?")[0], ...(checked ? { sha256 } : {}) };
}

/** Whether a presigned PUT address requires the checksum header (SigV4 lists it in `X-Amz-SignedHeaders`). */
function signsChecksum(presigned: string): boolean {
  const signed = /[?&]X-Amz-SignedHeaders=([^&]*)/i.exec(presigned)?.[1] ?? "";
  return decodeURIComponent(signed).split(";").includes("x-amz-checksum-sha256");
}
