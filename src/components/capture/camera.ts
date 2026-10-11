import { captureQueue, discardFiles, fileBytes, keepFile } from "@/backend/capture-jobs";
import { prepareImage } from "@/backend/list-flow/images";
import { permissionDenied } from "@/components/list-flow/pick-photos";
import { LocalFile, VIDEO_SECONDS, pendingList, recoverShot, videoProblem } from "@/lib/capture";
import { toast } from "@/lib/toast";
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

/** A photo as the camera gave it: resized once for upload and moved to where it is kept until the server has it. */
async function keepPhoto(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  try {
    return await keepFile(await prepareImage(asset.uri, { width: asset.width, height: asset.height }));
  } catch {
    // The resize failed (a format the phone could not re-encode): the photo is kept as it was taken.
    return keepFile(asset.uri);
  }
}

/**
 * A video as the camera gave it, measured before it is taken into a record: its
 * real length and its size. A camera app that ignored the limit, or a clip too
 * large to send, is refused with the reason and deleted (decision T-18).
 */
async function keepVideo(asset: ImagePicker.ImagePickerAsset): Promise<TakenVideo | null> {
  const uri = await keepFile(asset.uri);
  // The picker gives the length in milliseconds, and not on every phone.
  const seconds = asset.duration && asset.duration > 0 ? Math.round(asset.duration / 1000) : undefined;
  const bytes = (await fileBytes(uri)) ?? (typeof asset.fileSize === "number" ? asset.fileSize : undefined) ?? undefined;
  const problem = videoProblem({ seconds, bytes });
  if (problem) {
    void discardFiles([uri]);
    toast.error("That video can't be used", { message: problem });
    return null;
  }
  return { uri, seconds, bytes };
}

/** One photo, taken now with the camera. */
export async function takePhoto(): Promise<string | null> {
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
  return asset ? keepPhoto(asset) : null;
}

/**
 * The short video. The camera is asked to stop by itself at `VIDEO_SECONDS`, on
 * both platforms. An iPhone records it at medium quality, which is the
 * compression; on Android the system camera app decides the quality.
 * ponytail: no compression on Android (decision T-18: it needs a native module,
 * and nothing can be run on a device in this build). The length limit and the
 * size ceiling are the bounds; add a compressor here, behind this one function.
 */
export async function recordVideo(): Promise<TakenVideo | null> {
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
  return asset ? keepVideo(asset) : null;
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
        if (asset.type === "video") {
          const video = await keepVideo(asset);
          if (video) taken = { kind: "video", file: { uri: video.uri, seconds: video.seconds, bytes: video.bytes, taken_at: stamp() } };
        } else {
          taken = { kind: "photo", file: { uri: await keepPhoto(asset), taken_at: stamp() } };
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
