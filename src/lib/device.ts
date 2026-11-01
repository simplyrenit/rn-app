import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { uuidv4 } from "./uuid";

/**
 * What every sign-in tells the server about this phone (API-CONTRACT OE-B, the
 * login change): the server keeps a session per device, lists them under "Signed-in
 * devices", and refuses a booking between two accounts that share a device id.
 */
export interface DeviceInfo {
  /** Made once on this install and kept. At most 64 characters. */
  device_id: string;
  /** "iPhone 15". At most 100 characters. */
  device_name: string;
  platform: "ios" | "android";
}

export const DEVICE_ID_KEY = "renit-device-id";

interface DeviceFacts {
  id: string;
  modelName?: string | null;
  deviceName?: string | null;
  os: string;
}

/** The three fields, inside the server's limits. */
export function makeDeviceInfo({ id, modelName, deviceName, os }: DeviceFacts): DeviceInfo {
  const platform = os === "ios" ? "ios" : "android";
  const name = modelName?.trim() || deviceName?.trim() || (platform === "ios" ? "iPhone" : "Android phone");
  return { device_id: id.slice(0, 64), device_name: name.slice(0, 100), platform };
}

/**
 * The body of `POST /api/register-push-token/`: the device fields always, and the
 * push token when the phone has one. A phone with notifications off has none, and
 * the call is still made without it (API-CONTRACT, register-push-token), so its
 * session is filled all the same.
 *
 * With the app's version too, at every signed-in start (ENG-323): the server keeps
 * it per session for the cart's gate, which lets a shop take baskets only once every
 * phone of its owner reports at least `CART_MIN_OWNER_APP` (cart plan §9.2). Both
 * platforms say 2.0.0 since ENG-338: Android's `versionName`, and iOS's literal
 * `CFBundleShortVersionString` in Info.plist. iOS said 2.0.0 well before the owner's
 * basket screens, so a 2.0.0 gate tells builds apart only because a build from before
 * this function sent a version sends none, which the server counts as old. A higher
 * gate needs both platforms bumped to match. The server ignores a version that is not
 * digits and dots, so it is sent as the store has it.
 */
export function sessionBody(
  token: string | null | undefined,
  info: DeviceInfo,
  appVersion: string | null = Application.nativeApplicationVersion
) {
  return {
    ...(token ? { expo_push_token: token } : {}),
    ...info,
    ...(appVersion ? { app_version: appVersion } : {}),
  };
}

let cached: Promise<DeviceInfo> | null = null;
let madeThisRun = false;

/** True once `getDeviceInfo` has made this phone's id on this run: a new install (ENG-344). */
export function deviceIdMadeThisRun() {
  return madeThisRun;
}

async function readOrMakeId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored && stored.length <= 64) return stored;
  } catch {
    // Unreadable storage costs only the stability of the id, never the sign-in.
  }
  const made = uuidv4();
  madeThisRun = true;
  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, made);
  } catch {
    // As above.
  }
  return made;
}

/** This phone's id, name and platform, read once per run. Never throws. */
export function getDeviceInfo(): Promise<DeviceInfo> {
  cached ??= readOrMakeId().then((id) =>
    makeDeviceInfo({ id, modelName: Device.modelName, deviceName: Device.deviceName, os: Platform.OS })
  );
  return cached;
}
