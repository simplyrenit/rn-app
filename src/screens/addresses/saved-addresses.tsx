import useAddresses, { useAddAddress } from "@/backend/useAddresses";
import { AddressRow, AddressRowSkeleton } from "@/components/addresses/address-row";
import { BottomBar, EmptyState, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { MAX_ADDRESSES } from "@/lib/addresses";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { ExclamationTriangleIcon, MapPinIcon } from "react-native-heroicons/outline";

// Empty and error states sit 140 below the top bar (2097:28908 / 28950 Body), not centred.
const EMPTY_TOP = 140;

/** A-01 (ENG-25 §8.2): the addresses a user has saved, from Profile. */
export default function SavedAddressesScreen() {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const { addresses, loading, isError, refreshing, refetch } = useAddresses();
  const addAddress = useAddAddress();
  const full = addresses.length >= MAX_ADDRESSES;

  const card = {
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: 12,
    backgroundColor: color.surface,
    overflow: "hidden",
  } as const;

  let body: React.ReactNode;
  if (loading) {
    body = (
      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 16 }}>
        <View
          style={card}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Loading your addresses"
          accessibilityState={{ busy: true }}
        >
          {[0, 1, 2].map((index) => (
            <AddressRowSkeleton key={index} first={index === 0} />
          ))}
        </View>
      </View>
    );
  } else if (isError) {
    body = (
      <View style={{ paddingTop: EMPTY_TOP }}>
        <EmptyState
          variant="error"
          icon={<ExclamationTriangleIcon size={28} color={color.dangerStrong} />}
          title="Couldn't load your addresses"
          body="Check your connection and try again."
          actionLabel="Try again"
          onAction={() => void refetch()}
        />
      </View>
    );
  } else if (addresses.length === 0) {
    body = (
      <View style={{ paddingTop: EMPTY_TOP }}>
        <EmptyState
          icon={<MapPinIcon size={28} color={color.brandText} />}
          title="No saved addresses yet"
          body="Save your home or work once and pick it in one tap when you list."
          actionLabel="Add new address"
          actionTone="primary"
          onAction={addAddress}
        />
      </View>
    );
  } else {
    body = (
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: 16,
          paddingBottom: 24,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={color.textDim} />
        }
      >
        <View style={card}>
          {addresses.map((address, index) => (
            <AddressRow
              key={address.id}
              address={address}
              first={index === 0}
              onPress={() => navigation.navigate("AddressDetails", { address })}
            />
          ))}
        </View>
      </ScrollView>
    );
  }

  // The empty and error states carry their own action, so the pinned button
  // would only say the same thing twice (empty) or offer an add that cannot
  // know the list it is adding to (error).
  const showFooter = loading || (!isError && addresses.length > 0);

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Saved addresses" />
      <View style={{ flex: 1 }}>{body}</View>
      {showFooter ? (
        <>
          {/* No frame draws the cap; the note sits above the bar, since a bar with children drops its primary. */}
          {full ? (
            <Text
              fontSize="text-sm"
              tone="dim"
              style={{ textAlign: "center", paddingHorizontal: SCREEN_GUTTER, paddingBottom: 8 }}
            >
              You can save up to 20 addresses.
            </Text>
          ) : null}
          <BottomBar
            layout="full-cta"
            primary={{ label: "Add new address", onPress: addAddress, disabled: loading || full }}
          />
        </>
      ) : null}
    </NonScrollableContainer>
  );
}
