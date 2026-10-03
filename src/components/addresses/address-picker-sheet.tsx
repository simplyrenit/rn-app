import { localityFor } from "@/backend/list-flow/pickup-location";
import useAddresses, { useAddAddress } from "@/backend/useAddresses";
import { Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { MAX_ADDRESSES, PickedAddress, SavedAddress } from "@/lib/addresses";
import { SCREEN_GUTTER, density, radius, space } from "@/lib/design-tokens";
import { createLocationRequest } from "@/lib/location-request";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Location from "expo-location";
import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { PlusIcon, ViewfinderCircleIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AddressRow, AddressRowSkeleton } from "./address-row";

export interface AddressPickerSheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface Props {
  /** The point in use now; its row carries the tick. Without a match, the default does. */
  selected?: { lat: number; long: number };
  onPick: (picked: PickedAddress) => void;
  title?: string;
  description?: string;
}

/** Saved coordinates come back through a float round trip; ~0.1 m is "the same point". */
const samePoint = (a: number, b: number) => Math.abs(a - b) < 1e-6;

function ActionRow({
  icon,
  label,
  sub,
  first,
  disabled,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  first: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${sub}`}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
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
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text fontSize="text-md" fontWeight="font-bold" tone="brand">
          {label}
        </Text>
        <Text fontSize="text-sm" tone="body">
          {sub}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * L-14a (ENG-25 §8.6): pick a saved address, a one-off spot on the map, or add
 * a new one. Tapping picks; there is no confirm button.
 *
 * Knows nothing about listings, so anything that needs an address can use it.
 * Every hook runs out here rather than in the sheet's content: the sheet is
 * drawn by a portal mounted above the navigator, where there is no navigation
 * context to read.
 */
export const AddressPickerSheet = forwardRef<AddressPickerSheetHandle, Props>(
  (
    {
      selected,
      onPick,
      title = "Pickup location",
      description = "Renters see only your area until they book.",
    },
    ref
  ) => {
    const navigation = useTypedNavigation();
    const { color, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { addresses, loading, isError, refetch } = useAddresses();
    const sheet = useRef<BottomSheetModal>(null);
    const [locationOff, setLocationOff] = useState(false);

    // The map and the add flow answer screens later; they must reach the
    // consumer's current `onPick`, not the one from the render that opened them.
    const onPickRef = useRef(onPick);
    onPickRef.current = onPick;

    useImperativeHandle(
      ref,
      () => ({
        present: () => {
          // Read only, never a prompt: the row's sub-line says what the map
          // will be able to do, and the map itself offers "Turn on".
          Location.getForegroundPermissionsAsync()
            .then(({ status }) => setLocationOff(status !== "granted"))
            .catch(() => {});
          sheet.current?.present();
        },
        dismiss: () => sheet.current?.dismiss(),
      }),
      []
    );

    const pickSaved = useCallback(async (saved: SavedAddress) => {
      sheet.current?.dismiss();
      const { lat, long } = saved.coordinates;
      // A row from before the `locality` column existed comes back blank.
      const locality = saved.locality || (await localityFor(lat, long)) || "";
      onPickRef.current({
        lat,
        long,
        locality,
        addressLine1: saved.address_line_1,
        addressLine2: saved.address_line_2,
        saved,
      });
    }, []);

    const addAddress = useAddAddress(pickSaved);

    // Closed before either flow navigates: the sheet lives above the
    // navigator and would otherwise sit on top of the map.
    const pickOnMap = () => {
      sheet.current?.dismiss();
      navigation.navigate("LocationModal", {
        requestId: createLocationRequest(async (coords) => {
          if (!coords) return;
          // Never the map's own address line: it is street-level, and a
          // consumer may publish the locality.
          const locality = (await localityFor(coords.latitude, coords.longitude)) ?? "";
          onPickRef.current({
            lat: coords.latitude,
            long: coords.longitude,
            locality,
            addressLine1: "",
            addressLine2: "",
          });
        }),
      });
    };

    const addNew = () => {
      sheet.current?.dismiss();
      addAddress();
    };

    const selectedId =
      (selected &&
        addresses.find(
          (a) => samePoint(a.coordinates.lat, selected.lat) && samePoint(a.coordinates.long, selected.long)
        )?.id) ??
      addresses.find((a) => a.is_default)?.id;
    const full = addresses.length >= MAX_ADDRESSES;

    const card = {
      borderWidth: 1,
      borderColor: color.line,
      borderRadius: radius.card,
      backgroundColor: color.surface,
      overflow: "hidden",
    } as const;

    return (
      <CustomBottomSheetModal ref={sheet} isDark={isDark} snapPoints={["65%"]} frame>
        <View
          style={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: space.sm,
            paddingBottom: insets.bottom + space.md,
            gap: space.md,
          }}
        >
          <View style={{ gap: space.xs }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <Text role="sectionTitle" accessibilityRole="header" style={{ flex: 1 }}>
                {title}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={() => sheet.current?.dismiss()}
              >
                <Text fontSize="text-md" fontWeight="font-bold" tone="brand">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
            <Text fontSize="text-sm" tone="body">
              {description}
            </Text>
          </View>

          {loading ? (
            <View
              style={card}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Loading your addresses"
              accessibilityState={{ busy: true }}
            >
              <AddressRowSkeleton first />
              <AddressRowSkeleton first={false} />
            </View>
          ) : isError ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <Text fontSize="text-sm" tone="body" style={{ flexShrink: 1 }}>
                Couldn't load your addresses.
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={() => void refetch()}
              >
                <Text fontSize="text-sm" fontWeight="font-bold" tone="brand">
                  Try again
                </Text>
              </TouchableOpacity>
            </View>
          ) : addresses.length === 0 ? (
            <View
              style={{
                padding: space.md,
                borderRadius: radius.group,
                backgroundColor: color.surfaceRaised,
              }}
            >
              <Text fontSize="text-md" fontWeight="font-bold">
                No saved addresses yet
              </Text>
              <Text fontSize="text-sm" tone="body">
                Add one to pick it in one tap next time.
              </Text>
            </View>
          ) : (
            <View style={card} accessibilityRole="radiogroup">
              {addresses.map((address, index) => (
                <AddressRow
                  key={address.id}
                  address={address}
                  first={index === 0}
                  trailing="radio"
                  selected={address.id === selectedId}
                  onPress={() => void pickSaved(address)}
                />
              ))}
            </View>
          )}

          <View style={card}>
            <ActionRow
              first
              icon={<ViewfinderCircleIcon size={24} color={color.brandText} />}
              label="Use current location"
              sub={locationOff ? "Location is off · choose on the map" : "Pick the spot on the map"}
              onPress={pickOnMap}
            />
            <ActionRow
              first={false}
              icon={<PlusIcon size={24} color={color.brandText} />}
              label="Add new address"
              sub={full ? "You can save up to 20 addresses." : "Save a place to reuse it"}
              disabled={full}
              onPress={addNew}
            />
          </View>
        </View>
      </CustomBottomSheetModal>
    );
  }
);
