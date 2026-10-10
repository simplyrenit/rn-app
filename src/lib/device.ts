import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { ACCESS_DEVICES_ENDPOINT } from "./config";
import axiosInstance from "./networkUtils";
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

let cached: Promise<DeviceInfo> | null = null;

async function readOrMakeId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored && stored.length <= 64) return stored;
  } catch {
    // Unreadable storage costs only the stability of the id, never the sign-in.
  }
  const made = uuidv4();
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

/**
 * Ends this phone's session on the server when the person signs out, so it stops
 * ringing and drops off "Signed-in devices" (`POST /api/access/devices/current/sign-out/`;
 * API-CONTRACT OE-B). Never needs a fresh code, never throws and never holds the
 * sign-out up for long: offline, or with a session the server has already ended,
 * the phone signs out all the same and the server's own 90-day rule tidies up.
 *
 * `validateStatus` keeps a 401 from reaching the client's refresh-and-retry, which
 * would try to refresh a session that is being closed.
 */
export async function signOutCurrentDevice(): Promise<void> {
  try {
    await axiosInstance.post(
      `${ACCESS_DEVICES_ENDPOINT}current/sign-out/`,
      {},
      { timeout: 3000, validateStatus: () => true }
    );
  } catch {
    // As above: signing out of the phone must not depend on the network.
  }
}
