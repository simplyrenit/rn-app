import { AddressRow } from "@/components/addresses/address-row";
import { FieldLabel, FieldShell, Text, usePressFeedback } from "@/components/core";
import { CheckBox } from "@/components/core/checkbox";
import {
  ADDRESS_TYPES,
  AddressType,
  SavedAddress,
  addressAtPoint,
  addressTitle,
  flatAndLandmark,
  showsSaveOffer,
  takenTypes,
} from "@/lib/addresses";
import { density, fontFamily, fontSize, radius, space } from "@/lib/design-tokens";
import type { LocationValue } from "@/lib/list-flow/types";
import { useTheme } from "@/lib/theme";
import React, { useEffect, useState } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { MapPinIcon } from "react-native-heroicons/outline";

// The checkbox draws its 22 pt box inside a 44 pt target pulled 12 pt left, so
// the label beside it starts here. The chips line up under the label.
const CHECK_LABEL_INSET = 32;

interface Props {
  location: LocationValue | null;
  addresses: SavedAddress[];
  /** The address list has loaded. Without it there is nothing to save against. */
  addressesKnown: boolean;
  /**
   * The list has loaded, failed, or been waited for long enough. Until then
   * a pickup that may turn out to be a saved address is not given a flat
   * field, which would be swapped for the card under the owner's finger.
   */
  addressesSettled: boolean;
  /** The type the owner chose to save this spot as, if they did. */
  saveAs: AddressType | null;
  /** Open the address sheet, or the map for an owner with nothing saved. */
  onChange: () => void;
  onChangeFlat: (text: string) => void;
  onSaveAs: (type: AddressType | null) => void;
}

/** The flat, building and landmark line, on the shared field surface. */
function FlatInput({ value, onChangeText }: { value: string; onChangeText: (v: string) => void }) {
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <FieldShell focused={focused} style={{ marginTop: space.sm }}>
      <TextInput
        accessibilityLabel="Flat, building and landmark"
        placeholder="Flat, building and landmark"
        placeholderTextColor={color.placeholder}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ flex: 1, color: color.text, fontFamily: fontFamily.regular, fontSize: fontSize.md }}
      />
    </FieldShell>
  );
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.6}
      // A 21 pt line; this brings the target past 44.
      hitSlop={{ top: 12, bottom: 12 }}
      onPress={onPress}
      style={{ alignSelf: "flex-start", marginTop: space.sm }}
    >
      <Text fontSize="text-sm" fontWeight="font-bold" tone="brand">
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * The pickup address on the listing Review screen (ENG-25 §8.7, §8.8), as one
 * block. It used to be three controls — a locality row, a separately labelled
 * flat field and a grey "save this address" card — which read as unrelated,
 * and a picked saved address showed as a bare locality with its flat line in
 * an editable box.
 *
 * A saved address is a card naming it. Its flat line can be changed for this
 * listing only; the saved address is never written from here. Any other spot
 * is the locality row, the flat line under it, and the offer to save it.
 */
