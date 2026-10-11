import { bookingQueryKey } from "@/backend/bookings";
import { reportNoShow, reportOwnerAbsent } from "@/backend/handover";
import { shopBookingQueryKey } from "@/backend/shop-ring";
import { refreshShop } from "@/backend/shop-today";
import { BottomBar, Notice } from "@/components/booking/parts";
import { Button, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { EvidencePhoto, PhotoRow, uploadEvidence } from "@/components/handover/photo-row";
import { useGuardedTap } from "@/components/handover/parts";
import { apiError } from "@/lib/api-error";
import { BookingCustomer } from "@/lib/booking";
import { dayErrorText, reportCopy } from "@/lib/day-of";
import { SCREEN_GUTTER, space } from "@/lib/design-tokens";
import { BookingShop } from "@/lib/shop-booking";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useState } from "react";
import { ScrollView } from "react-native";
import { useQueryClient } from "react-query";

/**
 * "They did not come", from either side, and the customer's "Owner did not come"
 * at the return. One photo, taken on the spot with the camera, then the report.
 * The clock is the server's: it refuses a report made too early and says from
 * when (`too_early`). After the report the booking is read from the answer, and
 * after any refusal it is read again.
 */
export default function ReportScreen() {
  const { params } = useRoute<RouteProps<"BookingReport">>();
  const { number, kind, role } = params;
  const navigation = useTypedNavigation();
  const queryClient = useQueryClient();
  const { running, run } = useGuardedTap();
  const [photos, setPhotos] = useState<EvidencePhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const copy = reportCopy(kind, role, params.name ?? "The customer", params.mode ?? "pickup");
  const sending = running !== null;
  const key = role === "customer" ? bookingQueryKey(number) : shopBookingQueryKey(number);

  const send = () =>
    run("send", async () => {
      setError(null);
      try {
        const [photo] = await uploadEvidence(photos.slice(0, 1), `${number}-${kind}`);
        if (kind === "owner_absent") {
          queryClient.setQueryData(key, (await reportOwnerAbsent(number, photo)).booking);
        } else if (role === "customer") {
          queryClient.setQueryData(key, await reportNoShow<BookingCustomer>(number, photo));
        } else {
          queryClient.setQueryData(key, await reportNoShow<BookingShop>(number, photo));
          refreshShop(queryClient);
        }
        // Both Rentals lists start with this key.
        void queryClient.invalidateQueries("bookings");
        toast.success(copy.done);
        // Back to the screen this was opened from, which now draws what the booking has become.
        navigation.navigate(role === "customer" ? "Booking" : "ShopHandover", { number });
      } catch (failure) {
        const refused = apiError(failure);
        setError(refused ? dayErrorText(refused, new Date()) : "The photo did not upload. Check your connection and try again.");
        if (refused && refused.status > 0) void queryClient.invalidateQueries(key);
      }
    });

  return (
    <NonScrollableContainer>
      <SubpageHeader title={copy.header} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.md }}
      >
        <Text role="screenTitle" accessibilityRole="header">
          {copy.title}
        </Text>
        <Text fontSize="text-md" tone="body">
          {copy.body}
        </Text>
        <Text role="sectionTitle" accessibilityRole="header">
          {copy.photo}
        </Text>
        <PhotoRow
          photos={photos}
          // One photo is what the report takes: a new one replaces the last.
          onChange={(next) => setPhotos(next.slice(-1))}
          addLabel={photos.length > 0 ? "Take it again" : "Take the photo"}
          disabled={sending}
        />
        <Notice icon="info">Camera only: take it now, where you are waiting.</Notice>
      </ScrollView>
      <BottomBar>
        {error ? (
          <Text fontSize="text-sm" tone="danger" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <Button variant="warning" onPress={() => void send()} loading={sending} disabled={sending || photos.length === 0}>
          {copy.button}
        </Button>
        <Button variant="ghost" disabled={sending} onPress={() => navigation.goBack()}>
          Go back
        </Button>
      </BottomBar>
    </NonScrollableContainer>
  );
}
