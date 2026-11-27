import { useAreas, useShop } from "@/backend/shop";
import { BottomBar, Button, Skeleton, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { ShopLoading } from "@/components/shop/states";
import { apiError } from "@/lib/api-error";
import { deliveryDraft, useDeliveryDraft } from "@/lib/delivery-draft";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { Area, areaGroups, deliveryDraftFrom, kmText, offWithin, toggleExcluded } from "@/lib/shop";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React, { useMemo, useState } from "react";
import { ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import { CheckIcon, MagnifyingGlassIcon } from "react-native-heroicons/outline";

/** One area: a checkbox that is ticked while the shop delivers there. The whole row is the target. */
function AreaRow({ area, off, onPress }: { area: Area; off: boolean; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !off }}
      accessibilityLabel={`${area.name}, ${area.pin}, ${kmText(area.km)}${area.inside ? "" : ", just outside"}`}
      activeOpacity={0.6}
      onPress={onPress}
      // 2097:29740: 56 high (8 + 40 + 8), a hairline under every row, the list on the canvas.
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        minHeight: 56,
        paddingVertical: space.sm,
        borderBottomWidth: 1,
        borderBottomColor: color.line,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 1.5,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: off ? "transparent" : color.brand,
          borderColor: off ? color.line : color.brand,
        }}
      >
        {off ? null : <CheckIcon size={15} color={color.onBrand} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text fontSize="text-md" fontWeight="font-semibold" tone={off ? "body" : "default"}>
          {area.name}
        </Text>
        <Text fontSize="text-xs" tone="dim">
          {/* An edge area (D13) is listed so a shop can turn off a PIN code that straddles the distance. */}
          {`${area.pin}${off ? " · Off" : ""}${area.inside ? "" : " · just outside"}`}
        </Text>
      </View>
      <Text fontSize="text-sm" tone="dim">
        {kmText(area.km)}
      </Text>
    </TouchableOpacity>
  );
}

/** A 32 row: 12 above the 12/16 label, 4 below. */
function GroupLabel({ children }: { children: string }) {
  return (
    <Text
      fontSize="text-xs"
      fontWeight="font-semibold"
      tone="dim"
      accessibilityRole="header"
      style={{ paddingTop: 12, paddingBottom: 4 }}
    >
      {children}
    </Text>
  );
}

/**
 * The search box as 2097:29740 draws it: the kit field's 48/r12 edge with a leading glass, which `TextField` has no slot
 * for (and the frame's box is not a Form field instance).
 */
function SearchField({ value, onChangeText }: { value: string; onChangeText: (text: string) => void }) {
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        height: 48,
        paddingHorizontal: 16,
        borderRadius: radius.input,
        borderWidth: focused ? 1.5 : 1,
        borderColor: focused ? color.brand : color.line,
      }}
    >
      <MagnifyingGlassIcon size={20} color={color.textDim} />
      <TextInput
        accessibilityLabel="Search area or PIN code"
        placeholder="Search area or PIN code"
        placeholderTextColor={color.placeholder}
        selectionColor={color.brand}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCorrect={false}
        returnKeyType="search"
        style={{ flex: 1, height: "100%", color: color.text, fontFamily: "PlusJakartaSans-Regular", fontSize: 16 }}
      />
    </View>
  );
}

/**
 * SH-15b: every area around the shop, to turn on or off. It writes to the Delivery screen's draft and saves nothing: the
 * Delivery screen's pinned bar does. Back (button, header or hardware) keeps the edits.
 */
export default function DeliveryAreasScreen() {
  const navigation = useTypedNavigation();
  const shop = useShop().data;
  const saved = useMemo(() => (shop ? deliveryDraftFrom(shop) : null), [shop]);
  const form = useDeliveryDraft() ?? saved;
  const areasQuery = useAreas(Number(form?.maxKm) || 0, Boolean(form));
  const [search, setSearch] = useState("");
  // The groups as the list was opened (or last searched), like the Delivery screen's chips: a tapped row only changes
  // its checkbox instead of jumping to the other group, where the next tap would land on another area.
  const [groupedOff, setGroupedOff] = useState<string[] | null>(() => form?.excluded ?? null);

  if (!form) {
    return (
      <NonScrollableContainer>
        <SubpageHeader title="Areas" />
        <ShopLoading label="Loading your areas" />
      </NonScrollableContainer>
    );
  }

  const areas = areasQuery.data?.areas ?? [];
  const isOff = (a: Area) => form.excluded.includes(a.pin);
  const toggle = (pin: string) => deliveryDraft.set({ ...form, excluded: toggleExcluded(form.excluded, pin) });
  const needle = search.trim().toLowerCase();
  const matching = needle ? areas.filter((a) => a.name.toLowerCase().includes(needle) || a.pin.includes(needle)) : areas;
  const groups = areaGroups(matching, groupedOff ?? form.excluded);
  const offCount = offWithin(areas, form.excluded).length;
  const failure = apiError(areasQuery.error);

  return (
    <NonScrollableContainer>
      <SubpageHeader title={`Areas within ${kmText(areasQuery.data?.km ?? form.maxKm)}`} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 16, paddingBottom: 24 }}
      >
        {areasQuery.isLoading ? (
          <View
            style={{ gap: space.sm }}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Loading your areas"
            accessibilityState={{ busy: true }}
          >
            <Skeleton width="70%" height={32} borderRadius={radius.input} />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} width="100%" height={MIN_TOUCH_TARGET + 12} borderRadius={radius.group} />
            ))}
          </View>
        ) : !areasQuery.data ? (
          <View style={{ gap: 12 }}>
            <Text fontSize="text-md" tone="body">
              {failure?.code === "shop_address_missing"
                ? "Add your shop address first."
                : "Couldn't load your areas. Check your connection."}
            </Text>
            {failure?.code === "shop_address_missing" ? (
              <Button variant="outline" tone="tonal" size="compact" onPress={() => navigation.navigate("ShopAddress")}>
                Add shop address
              </Button>
            ) : (
              <Button variant="outline" size="compact" onPress={() => void areasQuery.refetch()}>
                Try again
              </Button>
            )}
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            <Text role="screenTitle" accessibilityRole="header">
              {`${areas.length} ${areas.length === 1 ? "area" : "areas"}, nearest first`}
            </Text>
            <Text fontSize="text-sm" tone="body">
              Tap an area to turn it off. Customers there can still pick up from your shop.
            </Text>
            <SearchField
              value={search}
              onChangeText={(text) => {
                setSearch(text);
                setGroupedOff(form.excluded);
              }}
            />
            <View>
              {matching.length === 0 ? (
                <Text fontSize="text-md" tone="body" style={{ paddingVertical: space.md }}>
                  No area matches "{search.trim()}".
                </Text>
              ) : null}
              {groups.off.length ? <GroupLabel>{`OFF · ${groups.off.length}`}</GroupLabel> : null}
              {groups.off.map((area) => (
                <AreaRow key={area.pin} area={area} off={isOff(area)} onPress={() => toggle(area.pin)} />
              ))}
              {groups.on.length ? <GroupLabel>{`ON · ${groups.on.length}, NEAREST FIRST`}</GroupLabel> : null}
              {groups.on.map((area) => (
                <AreaRow key={area.pin} area={area} off={isOff(area)} onPress={() => toggle(area.pin)} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
      <BottomBar
        primary={{
          label: offCount ? `Back to delivery · ${offCount} ${offCount === 1 ? "area" : "areas"} off` : "Back to delivery",
          onPress: () => navigation.goBack(),
        }}
      />
    </NonScrollableContainer>
  );
}
