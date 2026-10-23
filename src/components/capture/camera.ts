import { captureQueue, discardFiles, fileBytes, keepFile } from "@/backend/capture-jobs";
import { prepareImage } from "@/backend/list-flow/images";
import { permissionDenied } from "@/components/list-flow/pick-photos";
import { LocalFile, VIDEO_SECONDS, base64Bytes, namesPlace, pendingList, recoverShot, videoBox, videoProblem } from "@/lib/capture";
import { toast } from "@/lib/toast";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Platform } from "react-native";

/**
 * The camera for a capture, and only the camera: the gallery is never offered,
 * so nobody can pass off an old photo (booking plan, "Camera only, inside the
 * app"). It is the system camera, opened through the picker the app already has;
 * there is no camera module in the app.
 *
 * Both calls resolve to null when nothing was taken (the person backed out, the
 * permission is off, the camera would not open, the video was too long), having said why.
 */
async function cameraOpen(): Promise<boolean> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (permission.status === "granted") return true;
  permissionDenied("Camera");
  return false;
}

function cameraFailed() {
  toast.error("The camera could not be opened", {
    message: "If this phone's camera is not working, the other person's phone can record both sets.",
  });
}

export interface TakenVideo {
  uri: string;
  /** The clip's real length; left out when the camera did not say. */
  seconds?: number;
  bytes?: number;
}

/**
 * B1 (plan §6 APP-2): on a booking Renit's courier partner carries, the two sides never meet, so a capture file must not
 * tell the other side where it was taken (the customer's home). Shots carry no place for the other side already (the
 * server hides it); these are the places inside the files themselves.
 */
export interface CameraOptions {
  courier?: boolean;
}

/**
 * A photo as the camera gave it: resized once for upload and moved to where it is kept until the server has it. The
 * re-encode drops the photo's EXIF, its place included. Null when it can't be used, having said why.
 */
async function keepPhoto(asset: ImagePicker.ImagePickerAsset, { courier }: CameraOptions = {}): Promise<string | null> {
  try {
    return await keepFile(await prepareImage(asset.uri, { width: asset.width, height: asset.height }));
  } catch {
    // The resize failed (a format the phone could not re-encode). On a courier booking the original's EXIF may hold
    // where it was taken, so it is not kept; otherwise the photo is kept as it was taken.
    if (courier) {
      toast.error("That photo can't be used", { message: "This phone could not prepare it. Take it again." });
      return null;
    }
    return keepFile(asset.uri);
  }
}

/** The largest `moov` box read to look for a place; a 15-second clip's is a few hundred KB. */
const MOOV_MAX_BYTES = 8 * 1024 * 1024;

const readBytes = async (uri: string, position: number, length: number) =>
  base64Bytes(await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64, position, length }));

/**
 * Whether a video's metadata names where it was taken: the top-level boxes are walked by their headers (no picture is
 * read) to the `moov` box, which is searched for a location tag. A file that can't be read this way counts as naming one.
 */
async function videoNamesPlace(uri: string, bytes: number): Promise<boolean> {
  try {
    for (let at = 0; at + 8 <= bytes; ) {
      const box = videoBox(await readBytes(uri, at, Math.min(16, bytes - at)), bytes - at);
      if (!box) return true;
      if (box.type === "moov") return box.size > MOOV_MAX_BYTES || namesPlace(await readBytes(uri, at, box.size));
      at += box.size;
    }
  } catch {
    // Unreadable: it can't be shown to hold no place.
  }
  return true;
}

/**
 * A video as the camera gave it, measured before it is taken into a record: its
 * real length and its size. A camera app that ignored the limit, or a clip too
 * large to send, is refused with the reason and deleted (decision T-18).
 *
 * On a courier booking a clip whose metadata names a place is refused too: Android's camera app writes one when its
 * location tags are on. ponytail: refused, not stripped; the app has no way to write inside a file in place, and a whole
 * rewrite in JS would hold the clip in memory. A small native module that renames the tag's box to `free` would strip it.
 */
async function keepVideo(asset: ImagePicker.ImagePickerAsset, { courier }: CameraOptions = {}): Promise<TakenVideo | null> {
  const uri = await keepFile(asset.uri);
  // The picker gives the length in milliseconds, and not on every phone.
  const seconds = asset.duration && asset.duration > 0 ? Math.round(asset.duration / 1000) : undefined;
  const bytes = (await fileBytes(uri)) ?? (typeof asset.fileSize === "number" ? asset.fileSize : undefined) ?? undefined;
  const problem =
    videoProblem({ seconds, bytes }) ??
    (courier && (!bytes || (await videoNamesPlace(uri, bytes)))
      ? "Your camera saved where you are in this video. Turn off location tags in the camera app's settings, then record it again."
      : null);
  if (problem) {
    void discardFiles([uri]);
    toast.error("That video can't be used", { message: problem });
    return null;
  }
  return { uri, seconds, bytes };
}

