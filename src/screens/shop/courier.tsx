import { useClaimKinds } from "@/backend/claims";
import { handedToRider, markPacked } from "@/backend/shop-courier";
import { shopBookingQueryKey } from "@/backend/shop-ring";
import { refreshShop } from "@/backend/shop-today";
import { GetHelp } from "@/components/booking/get-help";
import { Notice, Panel } from "@/components/booking/parts";
import { useServerNow } from "@/components/booking/use-server-now";
import { ClaimRows } from "@/components/claims/claim-rows";
import { ReturnSets } from "@/components/capture/moment-sets";
import { RecordCardBody, Records, useRecord } from "@/components/capture/record-card";
import { Button, Text, TextField } from "@/components/core";
import { Block, CallButton, LinkRow, StepList, useGuardedTap } from "@/components/handover/parts";
import { EvidencePhoto, PhotoRow, discardEvidence, uploadEvidence } from "@/components/handover/photo-row";
import { apiError } from "@/lib/api-error";
import { recordWanted } from "@/lib/capture";
import { reportUntilLine } from "@/lib/claims";
import { captured, dayBlock } from "@/lib/day-of";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { successFeedback } from "@/lib/haptics";
import { BookingShop } from "@/lib/shop-booking";
import {
  HANDOVER_NOTE,
  OwnerCourier,
  RECEIPT_NOTE,
  arrivingLine,
  bannerTone,
  canPack,
  courierCall,
  courierErrorText,
  courierPayoutLine,
  legSteps,
  packByText,
  packSteps,
  returnTitle,
  riderCard,
  sealOf,
} from "@/lib/shop-courier";
import { payoutPending, returnCopy } from "@/lib/shop-handover";
import { customerName } from "@/lib/shop-ring";
import { useTheme } from "@/lib/theme";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { useTypedNavigation } from "@/lib/types";
import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { CheckCircleIcon } from "react-native-heroicons/outline";
import { useQueryClient } from "react-query";

interface Props {
  booking: BookingShop;
  courier: OwnerCourier;
  receivedAt: number;
  watching: boolean;
}

function Banner({ courier }: { courier: OwnerCourier }) {
  const banner = courier.banner;
  if (!banner?.title) return null;
  return (
    <Notice tone={bannerTone(banner)} icon={banner.tone === "info" ? "info" : "warning"} title={banner.title}>
      {banner.body ?? ""}
    </Notice>
  );
}

/**
 * SH-08 for a booking Renit's courier carries (Figma S2, S2b, S2c): record it with the seal, type the seal's number and
 * tap Packed; then, once the desk has named a rider, show the rider the OTP and tap "Handed to rider" with a photo of
 * the bag. No status buttons, no customer address, no codes and no "They did not come": the desk handles the door.
 */
