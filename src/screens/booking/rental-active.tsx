import { BottomBar, Notice, Panel } from "@/components/booking/parts";
import { UploadNote } from "@/components/capture/upload-note";
import { Button, Text } from "@/components/core";
import { LinkRow } from "@/components/handover/parts";
import { BookingCustomer } from "@/lib/booking";
import { activeCopy } from "@/lib/day-of";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { ScrollView, View } from "react-native";
import { ClockIcon, LockClosedIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * BK-20, "Your rental": the booking is `out`. When it is due back, what a late
 * day costs (and what being late has cost so far, N11), extending, the deposit
 * Renit holds, and the way into the return. A handover record still uploading is
 * said here too: the owner is not paid until it is up.
 */
export function RentalActive({ booking }: { booking: BookingCustomer }) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const { number } = booking;
  const copy = activeCopy(booking);
  const can = (action: string) => booking.can.includes(action);
  const late = copy.late.tone === "warning";
  const extension = booking.extensions?.[booking.extensions.length - 1] ?? null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.sm, paddingBottom: insets.bottom + space.lg, gap: space.md }}
      >
        <View style={{ gap: 2 }}>
          <Text role="screenTitle" accessibilityRole="header">
            {copy.title}
          </Text>
          <Text fontSize="text-md" tone="body">
            {copy.sub}
          </Text>
        </View>

        <View
          accessible
          accessibilityLabel={`${copy.returnBy ?? "Rental active"}. ${copy.late.text}`}
          style={{
            flexDirection: "row",
            gap: space.md,
            padding: space.md,
            borderRadius: radius.card,
            borderWidth: 1,
            borderColor: late ? color.warning : color.brandPanelLine,
            backgroundColor: late ? color.warningWash : color.brandPanel,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.full,
              backgroundColor: color.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ClockIcon size={20} color={late ? color.warning : color.brandText} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text fontSize="text-md" fontWeight="font-bold">
              {copy.returnBy ?? "Rental active"}
            </Text>
            <Text fontSize="text-sm" tone="body">
              {copy.late.text}
            </Text>
          </View>
        </View>

        <UploadNote number={number} moment="handover" side="customer" />

        {extension ? (
          <Notice tone="brand" icon="clock">
            {`You asked to extend this rental (${extension}). Open it from your rentals to see where it stands.`}
          </Notice>
        ) : null}

        <Panel>
          {can("extend") ? (
            <LinkRow
              title="Extend this rental"
              sub="A new booking for the days after. The shop has to accept."
              onPress={() => navigation.navigate("BookingExtend", { number })}
            />
          ) : null}
          <LinkRow
            first={!can("extend")}
            title="Booking details"
            sub="The timeline and your payments."
            onPress={() => navigation.navigate("BookingDetails", { number })}
          />
        </Panel>

        {copy.deposit ? (
          <Panel style={{ flexDirection: "row", gap: space.md, padding: space.md }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.full,
                backgroundColor: color.surfaceRaised,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LockClosedIcon size={20} color={color.textBody} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", gap: space.sm }}>
                <Text fontSize="text-md" fontWeight="font-bold" style={{ flex: 1 }}>
                  Deposit
                </Text>
                <Text fontSize="text-md" fontWeight="font-bold">
                  {copy.deposit.amount}
                </Text>
              </View>
              <Text fontSize="text-sm" tone="body">
                {copy.deposit.sub}
              </Text>
            </View>
          </Panel>
        ) : null}

        <Text fontSize="text-sm" tone="body">
          Returning early gives no refund.
        </Text>
      </ScrollView>
      <BottomBar>
        <Button variant="outline" onPress={() => navigation.navigate("BookingReturn", { number })}>
          {copy.button}
        </Button>
      </BottomBar>
    </View>
  );
}
