import { Notice, TextButton } from "@/components/booking/parts";
import { useAppActive } from "@/components/booking/use-app-active";
import { space } from "@/lib/design-tokens";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect } from "react";
import { Linking, View } from "react-native";

/**
 * True when the person has switched the camera off for Renit. A camera that has not been asked for yet is not off: the
 * system asks at the first shot. Settings is where it is switched back on, so the answer is looked at again each time
 * the app comes back to the front.
 */
export function useCameraOff(): boolean {
  const [permission, , refresh] = ImagePicker.useCameraPermissions();
  const active = useAppActive();
  useEffect(() => {
    if (active) void refresh();
  }, [active, refresh]);
  return permission?.status === "denied";
}

/**
 * Said up front on the screens that cannot go on without the camera (the record at handover and return, the photo of a
 * report), with the way to Settings, so nobody finds out only by tapping the shutter (D-25). Draws nothing while the
 * camera is on.
 */
export function CameraOffNotice({ children }: { children: string }) {
  const off = useCameraOff();
  if (!off) return null;
  return (
    <View style={{ gap: space.xs }}>
      <Notice tone="warning" icon="warning">
        {children}
      </Notice>
      <TextButton label="Open Settings" onPress={() => void Linking.openSettings()} />
    </View>
  );
}
