import { localityFor } from "@/backend/list-flow/pickup-location";
import { confirmShopAddress, shopQueryKey, useShop } from "@/backend/shop";
import { todayQueryKey } from "@/backend/shop-today";
import { Button, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { ShopLoadError, ShopLoading } from "@/components/shop/states";
import { useGlobalContext } from "@/context/global-context";
import { apiError, fieldErrors } from "@/lib/api-error";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { createLocationRequest } from "@/lib/location-request";
import { shopAddressBody } from "@/lib/shop";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import { ADDRESS_NOT_FOUND, ADDRESS_UNAVAILABLE } from "@/screens/post-screens/location-modal";
import React, { useState } from "react";
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
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { userDetails } = useGlobalContext();
  const query = useShop();
  const shop = query.data;

  const [picked, setPicked] = useState<Picked | null>(null);
  const [naming, setNaming] = useState(false);
  const [saving, setSaving] = useState(false);

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
        void localityFor(coords.latitude, coords.longitude).then((locality) => {
          // Only the latest pin counts.
          setPicked((current) =>
            current && current.latitude === coords.latitude && current.longitude === coords.longitude
              ? { ...current, locality }
              : current
          );
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

  const card = {
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.card,
    backgroundColor: color.surface,
    padding: space.md,
    gap: space.xs,
  } as const;

  return (
    <NonScrollableContainer>
      {header}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.md,
          paddingBottom: insets.bottom + space.xl,
          gap: space.md,
        }}
      >
        <Text role="screenTitle" accessibilityRole="header">
          Your shop's address
        </Text>

        {shop.address_confirmed ? (
          <View style={card}>
            <Text fontSize="text-sm" tone="body">
              Confirmed
            </Text>
            <Text fontSize="text-md" fontWeight="font-bold">
              {shop.locality || shop.address}
            </Text>
            {shop.address && shop.address !== shop.locality ? (
              <Text fontSize="text-sm" tone="body">
                {shop.address}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text fontSize="text-md" tone="body">
            Set where your shop is. Customers see only the area. Until you do, you can't publish.
          </Text>
        )}

        {picked ? (
          <View style={card}>
            <Text fontSize="text-sm" tone="body">
              New address
            </Text>
            <Text fontSize="text-md" fontWeight="font-bold">
              {naming ? "Finding the area..." : picked.locality ?? "We couldn't name this spot."}
            </Text>
            {picked.address && picked.address !== picked.locality ? (
              <Text fontSize="text-sm" tone="body">
                {picked.address}
              </Text>
            ) : null}
          </View>
        ) : null}

        {picked ? (
          <Button
            accessibilityLabel="Save shop address"
            loading={saving}
            disabled={saving || naming || !picked.locality}
            onPress={() => void save()}
          >
            Save shop address
          </Button>
        ) : null}
        <Button variant="outline" accessibilityLabel="Choose on the map" disabled={saving} onPress={choose}>
          {picked ? "Choose another place" : shop.address_confirmed ? "Change on the map" : "Choose on the map"}
        </Button>
      </ScrollView>
    </NonScrollableContainer>
  );
}
