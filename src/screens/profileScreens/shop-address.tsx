import { localityFor } from "@/backend/list-flow/pickup-location";
import { confirmShopAddress, shopQueryKey, useShop } from "@/backend/shop";
import { todayQueryKey } from "@/backend/shop-today";
import { BottomBar, Button, StatusPill, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { ShopLoadError, ShopLoading } from "@/components/shop/states";
import { useGlobalContext } from "@/context/global-context";
import { apiError, fieldErrors } from "@/lib/api-error";
import { SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { createLocationRequest } from "@/lib/location-request";
import { shopAddressBody } from "@/lib/shop";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import { ADDRESS_NOT_FOUND, ADDRESS_UNAVAILABLE } from "@/screens/post-screens/location-modal";
import { useRoute } from "@react-navigation/native";
import React, { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

/** What the map picker gave for the new place, named. */
interface Picked {
  latitude: number;
  longitude: number;
  /** The geocoder's line, or null when it had nothing. */
  address: string | null;
  locality: string | null;
}

/**
 * The shop's address and pin, set on the phone (ENG-265). The same map picker as
 * "Choose Address"; the place is saved with `POST /api/shop/confirm-address/`,
 * which also moves a merchant's products to it. Saved addresses (Profile) are the
 * owner's personal list and are not touched.
 */
export default function ShopAddressScreen() {
  const navigation = useTypedNavigation();
  const route = useRoute();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { userDetails } = useGlobalContext();
  const query = useShop();
  const shop = query.data;

  // Dev-only design seed (ENG-437 plan §2.6): a picked place without the map, the location request or the geocoder.
  const design = __DEV__ ? (route.params as { design?: { picked?: Picked } } | undefined)?.design : undefined;
  const [picked, setPicked] = useState<Picked | null>(design?.picked ?? null);
  const [naming, setNaming] = useState(false);
  const [saving, setSaving] = useState(false);
  const namingRun = useRef(0);

  const header = <SubpageHeader title="Shop address" />;

  if (!shop) {
    return (
      <NonScrollableContainer>
        {header}
        {query.isLoading || query.isIdle ? (
          <ShopLoading label="Loading your shop" />
        ) : (
          <ShopLoadError error={query.error} onRetry={() => void query.refetch()} />
        )}
      </NonScrollableContainer>
    );
  }

  const choose = () => {
    const pin = shop.coordinates;
    navigation.navigate("LocationModal", {
      requestId: createLocationRequest((coords, address) => {
        // "Skip" closes the picker without a place.
        if (!coords) return;
        const named =
          address && address !== ADDRESS_NOT_FOUND && address !== ADDRESS_UNAVAILABLE ? address : null;
        setPicked({ ...coords, address: named, locality: null });
        setNaming(true);
        // A second pin can be chosen while the first is still being named; only the latest answer counts.
        const run = ++namingRun.current;
        void localityFor(coords.latitude, coords.longitude).then((locality) => {
          if (run !== namingRun.current) return;
          setPicked((current) => (current ? { ...current, locality } : current));
          setNaming(false);
        });
      }),
      initial: pin ? { latitude: pin.lat, longitude: pin.long } : undefined,
    });
  };

  const save = async () => {
    if (!picked?.locality || saving) return;
    setSaving(true);
    try {
      const saved = await confirmShopAddress(shopAddressBody(picked, picked.address, picked.locality));
      queryClient.setQueryData(shopQueryKey(userDetails?.username), saved);
      // The Today row goes away on the next fetch.
      void queryClient.invalidateQueries(todayQueryKey(userDetails?.username));
      setPicked(null);
      toast.success("Shop address saved");
    } catch (error) {
      const failure = apiError(error);
      const field = Object.values(fieldErrors(failure))[0];
      toast.error("We couldn't save the address", {
        message: field ?? failure?.message ?? "Check your connection and try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  // The address cards (2097:30162, 30195): a 1px edge, r12, 16 inside it (Figma counts the stroke, so x17).
  const card = {
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.input,
    backgroundColor: color.surface,
    padding: 16,
    gap: 4,
  } as const;

  // Not set: one bar button. Picked: Choose another place beside Save. Confirmed with nothing picked: no bar, the
  // change button sits under the card (2097:30130, 30195, 30162).
  const bar = picked ? (
    <BottomBar
      layout="secondary-primary"
      secondary={{ label: "Choose another place", onPress: choose, disabled: saving }}
      primary={{
        label: "Save shop address",
        accessibilityLabel: "Save shop address",
        onPress: () => void save(),
        loading: saving,
        disabled: saving || naming || !picked.locality,
      }}
    />
  ) : !shop.address_confirmed ? (
    <BottomBar primary={{ label: "Choose on the map", onPress: choose, disabled: saving }} />
  ) : null;

  return (
    <NonScrollableContainer>
      {header}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: 16,
          paddingBottom: 32 + (bar ? 0 : insets.bottom),
          gap: 16,
        }}
      >
        <Text role="screenTitle" accessibilityRole="header">
          Your shop's address
        </Text>

        {shop.address_confirmed ? (
          <View style={card}>
            {/* 4 + the frame's 4pt spacer + 4 puts the locality 12 under the pill. */}
            <StatusPill label="Confirmed" tone="success" style={{ alignSelf: "flex-start", marginBottom: 8 }} />
            <Text fontSize="text-md" lineHeight={24} fontWeight="font-semibold">
              {shop.locality || shop.address}
            </Text>
            {shop.address && shop.address !== shop.locality ? (
              <Text fontSize="text-sm" lineHeight={20} tone="body">
                {shop.address}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text fontSize="text-sm" lineHeight={20} tone="body">
            Set where your shop is. Customers see only the area. Until you do, you can't publish.
          </Text>
        )}

        {picked ? (
          <View style={card}>
            <Text fontSize="text-sm" lineHeight={20} tone="dim" style={{ marginBottom: 8 }}>
              New address
            </Text>
            <Text fontSize="text-md" lineHeight={24} fontWeight="font-semibold">
              {naming ? "Finding the area..." : picked.locality ?? "We couldn't name this spot. Choose another place on the map."}
            </Text>
            {picked.address && picked.address !== picked.locality ? (
              <Text fontSize="text-sm" lineHeight={20} tone="body">
                {picked.address}
              </Text>
            ) : null}
          </View>
        ) : null}

        {!picked && shop.address_confirmed ? (
          <Button variant="outline" size="compact" disabled={saving} onPress={choose}>
            Change on the map
          </Button>
        ) : null}
      </ScrollView>
      {bar}
    </NonScrollableContainer>
  );
}
