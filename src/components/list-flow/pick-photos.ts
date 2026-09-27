import { PickedPhoto } from "@/context/list-draft-context";
import { errorFeedback } from "@/lib/haptics";
import { PhotoSource } from "@/lib/list-flow/types";
import * as ImagePicker from "expo-image-picker";
import { Linking } from "react-native";
import Toast from "react-native-toast-message";

/**
 * A denied permission is a dead end unless we say where to fix it (§8.2). The
 * app's `toast` helper has no action slot, so this shows the same toast body
 * directly and makes the toast itself the "Open Settings" action.
 */
function permissionDenied(what: string) {
  errorFeedback();
  Toast.show({
    type: "customToast",
    position: "bottom",
    text1: `${what} access is off`,
    text2: "Tap to open Settings and allow it.",
    props: { severity: "error" },
    onPress: () => {
      Toast.hide();
      void Linking.openSettings();
    },
  });
}

/**
 * Camera or library, at full quality — compression happens once, in
 * `prepareImage`, before upload (§8.2). Resolves to [] when the owner cancels.
 */
export async function pickPhotos(source: PhotoSource, limit: number): Promise<PickedPhoto[]> {
  if (limit <= 0) return [];

  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") {
      permissionDenied("Camera");
      return [];
    }
    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 1 });
    } catch {
      // launchCameraAsync rejects when no camera is available (the iOS
      // simulator; a camera held by another app). Unhandled, that made
      // "Retake the label photo" do nothing at all — fall back to the library
      // so the owner still has a way forward.
      return pickPhotos("gallery", limit);
    }
    if (result.canceled) return [];
    return (result.assets ?? []).slice(0, 1).map((asset) => ({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      source: "camera",
    }));
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== "granted") {
    permissionDenied("Photo library");
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 1,
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
  });
  if (result.canceled) return [];
  return (result.assets ?? []).slice(0, limit).map((asset) => ({
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    source: "gallery",
  }));
}
