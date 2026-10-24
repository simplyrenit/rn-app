import { prepareImage } from "@/backend/list-flow/images";
import { Capture, CaptureBody, Captures, Moment, PhoneFallback, ShotList, Side, isShotList, overPhotoLimit } from "@/lib/capture";
import { BOOKINGS_ENDPOINT, GENERATE_SIGNED_URLS } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
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
 * Puts one file on Renit's bucket through the existing presigned path and
 * resolves to its address (the presigned URL without its signature). The file is
 * streamed from disk, so a video is never held in memory. `what` names the file:
 * every upload gets its own name, so two never overwrite each other. A photo over the size the server takes (it takes
 * it out of the record and asks for it again) is made smaller first; the file kept on the phone stays as it was.
 */
export async function uploadCaptureFile(uri: string, kind: "photo" | "video", what: string): Promise<string> {
  const info = kind === "photo" ? await FileSystem.getInfoAsync(uri, { size: true }).catch(() => null) : null;
  const file = info?.exists && overPhotoLimit(info.size) ? await prepareImage(uri) : uri;
  const { ext, type } = typeOf(file, kind);
  const safe = what.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const { data } = await axiosInstance.post<{ presigned_urls: string[] }>(GENERATE_SIGNED_URLS, {
    filenames: [`capture-${safe}-${uuidv4()}.${ext}`],
    file_types: [type],
  });
  const presigned = data.presigned_urls?.[0];
  if (!presigned) throw new Error("No presigned URL returned");
  const result = await FileSystem.uploadAsync(presigned, file, {
    httpMethod: "PUT",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { "Content-Type": type },
  });
  if (result.status < 200 || result.status >= 300) throw new Error(`Upload failed: ${result.status}`);
  return presigned.split("?")[0];
}
