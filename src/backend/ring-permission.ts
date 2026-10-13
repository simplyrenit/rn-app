import { registerDeviceSession } from "@/backend/notifications";
import { RingPermission, ringPermission } from "@/lib/ring-permission";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking } from "react-native";

/** The shop's own flow asks for notifications once; after that it only says so, and sends to the settings. */
const ASKED_KEY = "renit-ring-permission-asked";

async function readPermission(): Promise<RingPermission | null> {
  try {
    return ringPermission(await Notifications.getPermissionsAsync(), Device.isDevice);
  } catch {
    return null;
  }
}

/**
 * Whether this phone can ring, for the shop's screens (review round 1, finding 2).
 * It reads the system's answer when the screen opens and every time the app comes
 * back to the front (the owner may have changed it in the settings), and registers
 * the push token the moment it is granted, so the server can ring this phone at
 * once. Asking does not depend on chat: that was the only other place the app asked,
 * and chat is off.
 */
export function useRingPermission() {
  const [state, setState] = useState<RingPermission | null>(null);
  const previous = useRef<RingPermission | null>(null);

  const refresh = useCallback(async () => {
    const next = await readPermission();
    setState(next);
    // Allowed just now (here, or in the settings): tell the server which token to ring.
    if (next === "granted" && previous.current && previous.current !== "granted") void registerDeviceSession();
    previous.current = next;
  }, []);

  useEffect(() => {
    void refresh();
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  /** The system's own prompt. It only shows when the system will still ask. */
  const ask = useCallback(async () => {
    try {
      await Notifications.requestPermissionsAsync();
    } catch {
      // Read below: the state is what the system says now.
    }
    await refresh();
  }, [refresh]);

  /** The first time an owner reaches the shop's screens, with the reason on screen beside it. */
  const askOnce = useCallback(async () => {
    try {
      if (await AsyncStorage.getItem(ASKED_KEY)) return;
      await AsyncStorage.setItem(ASKED_KEY, "1");
    } catch {
      // Without storage it asks each time the screen opens, which the system limits itself.
    }
    await ask();
  }, [ask]);

  const openSettings = useCallback(() => void Linking.openSettings().catch(() => undefined), []);

  return { state, ask, askOnce, openSettings };
}

export type RingPermissionControl = ReturnType<typeof useRingPermission>;
