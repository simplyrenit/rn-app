import { Text } from "@/components/core";
import { PhotoViewer } from "@/components/capture/sets";
import { Tile } from "@/lib/capture";
import { isVideoUrl } from "@/lib/claims";
import { MIN_TOUCH_TARGET, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { Image } from "expo-image";
import React, { useState } from "react";
import { Linking, TouchableOpacity, View } from "react-native";
import { PlayIcon } from "react-native-heroicons/outline";

const THUMB = 72;

/**
 * The photos and videos a claim or a reply carries, as the server lists them. A
 * photo opens large over the screen; a video plays from its address in the phone's
 * browser, as the handover's does (the app has no player).
 */
export function EvidenceStrip({ urls, label }: { urls: string[]; label: string }) {
  const { color } = useTheme();
  const [open, setOpen] = useState<Tile | null>(null);
  if (urls.length === 0) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
      {urls.map((url, index) => {
        const name = `${label} ${index + 1}`;
        return isVideoUrl(url) ? (
          <TouchableOpacity
            key={url}
            accessibilityRole="button"
            accessibilityLabel={`${name}, video. Play`}
            activeOpacity={0.8}
            onPress={() => void Linking.openURL(url).catch(() => toast.error("The video could not be opened"))}
            style={{
              width: THUMB,
              height: THUMB,
              minHeight: MIN_TOUCH_TARGET,
              borderRadius: radius.input,
              backgroundColor: color.surfaceRaised,
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <PlayIcon size={20} color={color.text} />
            <Text fontSize="text-xs" tone="body">
              Video
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            key={url}
            accessibilityRole="imagebutton"
            accessibilityLabel={`${name}. Open the photo`}
            activeOpacity={0.8}
            onPress={() => setOpen({ key: url, label: name, uri: url })}
          >
            <Image source={{ uri: url, cacheKey: url.split("?")[0] }} style={{ width: THUMB, height: THUMB, borderRadius: radius.input }} contentFit="cover" transition={150} accessible={false} />
          </TouchableOpacity>
        );
      })}
      <PhotoViewer tile={open} onClose={() => setOpen(null)} />
    </View>
  );
}
