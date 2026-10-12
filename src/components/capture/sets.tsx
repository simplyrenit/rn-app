import { Panel } from "@/components/booking/parts";
import { Text } from "@/components/core";
import { IncludedRow, SetView, Tile } from "@/lib/capture";
import { MIN_TOUCH_TARGET, darkColors, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { Image } from "expo-image";
import React, { useState } from "react";
import { Linking, Modal, TouchableOpacity, View } from "react-native";
import { CameraIcon, PlayIcon, XMarkIcon } from "react-native-heroicons/outline";
import { CheckIcon } from "react-native-heroicons/solid";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TILE_HEIGHT = 60;

/** One photo, large, over the screen: the way to look closely at a mark or a serial number. */
export function PhotoViewer({ tile, onClose }: { tile: Tile | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={Boolean(tile)} animationType="fade" transparent onRequestClose={onClose} statusBarTranslucent>
      {/* A photo is looked at on black in both themes. */}
      <View style={{ flex: 1, backgroundColor: darkColors.canvas }}>
        {tile?.uri ? (
          <Image source={{ uri: tile.uri }} style={{ flex: 1 }} contentFit="contain" accessibilityLabel={tile.label} />
        ) : null}
        <View
          style={{
            position: "absolute",
            top: insets.top + space.sm,
            left: space.md,
            right: space.md,
            flexDirection: "row",
            alignItems: "center",
            gap: space.md,
          }}
        >
          <Text fontSize="text-md" fontWeight="font-bold" style={{ flex: 1, color: darkColors.text }} numberOfLines={1}>
            {tile?.label ?? ""}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close the photo"
            onPress={onClose}
            style={{
              width: MIN_TOUCH_TARGET,
              height: MIN_TOUCH_TARGET,
              borderRadius: radius.full,
              backgroundColor: darkColors.surfaceRaised,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <XMarkIcon size={22} color={darkColors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function PhotoTile({ tile, onOpen }: { tile: Tile; onOpen: (tile: Tile) => void }) {
  const { color } = useTheme();
  const box = { height: TILE_HEIGHT, borderRadius: radius.input, overflow: "hidden" } as const;
  return (
    <TouchableOpacity
      accessibilityRole={tile.uri ? "imagebutton" : "image"}
      accessibilityLabel={tile.uri ? `${tile.label}. Open the photo` : `${tile.label}: not taken yet`}
      disabled={!tile.uri}
      activeOpacity={0.8}
      onPress={() => onOpen(tile)}
      style={{ width: "48%", gap: 2 }}
    >
      {tile.uri ? (
        <Image source={{ uri: tile.uri }} style={box} contentFit="cover" transition={150} accessible={false} />
      ) : (
        <View style={[box, { backgroundColor: color.surfaceRaised, alignItems: "center", justifyContent: "center" }]}>
          <CameraIcon size={20} color={color.textDim} />
        </View>
      )}
      <Text fontSize="text-xs" tone="body" numberOfLines={2} style={{ textAlign: "center" }}>
        {tile.label}
      </Text>
    </TouchableOpacity>
  );
}

/** One person's set: its photos two to a row, and the video under them. */
function SetCard({ title, view, note }: { title: string; view: SetView; note?: string | null }) {
  const { color } = useTheme();
  const [open, setOpen] = useState<Tile | null>(null);
  const { video } = view;
  // No player in the app: the video plays from its address in the phone's browser.
  const play = () =>
    video.url &&
    void Linking.openURL(video.url).catch(() => toast.error("The video could not be opened"));
  return (
    <Panel style={{ flex: 1, padding: space.sm, gap: space.sm }}>
      <Text fontSize="text-sm" fontWeight="font-bold" accessibilityRole="header">
        {title}
      </Text>
      {note ? (
        <Text fontSize="text-xs" tone="body">
          {note}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space.sm }}>
        {view.shots.map((tile) => (
          <PhotoTile key={tile.key} tile={tile} onOpen={setOpen} />
        ))}
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={video.url ? `${video.label}. Play` : video.taken ? `${video.label}: uploading` : `${video.label}: not recorded yet`}
        accessibilityState={{ disabled: !video.url }}
        disabled={!video.url}
        activeOpacity={0.8}
        onPress={play}
        style={{
          minHeight: MIN_TOUCH_TARGET,
          borderRadius: radius.input,
          backgroundColor: color.surfaceRaised,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: space.xs,
        }}
      >
        <PlayIcon size={18} color={video.taken ? color.text : color.textDim} />
        <Text fontSize="text-xs" tone={video.taken ? "default" : "dim"}>
          {video.label}
        </Text>
      </TouchableOpacity>
      <PhotoViewer tile={open} onClose={() => setOpen(null)} />
    </Panel>
  );
}

export interface SetColumn {
  title: string;
  view: SetView;
  /** Under the title, when the set is not all in: "Uploading", "Not in yet". */
  note?: string | null;
}

/** BK-18 and SH-10: two sets side by side, to compare with the item in front of you. */
export function TwoSets({ left, right }: { left: SetColumn; right: SetColumn }) {
  return (
    <View style={{ flexDirection: "row", gap: space.sm, alignItems: "flex-start" }}>
      <SetCard {...left} />
      <SetCard {...right} />
    </View>
  );
}

/** "What's included": each item with its tick, and a note where the other person left it unticked. */
export function IncludedList({ rows }: { rows: IncludedRow[] }) {
  const { color } = useTheme();
  if (rows.length === 0) return null;
  return (
    <View style={{ gap: space.sm }}>
      <Text role="sectionTitle" accessibilityRole="header">
        What's included
      </Text>
      <Panel>
        {rows.map((row, index) => (
          <View
            key={row.item}
            accessible
            accessibilityLabel={`${row.item}: ${row.ticked ? "ticked" : "not ticked"}${row.note ? `. ${row.note}` : ""}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.md,
              minHeight: MIN_TOUCH_TARGET,
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: color.line,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: radius.full,
                backgroundColor: row.ticked ? color.successWash : "transparent",
                borderWidth: row.ticked ? 0 : 1.5,
                borderColor: color.inputLine,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {row.ticked ? <CheckIcon size={14} color={color.success} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text fontSize="text-md">{row.item}</Text>
              {row.note ? (
                <Text fontSize="text-xs" tone="warning">
                  {row.note}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </Panel>
    </View>
  );
}