export function PickupField({
  location,
  addresses,
  addressesKnown,
  addressesSettled,
  saveAs,
  onChange,
  onChangeFlat,
  onSaveAs,
}: Props) {
  const { color } = useTheme();
  const feedback = usePressFeedback();
  const saved = location ? addressAtPoint(addresses, location, location.fullAddress) : undefined;
  const savedFlat = saved ? flatAndLandmark(saved) : "";
  const area = location?.locality || saved?.locality || "";

  // "Edit … for this listing" opens the field before anything differs.
  const [editingFlat, setEditingFlat] = useState(false);
  useEffect(() => setEditingFlat(false), [saved?.id]);
  const editing = Boolean(saved) && (editingFlat || location?.fullAddress !== savedFlat);

  const taken = takenTypes(addresses);
  const offerSave = showsSaveOffer(location, addresses, addressesKnown);

  return (
    <View style={{ marginBottom: density.fieldGap }}>
      <FieldLabel label="Pickup" required hint="Renters see only your area until they book." />

      {saved ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: color.line,
            borderRadius: radius.card,
            backgroundColor: color.surface,
            overflow: "hidden",
          }}
        >
          <AddressRow
            address={saved}
            first
            trailing="change"
            onPress={() => {
              // An edit that changed nothing closes; re-picking this address
              // would otherwise leave the field open on identical text.
              setEditingFlat(false);
              onChange();
            }}
            // While the flat line is being changed below, it is not repeated
            // here. The draft's locality, not the row's: a row from before
            // the column existed has none, and the listing publishes this one.
            line={editing ? area : [savedFlat, area].filter(Boolean).join(" · ")}
          />
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={1}
          onPress={onChange}
          onPressIn={feedback.onPressIn}
          onPressOut={feedback.onPressOut}
          accessibilityRole="button"
          accessibilityLabel={
            location?.locality ? `Pickup location, ${location.locality}. Change` : "Set pickup location"
          }
          style={feedback.pressStyle}
        >
          <FieldShell>
            <MapPinIcon size={20} color={location ? color.text : color.textDim} />
            <Text fontSize="text-md" tone={location?.locality ? "default" : "dim"} numberOfLines={1} style={{ flex: 1 }}>
              {location?.locality || "Set pickup location"}
            </Text>
            {location ? (
              <Text fontSize="text-sm" fontWeight="font-bold" tone="brand">
                Change
              </Text>
            ) : (
              <ChevronRightIcon size={20} color={color.textDim} />
            )}
          </FieldShell>
        </TouchableOpacity>
      )}

      {saved && !editing ? (
        <Link label="Edit flat or landmark for this listing" onPress={() => setEditingFlat(true)} />
      ) : null}

      {location && addressesSettled && (!saved || editing) ? (
        <FlatInput
          value={location.fullAddress}
          onChangeText={(text) => {
            // Typing keeps the field open: deleting back to the saved text
            // must not unmount it mid-keystroke.
            if (saved) setEditingFlat(true);
            onChangeFlat(text);
          }}
        />
      ) : null}

      {saved && editing ? (
        <>
          <Text fontSize="text-sm" tone="body" style={{ marginTop: space.sm }}>
            {`Only for this listing. Your saved ${addressTitle(saved)} address stays the same.`}
          </Text>
          <Link
            label="Use the saved details"
            onPress={() => {
              onChangeFlat(savedFlat);
              setEditingFlat(false);
            }}
          />
        </>
      ) : null}

      {offerSave ? (
        <View style={{ marginTop: space.xs }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <CheckBox
              checked={Boolean(saveAs)}
              // Only the intent is kept: the address is created after the
              // listing is submitted (Preview), from the location as it
              // stands then. Home unless one is saved already (D7).
              onPress={() => onSaveAs(saveAs ? null : taken.has("home") ? "other" : "home")}
              accessibilityLabel="Save this address for next time"
            />
            <Text fontSize="text-md" style={{ flex: 1 }}>
              Save this address for next time
            </Text>
          </View>
          {saveAs ? (
            <View style={{ paddingLeft: CHECK_LABEL_INSET, gap: space.sm }}>
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Save as"
                style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
              >
                {ADDRESS_TYPES.map((type) => {
                  const selected = saveAs === type;
                  const isTaken = type !== "other" && taken.has(type);
                  const label = addressTitle({ address_type: type, label: "" });
                  return (
                    <TouchableOpacity
                      key={type}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected, disabled: isTaken }}
                      accessibilityLabel={`Save as ${label}`}
                      accessibilityHint={isTaken ? "Already saved" : undefined}
                      disabled={isTaken}
                      activeOpacity={0.6}
                      // The chip is drawn 36 pt tall; this brings the target to 44.
                      hitSlop={{ top: 4, bottom: 4 }}
                      onPress={() => onSaveAs(type)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: space.xs,
                        minHeight: density.chip,
                        paddingHorizontal: space.md,
                        borderRadius: radius.full,
                        borderWidth: 1,
                        borderColor: selected ? color.brand : isTaken ? color.line : color.inputLine,
                        backgroundColor: selected ? color.brandWash : color.surface,
                      }}
                    >
                      {/* Selected is colour only. A check mark and a heavier
                          weight made the chip grow and pushed its neighbours
                          sideways, out from under the next tap. */}
                      <Text
                        fontSize="text-sm"
                        fontWeight="font-bold"
                        tone={selected ? "brand" : isTaken ? "dim" : "default"}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text fontSize="text-xs" tone="body" accessibilityLiveRegion="polite">
                {taken.size
                  ? `You already have a ${[...taken].map((t) => addressTitle({ address_type: t, label: "" })).join(" and a ")} address. `
                  : ""}
                Saved to your addresses when you publish.
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