/** One photo, taken now with the camera. */
export async function takePhoto(options: CameraOptions = {}): Promise<string | null> {
  if (!(await cameraOpen())) return null;
  let result: ImagePicker.ImagePickerResult;
  try {
    result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
  } catch {
    cameraFailed();
    return null;
  }
  const asset = result.canceled ? null : result.assets?.[0];
  return asset ? keepPhoto(asset, options) : null;
}

/**
 * The short video. The camera is asked to stop by itself at `VIDEO_SECONDS`, on
 * both platforms. An iPhone records it at medium quality, which is the
 * compression; on Android the system camera app decides the quality.
 * ponytail: no compression on Android (decision T-18: it needs a native module,
 * and nothing can be run on a device in this build). The length limit and the
 * size ceiling are the bounds; add a compressor here, behind this one function.
 */
export async function recordVideo(options: CameraOptions = {}): Promise<TakenVideo | null> {
  if (!(await cameraOpen())) return null;
  let result: ImagePicker.ImagePickerResult;
  try {
    result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: VIDEO_SECONDS,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      allowsEditing: false,
    });
  } catch {
    cameraFailed();
    return null;
  }
  const asset = result.canceled ? null : result.assets?.[0];
  return asset ? keepVideo(asset, options) : null;
}

/**
 * On Android the system camera runs in another app, and a phone short of memory
 * may close Renit while it is in front. The picker then holds the photo for the
 * next start. This asks for it and puts it into the slot of the record that was
 * waiting for the camera (`draft.shooting`), so a walk of seven camera launches
 * does not lose a shot each time (review round 1, finding 13). `stamp` gives the
 * time for the recovered shot: it was taken a moment before the restart.
 */
export async function recoverLostShot(stamp: () => string = () => new Date().toISOString()): Promise<void> {
  const waiting = captureQueue.getDrafts().find((draft) => draft.shooting && !draft.done);
  if (!waiting) return;
  let taken: { kind: "photo" | "video"; file: Omit<LocalFile, "url"> } | null = null;
  if (Platform.OS === "android") {
    try {
      type Pending = ImagePicker.ImagePickerResult | ImagePicker.ImagePickerErrorResult;
      for (const pending of pendingList<Pending>(await ImagePicker.getPendingResultAsync())) {
        const asset = "assets" in pending && !pending.canceled ? pending.assets?.[0] : null;
        if (!asset) continue;
        const options = { courier: waiting.courier };
        if (asset.type === "video") {
          const video = await keepVideo(asset, options);
          if (video) taken = { kind: "video", file: { uri: video.uri, seconds: video.seconds, bytes: video.bytes, taken_at: stamp() } };
        } else {
          const uri = await keepPhoto(asset, options);
          if (uri) taken = { kind: "photo", file: { uri, taken_at: stamp() } };
        }
        break;
      }
    } catch {
      // Nothing was held, or it could not be read: the slot is simply asked for again.
    }
  }
  const found = taken;
  // With nothing handed back the slot is no longer waiting; the walk asks for it as before.
  captureQueue.update(waiting.id, (draft) => (found ? recoverShot(draft, found) : { ...draft, shooting: null }));
}

let lastPlace: { lat: number; long: number; at: number } | null = null;
const PLACE_FRESH_MS = 2 * 60_000;
const PLACE_WAIT_MS = 3000;

/**
 * Where the phone is, for the stamp on each shot. Asked once, kept for two
 * minutes, and never waited on for more than a few seconds: a handover at a door
 * with no GPS still goes ahead, and that shot carries its time only.
 */
export async function placeNow(): Promise<{ lat: number; long: number } | null> {
  if (lastPlace && Date.now() - lastPlace.at < PLACE_FRESH_MS) return { lat: lastPlace.lat, long: lastPlace.long };
  try {
    let permission = await Location.getForegroundPermissionsAsync();
    if (permission.status === "undetermined") permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") return null;
    const fix = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), PLACE_WAIT_MS)),
    ]);
    const coords = fix?.coords ?? (await Location.getLastKnownPositionAsync())?.coords;
    if (!coords) return null;
    lastPlace = { lat: coords.latitude, long: coords.longitude, at: Date.now() };
    return { lat: lastPlace.lat, long: lastPlace.long };
  } catch {
    return null;
  }
}
