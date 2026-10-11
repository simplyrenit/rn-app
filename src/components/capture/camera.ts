import { keepFile } from "@/backend/capture-jobs";
import { prepareImage } from "@/backend/list-flow/images";
import { permissionDenied } from "@/components/list-flow/pick-photos";
import { VIDEO_SECONDS } from "@/lib/capture";
import { toast } from "@/lib/toast";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

/**
 * The camera for a capture, and only the camera: the gallery is never offered,
 * so nobody can pass off an old photo (booking plan, "Camera only, inside the
 * app"). It is the system camera, opened through the picker the app already has;
 * there is no camera module in the app.
 *
 * Both calls resolve to null when nothing was taken (the person backed out, the
 * permission is off, the camera would not open), having said why.
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

/** One photo, resized once for upload and moved to where it is kept until the server has it. */
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
  if (!asset) return null;
  try {
    return await keepFile(await prepareImage(asset.uri, { width: asset.width, height: asset.height }));
  } catch {
    // The resize failed (a format the phone could not re-encode): the photo is kept as it was taken.
    return keepFile(asset.uri);
  }
}

/**
 * The short video. The camera stops by itself at `VIDEO_SECONDS`. An iPhone
 * records it at medium quality, which is the compression; on Android the system
 * camera app decides the quality.
 * ponytail: no compression on Android (it needs a native module the app does
 * not have); a 20-second clip there can be tens of megabytes. Add one if uploads
 * prove too slow in the field.
 */
export async function recordVideo(): Promise<{ uri: string; seconds: number } | null> {
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
  if (!asset) return null;
  // The picker gives the length in milliseconds.
  const seconds = Math.min(Math.round((asset.duration ?? 0) / 1000), VIDEO_SECONDS);
  return { uri: await keepFile(asset.uri), seconds };
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
