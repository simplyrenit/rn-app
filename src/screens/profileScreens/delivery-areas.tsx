import { useAreas, useShop } from "@/backend/shop";
import { Button, Skeleton, SubpageHeader, Text, TextField } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { ShopLoading } from "@/components/shop/states";
import { apiError } from "@/lib/api-error";
import { deliveryDraft, useDeliveryDraft } from "@/lib/delivery-draft";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { Area, areaGroups, deliveryDraftFrom, kmText, offWithin, toggleExcluded } from "@/lib/shop";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React, { useMemo, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { CheckIcon } from "react-native-heroicons/solid";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** One area: a checkbox that is ticked while the shop delivers there. The whole row is the target. */
function AreaRow({ area, off, first, onPress }: { area: Area; off: boolean; first: boolean; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !off }}
      accessibilityLabel={`${area.name}, ${area.pin}, ${kmText(area.km)}${area.inside ? "" : ", just outside"}`}
      activeOpacity={0.6}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        minHeight: MIN_TOUCH_TARGET + 12,
        paddingVertical: space.sm,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: color.line,
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
          borderColor: off ? color.inputLine : color.brand,
        }}
      >
        {off ? null : <CheckIcon size={15} color={color.onBrand} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text fontSize="text-md" fontWeight="font-bold" tone={off ? "body" : "default"}>
          {area.name}
        </Text>
        <Text fontSize="text-xs" tone="body">
          {/* An edge area (D13) is listed so a shop can turn off a PIN code that straddles the distance. */}
          {`${area.pin}${off ? " · Off" : ""}${area.inside ? "" : " · just outside"}`}
        </Text>
      </View>
      <Text fontSize="text-sm" tone="body">
        {kmText(area.km)}
      </Text>
    </TouchableOpacity>
  );
}

function GroupLabel({ children }: { children: string }) {
  return (
    <Text fontSize="text-xs" fontWeight="font-bold" tone="dim" accessibilityRole="header" style={{ marginTop: space.sm }}>
      {children}
    </Text>
  );
}

/**
 * SH-15b: every area around the shop, to turn on or off. It writes to the Delivery screen's draft and saves nothing: the
 * Delivery screen's pinned bar does. Back (button, header or hardware) keeps the edits.
 */
export default function DeliveryAreasScreen() {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
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
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.md, paddingBottom: space.xl }}
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
          <View style={{ gap: space.md }}>
            <Text fontSize="text-md" tone="body">
              {failure?.code === "shop_address_missing"
                ? "Add your shop address first."
                : "Couldn't load your areas. Check your connection."}
            </Text>
            {failure?.code === "shop_address_missing" ? (
              <Button onPress={() => navigation.navigate("ShopAddress")}>Add shop address</Button>
            ) : (
              <Button variant="outline" onPress={() => void areasQuery.refetch()}>
                Try again
              </Button>
            )}
          </View>
        ) : (
          <>
            <Text role="screenTitle" accessibilityRole="header">
              {`${areas.length} ${areas.length === 1 ? "area" : "areas"}, nearest first`}
            </Text>
            <Text fontSize="text-md" tone="body" style={{ marginTop: space.sm, marginBottom: space.md }}>
              Tap an area to turn it off. Customers there can still pick up from your shop.
            </Text>
            <TextField
              accessibilityLabel="Search area or PIN code"
              placeholder="Search area or PIN code"
              value={search}
              onChangeText={(text) => {
                setSearch(text);
                setGroupedOff(form.excluded);
              }}
              autoCorrect={false}
              returnKeyType="search"
            />
            <View
              style={{
                paddingHorizontal: space.md,
                paddingBottom: space.sm,
                borderWidth: 1,
                borderColor: color.line,
                borderRadius: radius.card,
                backgroundColor: color.surface,
              }}
            >
              {matching.length === 0 ? (
                <Text fontSize="text-md" tone="body" style={{ paddingVertical: space.md }}>
                  No area matches "{search.trim()}".
                </Text>
              ) : null}
              {groups.off.length ? <GroupLabel>{`OFF · ${groups.off.length}`}</GroupLabel> : null}
              {groups.off.map((area, i) => (
                <AreaRow key={area.pin} area={area} off={isOff(area)} first={i === 0} onPress={() => toggle(area.pin)} />
              ))}
              {groups.on.length ? <GroupLabel>{`ON · ${groups.on.length}, NEAREST FIRST`}</GroupLabel> : null}
              {groups.on.map((area, i) => (
                <AreaRow key={area.pin} area={area} off={isOff(area)} first={i === 0} onPress={() => toggle(area.pin)} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.sm,
          paddingBottom: insets.bottom + space.sm,
          borderTopWidth: 1,
          borderTopColor: color.line,
          backgroundColor: color.canvas,
        }}
      >
        <Button onPress={() => navigation.goBack()}>
          {offCount ? `Back to delivery · ${offCount} ${offCount === 1 ? "area" : "areas"} off` : "Back to delivery"}
        </Button>
      </View>
    </NonScrollableContainer>
  );
}
