import { Text, usePressFeedback } from "@/components/core";
import { radius } from "@/lib/design-tokens";
import { PhotoItem } from "@/lib/list-flow/types";
import { useTheme } from "@/lib/theme";
import { Image } from "expo-image";
import React from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { ArrowPathIcon, PlusIcon } from "react-native-heroicons/outline";

interface TileProps {
  photo: PhotoItem;
  index: number;
  size: number;
  isCover: boolean;
  /** L-12b: "Stock photo?", "Screenshot?", "Already listed?" on a purple tag. */
  warningTag?: string | null;
  onLongPress: () => void;
  onRetry: () => void;
}

/**
 * One photo on L-12. Shows its own upload state — a spinner while it uploads,
 * a retry target once the automatic retry has failed (§7.3) — so a slow photo
 * never holds up the others.
 */
export function PhotoTile({ photo, index, size, isCover, warningTag, onLongPress, onRetry }: TileProps) {
  const { color } = useTheme();
  const feedback = usePressFeedback();
  const failed = photo.status === "failed";
  const uploading = photo.status === "uploading";

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={feedback.onPressIn}
      onPressOut={feedback.onPressOut}
      onPress={failed ? onRetry : undefined}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={`Photo ${index + 1}${isCover ? ", cover" : ""}${
        failed ? ", upload failed" : uploading ? ", uploading" : ""
      }${warningTag ? `, ${warningTag}` : ""}`}
      accessibilityHint={
        failed ? "Tap to retry the upload" : "Long-press to set as cover or remove"
      }
      accessibilityActions={[
        { name: "longpress", label: "Set as cover or remove" },
        ...(failed ? [{ name: "activate", label: "Retry upload" }] : []),
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "longpress") onLongPress();
        if (event.nativeEvent.actionName === "activate" && failed) onRetry();
      }}
      style={[{ width: size, height: size }, feedback.pressStyle]}
    >
      <Image
        source={{ uri: photo.remoteUrl ?? photo.localUri }}
        style={{ width: size, height: size, borderRadius: radius.input, backgroundColor: color.skeleton }}
        contentFit="cover"
        transition={150}
      />

      {uploading || failed ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: radius.input,
            backgroundColor: failed ? color.photoScrim : color.photoScrimSoft,
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          {failed ? (
            <>
              <ArrowPathIcon size={22} color={color.onPhoto} />
              <Text fontSize="text-xs" fontWeight="font-bold" tone="onPhoto">
                Tap to retry
              </Text>
            </>
          ) : (
            <ActivityIndicator color={color.onPhoto} />
          )}
        </View>
      ) : null}

      {warningTag ? (
        <View
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            right: 6,
            alignItems: "flex-start",
          }}
        >
          <View
            style={{
              backgroundColor: color.brand,
              borderRadius: radius.full,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text fontSize="text-xs" fontWeight="font-bold" tone="onBrand" numberOfLines={1}>
              {warningTag}
            </Text>
          </View>
        </View>
      ) : null}

      {isCover ? (
        <View
          style={{
            position: "absolute",
            left: 6,
            bottom: 6,
            backgroundColor: color.photoScrim,
            borderRadius: radius.full,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text fontSize="text-xs" fontWeight="font-bold" tone="onPhoto">
            Cover
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

/** The "Add more · up to 5" tile. */
export function AddPhotoTile({ size, label, onPress }: { size: number; label: string; onPress: () => void }) {
  const { color } = useTheme();
  const feedback = usePressFeedback();
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={feedback.onPressIn}
      onPressOut={feedback.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.input,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: color.inputLine,
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          paddingHorizontal: 8,
        },
        feedback.pressStyle,
      ]}
    >
      <PlusIcon size={24} color={color.textDim} />
      <Text fontSize="text-xs" tone="dim" style={{ textAlign: "center" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