export function CourierPack({ booking, courier, receivedAt }: Props) {
  const navigation = useTypedNavigation();
  const queryClient = useQueryClient();
  const keyboard = useKeyboardInset();
  const now = useServerNow(booking.server_time, receivedAt, 30_000);
  const { running, run } = useGuardedTap();
  const { number } = booking;
  const first = booking.customer.first_name;
  const flags = captured(booking, "handover");
  const record = useRecord({
    moment: "handover",
    role: "owner",
    booking,
    receivedAt,
    stake: payoutPending(booking),
    title: `${booking.product.title} · ${first}`,
    other: first,
  });
  const [seal, setSeal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<EvidencePhoto[]>([]);
  const key = shopBookingQueryKey(number);

  // Packed needs the record on the server: read the booking again when the shop's own draft is done.
  const mineDone = Boolean(record.draft?.done && !record.draft.awaitingCode);
  useEffect(() => {
    if (mineDone) void queryClient.invalidateQueries(shopBookingQueryKey(number));
  }, [mineDone, queryClient, number]);

  const can = (action: string) => booking.can.includes(action);
  const live = booking.stage === "ready" && !booking.exit;
  const recorded = flags.mine || Boolean(record.draft?.sealed);
  const packing = live && !courier.seal;
  const rider = live ? riderCard(courier) : null;
  const payout = courierPayoutLine(booking);

  const fail = (failure: ReturnType<typeof apiError>) => {
    setError(courierErrorText(failure));
    // The booking may have moved on: its state on the server is the truth.
    if (failure && failure.status > 0) void queryClient.invalidateQueries(key);
  };

  const packed = () =>
    run("packed", async () => {
      setError(null);
      try {
        queryClient.setQueryData(key, await markPacked(number, sealOf(seal)));
        refreshShop(queryClient);
        successFeedback();
      } catch (e) {
        fail(apiError(e));
      }
    });

  const handed = () =>
    run("handed", async () => {
      setError(null);
      try {
        const [photo] = await uploadEvidence(photos.slice(-1), `${number}-rider`);
        queryClient.setQueryData(key, await handedToRider(number, photo));
        // The photo is on Renit's bucket now: its copy on the phone has done its work.
        discardEvidence(photos);
        setPhotos([]);
        refreshShop(queryClient);
        successFeedback();
      } catch (e) {
        // A photo that did not upload reads as no connection, which is what it usually is.
        fail(apiError(e));
      }
    });

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.md, paddingBottom: space.lg + keyboard }}
    >
      <View style={{ gap: 2 }}>
        <Text role="screenTitle" accessibilityRole="header">
          {packing ? "Pack it for the courier" : rider ? "Rider at your shop" : "Courier handover"}
        </Text>
        <Text fontSize="text-md" tone="body">
          {[booking.product.title, number, customerName(booking.customer)].join(" · ")}
        </Text>
      </View>

      {booking.exit ? <Notice icon="info">This booking has ended. Open it to see what happened.</Notice> : null}
      <Banner courier={courier} />

      {packing && courier.pack_by ? (
        <Notice tone="brand" icon="clock">
          {`${packByText(courier.pack_by, now)}. The rider is booked once you tap Packed.`}
        </Notice>
      ) : null}

      {packing ? (
        <Block title="Pack it">
          <StepList steps={packSteps(courier, recorded, seal)} />
        </Block>
      ) : null}

      {/* The shop's record, with the seal as its last shot: Packed waits for it, and so does the payout. */}
      <RecordCardBody record={record} />

      {packing ? (
        <Block title="Seal number">
          <TextField
            value={seal}
            onChangeText={(text) => (setSeal(text), setError(null))}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={24}
            editable={running === null}
            placeholder="R-1042"
            accessibilityLabel="Seal number"
            hint="The number printed on the seal. The customer checks it when the bag arrives."
          />
          {recorded && !flags.mine ? (
            <Text fontSize="text-sm" tone="body">
              Packed opens once your record has uploaded.
            </Text>
          ) : null}
          {error ? (
            <Text fontSize="text-sm" tone="danger" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <Button
            onPress={() => void packed()}
            loading={running === "packed"}
            disabled={running !== null || !flags.mine || !canPack(booking.can, seal)}
          >
            Packed
          </Button>
        </Block>
      ) : null}

      {rider ? (
        <Block title={rider.title}>
          {rider.vehicle ? (
            <Text fontSize="text-md" tone="body">
              {rider.vehicle}
            </Text>
          ) : null}
          {rider.otp ? (
            <View style={{ gap: space.xs, alignItems: "center", padding: space.md, borderRadius: radius.card }}>
              <Text fontSize="text-sm" tone="body">
                Show the rider this OTP
              </Text>
              <Text
                fontSize="text-2xl"
                fontWeight="font-bold"
                selectable
                accessibilityLabel={`OTP ${rider.otp.split("").join(" ")}`}
                style={{ letterSpacing: 6, fontVariant: ["tabular-nums"] }}
              >
                {rider.otp}
              </Text>
            </View>
          ) : null}
          <Text fontSize="text-sm" tone="body">
            {HANDOVER_NOTE}
          </Text>
          <PhotoRow
            photos={photos}
            // One photo is what the step takes: a new one replaces the last, whose file is cleared.
            onChange={(next) => {
              discardEvidence(photos.filter((old) => !next.slice(-1).some((kept) => kept.uri === old.uri)));
              setPhotos(next.slice(-1));
              setError(null);
            }}
            addLabel={photos.length > 0 ? "Take it again" : "Photo of the bag at the bike"}
            disabled={running !== null}
            max={1}
          />
          {!courier.seal ? (
            // The desk may name the rider before Packed; the bag goes only once it is sealed.
            <Text fontSize="text-sm" tone="body">
              Tap Packed first: the rider takes it only once it is sealed.
            </Text>
          ) : null}
          {error && !packing ? (
            <Text fontSize="text-sm" tone="danger" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <Button
            onPress={() => void handed()}
            loading={running === "handed"}
            disabled={running !== null || photos.length === 0 || !can("handed_to_rider")}
          >
            Handed to rider
          </Button>
        </Block>
      ) : null}

      <Block title="Courier">
        <StepList steps={legSteps(courier, "out")} />
      </Block>

      {payout ? (
        <Text fontSize="text-sm" tone="body">
          {payout}
        </Text>
      ) : null}

      {live ? <CallButton copy={courierCall(dayBlock(booking))} /> : null}

      <Panel>
        <GetHelp booking={booking} />
      </Panel>

      <Button variant="outline" onPress={() => navigation.navigate("ShopBooking", { number })}>
        Booking details
      </Button>
    </ScrollView>
  );
}

/**
 * SH-10 for a booking Renit's courier carries: "Item arriving {window}" from the server, the return leg's steps, the
 * owner's own record of the item as it comes back (the desk finishes the return after it), both sets side by side, and
 * "Report a problem" once it is back. There is no code: the shop and the customer never meet.
 */
export function CourierReturn({ booking, courier, receivedAt, watching }: Props) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const now = useServerNow(booking.server_time, receivedAt, 60_000);
  const { number } = booking;
  const first = booking.customer.first_name;
  const flags = captured(booking, "return");
  const names = { title: `${booking.product.title} · ${first}`, other: first };
  const record = useRecord({ moment: "return", role: "owner", booking, receivedAt, ...names });
  const kinds = useClaimKinds(booking.claims);
  const copy = returnCopy(booking, now, kinds);
  const out = booking.stage === "out" && !booking.exit;
  const arriving = out ? arrivingLine(courier) : null;
  // The rider is on the way or has come: the record is what the shop does next.
  const receiving = out && !flags.mine && ["rider_assigned", "picked_up", "at_shop"].includes(courier.return.state);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.md, paddingBottom: space.lg }}
    >
      <View style={{ gap: 2 }}>
        <Text role="screenTitle" accessibilityRole="header">
          {out ? returnTitle(courier) : copy.title}
        </Text>
        <Text fontSize="text-md" tone="body">
          {[booking.product.title, number, customerName(booking.customer)].join(" · ")}
        </Text>
      </View>

      {booking.exit ? <Notice icon="info">This booking has ended. Open it to see what happened.</Notice> : null}
      <Banner courier={courier} />

      {arriving ? (
        <Notice tone="brand" icon="clock">
          {arriving}
        </Notice>
      ) : null}

      {copy.returned ? (
        <View style={{ gap: space.sm, padding: space.md, borderRadius: radius.card, backgroundColor: color.successWash }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <CheckCircleIcon size={24} color={color.success} />
            <Text fontSize="text-md" fontWeight="font-bold" tone="success" style={{ flex: 1 }}>
              {copy.returned.title}
            </Text>
          </View>
          <Text fontSize="text-md" tone="body">
            {copy.returned.body}
          </Text>
        </View>
      ) : (
        <Block title="Return">
          <StepList steps={legSteps(courier, "return")} />
        </Block>
      )}

      {receiving ? (
        <Notice icon="info">
          {/* The number the customer typed when sealing the return: what the shop checks at the counter. */}
          {courier.return.seal ? `${RECEIPT_NOTE} The seal should read ${courier.return.seal}.` : RECEIPT_NOTE}
        </Notice>
      ) : null}

      {/* A handover record that was never made or finished: the payout still waits for it. */}
      <Records role="owner" moments={["handover"]} booking={booking} receivedAt={receivedAt} stake={payoutPending(booking)} {...names} />
      <RecordCardBody record={record} />

      <ReturnSets
        number={number}
        side="owner"
        otherName={first}
        handoverDay={copy.handoverDay}
        returnDay={copy.returnDay}
        poll={watching && recordWanted("return", booking) && !(flags.mine && flags.theirs)}
      />

      {booking.stage === "returned" && booking.can.includes("report_problem") ? (
        <Panel>
          <LinkRow
            title="Report a problem"
            sub={reportUntilLine(booking.report_problem_until, now) ?? "Something damaged or missing, with photos and an amount."}
            onPress={() => navigation.navigate("ShopReportProblem", { number })}
          />
        </Panel>
      ) : null}

      <ClaimRows ids={booking.claims} role="owner" />

      {out ? <CallButton copy={courierCall(dayBlock(booking))} /> : null}

      <Panel>
        <GetHelp booking={booking} />
      </Panel>

      <Button variant="outline" onPress={() => navigation.navigate("ShopBooking", { number })}>
        Booking details
      </Button>
    </ScrollView>
  );
}
