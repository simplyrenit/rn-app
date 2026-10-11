import { discardFiles } from "@/backend/capture-jobs";
import { uploadCaptureFile } from "@/backend/captures";
import { takePhoto } from "@/components/capture/camera";
import { Text } from "@/components/core";
import { uploadKeeping } from "@/lib/evidence";
import { MIN_TOUCH_TARGET, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { Image } from "expo-image";
import React, { useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { PlusIcon, XMarkIcon } from "react-native-heroicons/outline";

/** A photo for a report: on this phone (`uri`), and on the bucket once it is up (`url`). */
export interface EvidencePhoto {
  uri: string;
  url: string | null;
  /** Taken for the capture a moment ago: it stays attached and cannot be removed here. */
  fixed?: boolean;
}

/**
 * Clears the photos taken for a report from the phone: after it is sent, and when
 * one is removed or replaced. A photo that belongs to a capture (`fixed`) is the
 * capture queue's to keep and clear.
 */
export function discardEvidence(photos: EvidencePhoto[]): void {
  void discardFiles(photos.filter((photo) => !photo.fixed && photo.uri.startsWith("file:")).map((photo) => photo.uri));
}

/** Puts every photo that is not up yet on the bucket and returns all the addresses, in order. */
export async function uploadEvidence(photos: EvidencePhoto[], what: string): Promise<string[]> {
  const urls: string[] = [];
  for (const photo of photos) urls.push(photo.url ?? (await uploadCaptureFile(photo.uri, "photo", what)));
  return urls;
}

/**
 * Puts every photo that is not up yet on the bucket, one at a time, going on past a
 * failure: the photos that went up keep their address in the list it returns, and
 * only the others are tried at the next press (a report's photos are never lost to
 * one bad upload).
 */
export const uploadPhotos = (photos: EvidencePhoto[], what: string) =>
  uploadKeeping(photos, (uri) => uploadCaptureFile(uri, "photo", what));

/**
 * The photos of a report, and the button that takes another. Camera only, as for
 * the capture: a report rests on what is in front of the person now.
 */
export function PhotoRow({
  photos,
  onChange,
  addLabel,
  disabled = false,
}: {
  photos: EvidencePhoto[];
  onChange: (photos: EvidencePhoto[]) => void;
  /** "Take a photo", "Add another photo". */
  addLabel: string;
  disabled?: boolean;
}) {
  const { color } = useTheme();
  const opening = useRef(false);
  const [launching, setLaunching] = useState(false);

  const add = async () => {
    if (opening.current) return;
    opening.current = true;
    setLaunching(true);
    try {
      const uri = await takePhoto();
      if (uri) onChange([...photos, { uri, url: null }]);
    } finally {
      opening.current = false;
      setLaunching(false);
    }
  };

  return (
    <View style={{ gap: space.sm }}>
      {photos.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {photos.map((photo, index) => (
            <View key={photo.uri}>
              <Image
                source={{ uri: photo.uri }}
                style={{ width: 56, height: 56, borderRadius: radius.input }}
                contentFit="cover"
                accessibilityLabel={`Photo ${index + 1}`}
              />
              {photo.fixed || disabled ? null : (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${index + 1}`}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => {
                    discardEvidence([photo]);
                    onChange(photos.filter((p) => p.uri !== photo.uri));
                  }}
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 22,
                    height: 22,
                    borderRadius: radius.full,
                    backgroundColor: color.text,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <XMarkIcon size={14} color={color.canvas} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      ) : null}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={addLabel}
        accessibilityState={{ disabled: disabled || launching }}
        disabled={disabled || launching}
        activeOpacity={0.7}
        onPress={() => void add()}
        style={{
          minHeight: MIN_TOUCH_TARGET + 4,
          borderRadius: radius.button,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: color.inputLine,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: space.sm,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <PlusIcon size={18} color={color.brandText} />
        <Text fontSize="text-md" fontWeight="font-bold" tone="brand">
          {addLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
