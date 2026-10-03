import { Skeleton, Text } from "@/components/core";
import { SavedAddress, addressLine, addressTitle } from "@/lib/addresses";
import { density, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { BriefcaseIcon, HomeIcon, MapPinIcon } from "react-native-heroicons/outline";

const TYPE_ICON = { home: HomeIcon, work: BriefcaseIcon, other: MapPinIcon } as const;
const ICON_DISC = 36;
const RADIO = 20;

interface Props {
  address: SavedAddress;
  /** The first row of a group draws no rule above itself. */
  first: boolean;
  onPress: () => void;
  /** `chevron` opens the address (the list); `radio` picks it (the picker sheet). */
  trailing?: "chevron" | "radio";
  /** With `radio`: this is the one in use. */
  selected?: boolean;
}

/** One saved address: type icon, title, "Default" tag, one-line address. */
export function AddressRow({ address, first, onPress, trailing = "chevron", selected = false }: Props) {
  const { color } = useTheme();
  const Icon = TYPE_ICON[address.address_type] ?? MapPinIcon;
  const title = addressTitle(address);
  const line = addressLine(address);
  const picks = trailing === "radio";

  return (
    <TouchableOpacity
      accessibilityRole={picks ? "radio" : "button"}
      accessibilityState={picks ? { selected } : undefined}
      accessibilityLabel={`${title}${address.is_default ? ", default" : ""}. ${line}`}
      accessibilityHint={picks ? undefined : "Opens this address to edit it"}
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
          {address.is_default ? (
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
          <Text fontSize="text-sm" tone="body" numberOfLines={1}>
            {line}
          </Text>
        ) : null}
      </View>
      {picks ? (
        <View
          style={{
            width: RADIO,
            height: RADIO,
            borderRadius: radius.full,
            borderWidth: 1.5,
            borderColor: selected ? color.brand : color.inputLine,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {selected ? (
            <View
              style={{
                width: RADIO / 2,
                height: RADIO / 2,
                borderRadius: radius.full,
                backgroundColor: color.brand,
              }}
            />
          ) : null}
        </View>
      ) : (
        <ChevronRightIcon size={20} color={color.text} />
      )}
    </TouchableOpacity>
  );
}

/** The same row while the addresses load. */
export function AddressRowSkeleton({ first }: { first: boolean }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        minHeight: density.rowStacked,
        paddingHorizontal: space.md,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: color.line,
      }}
    >
      <Skeleton width={ICON_DISC} height={ICON_DISC} borderRadius={radius.full} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="35%" height={14} borderRadius={4} />
        <Skeleton width="80%" height={12} borderRadius={4} />
      </View>
    </View>
  );
}
