import { Skeleton, StatusPill, Text } from "@/components/core";
import { SavedAddress, addressLine, addressTitle } from "@/lib/addresses";
import { density, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { CheckCircleIcon } from "react-native-heroicons/solid";
import { BriefcaseIcon, HomeIcon, MapPinIcon } from "react-native-heroicons/outline";

const TYPE_ICON = { home: HomeIcon, work: BriefcaseIcon, other: MapPinIcon } as const;
const ICON_DISC = 36;
// The list row's type disc (2097:28843); the skeleton and the other rows keep 36.
const LIST_DISC = 40;
// The picker row (2089:32313).
const PICKER_ROW = 72;
const PICKER_ICON = 24;

interface Props {
  address: SavedAddress;
  /** The first row of a group draws no rule above itself. */
  first: boolean;
  onPress: () => void;
  /**
   * `chevron` opens the address (the list); `radio` picks it (the picker
   * sheet); `change` is the address in use on a form, with a "Change" action.
   */
  trailing?: "chevron" | "radio" | "change";
  /** With `radio`: this is the one in use. */
  selected?: boolean;
  /** The address line to show instead of the list's own. */
  line?: string;
}

/** One saved address: type icon, title, "Default" tag and its address line. */
export function AddressRow({
  address,
  first,
  onPress,
  trailing = "chevron",
  selected = false,
  line = addressLine(address),
}: Props) {
  const { color } = useTheme();
  const Icon = TYPE_ICON[address.address_type] ?? MapPinIcon;
  const title = addressTitle(address);
  const picks = trailing === "radio";
  // In use on a form: the whole address is read, not scanned, and whether it
  // is the default says nothing about this listing.
  const inUse = trailing === "change";

  // The picker (address-picker-sheet · Saved addresses, 2089:32313): a 72pt row
  // on the sheet's gutter with no rule between rows, a bare MapPin 24 whatever
  // the type, the title 16/24 Medium over the line 14/20 dim (two lines at
  // most), no Default tag, and a solid brand tick on the chosen row only.
  if (picks) {
    return (
      <TouchableOpacity
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${title}${address.is_default ? ", default" : ""}. ${line}`}
        activeOpacity={0.6}
        onPress={onPress}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: PICKER_ROW, paddingVertical: 4 }}
      >
        <MapPinIcon size={PICKER_ICON} color={color.textDim} strokeWidth={1.5} />
        <View style={{ flex: 1 }}>
          <Text fontSize="text-md" fontWeight="font-medium" numberOfLines={1}>
            {title}
          </Text>
          {line ? (
            <Text fontSize="text-sm" tone="dim" numberOfLines={2}>
              {line}
            </Text>
          ) : null}
        </View>
        {selected ? <CheckCircleIcon size={PICKER_ICON} color={color.brand} /> : null}
      </TouchableOpacity>
    );
  }

  // The list (saved-addresses · list, 2097:28843). The form's `change` row
  // below keeps its own look until its story (ENG-429) restyles it.
  if (trailing === "chevron") {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${title}${address.is_default ? ", default" : ""}. ${line}`}
        accessibilityHint="Opens this address to edit it"
        activeOpacity={0.6}
        onPress={onPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 16,
          borderTopWidth: first ? 0 : 1,
          borderTopColor: color.line,
        }}
      >
        <View
          style={{
            width: LIST_DISC,
            height: LIST_DISC,
            borderRadius: radius.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: color.surfaceMuted,
          }}
        >
          <Icon size={20} color={color.text} strokeWidth={1.5} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text fontSize="text-md" fontWeight="font-semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
              {title}
            </Text>
            {address.is_default ? <StatusPill tone="neutral" label="Default" /> : null}
          </View>
          {line ? (
            <Text fontSize="text-sm" tone="body" numberOfLines={3}>
              {line}
            </Text>
          ) : null}
        </View>
        <ChevronRightIcon size={20} color={color.textDim} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${title}${address.is_default && !inUse ? ", default" : ""}. ${line}${inUse ? ". Change" : ""}`}
      accessibilityHint={inUse ? "Opens your addresses to choose another" : "Opens this address to edit it"}
      activeOpacity={0.6}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        minHeight: density.rowStacked,
        paddingVertical: space.sm,
        paddingHorizontal: space.md,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: color.line,
      }}
    >
      <View
        style={{
          width: ICON_DISC,
          height: ICON_DISC,
          borderRadius: radius.full,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: color.surfaceRaised,
        }}
      >
        <Icon size={20} color={color.text} strokeWidth={1.5} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <Text fontSize="text-md" fontWeight="font-bold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </Text>
          {address.is_default && !inUse ? (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 1,
                borderRadius: radius.full,
                backgroundColor: color.brandWash,
              }}
            >
              <Text fontSize="text-xs" fontWeight="font-bold" tone="brand">
                Default
              </Text>
            </View>
          ) : null}
        </View>
        {line ? (
          // In use, the whole line shows: capped at two lines, a long flat
          // line cut off the locality on a 360 dp phone.
          <Text fontSize="text-sm" tone="body" numberOfLines={inUse ? undefined : 1}>
            {line}
          </Text>
        ) : null}
      </View>
      {inUse ? (
        <Text fontSize="text-sm" fontWeight="font-bold" tone="brand">
          Change
        </Text>
      ) : (
        <ChevronRightIcon size={20} color={color.text} />
      )}
    </TouchableOpacity>
  );
}

/** The same row while the addresses load; `picks` is the picker's radio row. */
export function AddressRowSkeleton({ first, picks = false }: { first: boolean; picks?: boolean }) {
  const { color } = useTheme();
  return (
    <View
      style={
        picks
          ? { flexDirection: "row", alignItems: "center", gap: 12, minHeight: PICKER_ROW }
          : {
              flexDirection: "row",
              alignItems: "center",
              gap: space.md,
              minHeight: density.rowStacked,
              paddingHorizontal: space.md,
              borderTopWidth: first ? 0 : 1,
              borderTopColor: color.line,
            }
      }
    >
      <Skeleton
        width={picks ? PICKER_ICON : ICON_DISC}
        height={picks ? PICKER_ICON : ICON_DISC}
        borderRadius={picks ? 4 : radius.full}
      />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="35%" height={14} borderRadius={4} />
        <Skeleton width="80%" height={12} borderRadius={4} />
      </View>
    </View>
  );
}
