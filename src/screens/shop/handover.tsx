import { useCaptureDraft } from "@/backend/capture-jobs";
import { setDayStatus, startRental } from "@/backend/handover";
import { shopBookingQueryKey, useShopBooking } from "@/backend/shop-ring";
import { refreshShop } from "@/backend/shop-today";
import { BookingLoadError, BookingLoading, MoneyLine, Notice, Panel, Pill, TextButton } from "@/components/booking/parts";
import { useAppActive } from "@/components/booking/use-app-active";
import { useServerNow } from "@/components/booking/use-server-now";
import { CODE_LENGTH, CodeInput } from "@/components/capture/code";
import { MomentSets } from "@/components/capture/moment-sets";
import { UploadNote } from "@/components/capture/upload-note";
import { Button, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { Block, CallButton, LinkRow, StatusButtons, StepList, useGuardedTap } from "@/components/handover/parts";
import { apiError } from "@/lib/api-error";
import { SLOW_POLL_MS } from "@/lib/booking";
import {
  callCopy,
  captured,
  codeErrorText,
  codeIsClosed,
  dayBlock,
  dayErrorText,
  mapsUrl,
  noShowCopy,
  reached,
  statusButtons,
  statusNote,
  whenShort,
} from "@/lib/day-of";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { successFeedback } from "@/lib/haptics";
import { clockSkewMs } from "@/lib/server-clock";
import { BookingShop } from "@/lib/shop-booking";
import { handoverCopy, handoverSteps, payoutWaits, startedCopy } from "@/lib/shop-handover";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useIsFocused, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { Linking, Platform, ScrollView, View } from "react-native";
import { BanknotesIcon, CheckCircleIcon, ClockIcon } from "react-native-heroicons/outline";
import { useQueryClient } from "react-query";

function Handover({ booking, receivedAt, watching }: { booking: BookingShop; receivedAt: number; watching: boolean }) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const queryClient = useQueryClient();
  const keyboard = useKeyboardInset();
  // Moved on twice a minute: the buttons and the no-show row open by the clock.
  const now = useServerNow(booking.server_time, receivedAt, 30_000);
  const { running, run } = useGuardedTap();
  const { number } = booking;
  const first = booking.customer.first_name;
  const day = dayBlock(booking);
  const flags = captured(booking, "handover");
  const draft = useCaptureDraft(number, "handover", "owner");
  const [code, setCode] = useState("");
  const [round, setRound] = useState(0);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);

  const can = (action: string) => booking.can.includes(action);
  const copy = handoverCopy(booking, now);
  const ready = booking.stage === "ready" && !booking.exit;
  const started = booking.stage !== "ready" && !booking.exit;
  const recorded = Boolean(draft?.sealed) || flags.mine;
  const noShow = noShowCopy("owner", day, first, now);
  const key = shopBookingQueryKey(number);
  const map = mapsUrl(booking.customer.coordinates, first, Platform.OS === "ios");
  const sendingStatus = running && running !== "code" ? running : null;

  /** After any refusal the booking is read again: its stage on the server is the truth. */
  const reread = (failure: ReturnType<typeof apiError>) => {
    if (failure && failure.status > 0) void queryClient.invalidateQueries(key);
  };

  const tapStatus = (status: "on_my_way" | "running_late" | "i_am_here") =>
    run(status, async () => {
      try {
        queryClient.setQueryData(key, await setDayStatus<BookingShop>(number, status));
      } catch (error) {
        const failure = apiError(error);
        toast.error("That didn't go through", { message: dayErrorText(failure, now) });
        reread(failure);
      }
    });

  const record = (forOther: boolean) =>
    navigation.navigate("Capture", {
      number,
      moment: "handover",
      role: "owner",
      forOther,
      title: `${booking.product.title} · ${first}`,
      other: first,
      skew_ms: clockSkewMs(booking.server_time, receivedAt),
    });

  const start = () =>
    run("code", async () => {
      if (code.length !== CODE_LENGTH) return;
      setCodeError(null);
      try {
        queryClient.setQueryData(key, await startRental(number, code));
        refreshShop(queryClient);
        successFeedback();
      } catch (error) {
        const failure = apiError(error);
        setCodeError(codeErrorText(failure, now));
        setClosed(codeIsClosed(failure));
        setCode("");
        setRound((r) => r + 1);
        if (failure?.code !== "wrong_code" && failure?.code !== "code_locked") reread(failure);
      }
    });

  const after = started ? startedCopy(booking, now) : null;
  const waits = started ? payoutWaits(booking) : null;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.md, paddingBottom: space.lg + keyboard }}
    >
      <View style={{ gap: 2 }}>
        <Text role="screenTitle" accessibilityRole="header">
          {copy.title}
        </Text>
        <Text fontSize="text-md" tone="body">
          {copy.sub}
        </Text>
      </View>

      {booking.exit ? (
        <Notice icon="info">This booking has ended. Open it to see what happened.</Notice>
      ) : null}

      <Panel style={{ padding: space.md, gap: space.sm }}>
        <Text fontSize="text-md" fontWeight="font-bold">
          {copy.who}
        </Text>
        {copy.pills.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {copy.pills.map((pill) => (
              <Pill key={pill.label} label={pill.label} tone={pill.tone} />
            ))}
          </View>
        ) : null}
        {copy.address ? (
          <Text
            fontSize="text-md"
            tone="body"
            selectable
            accessibilityRole={map ? "link" : undefined}
            onPress={map ? () => void Linking.openURL(map).catch(() => toast.error("Maps could not be opened")) : undefined}
          >
            {`Deliver to: ${copy.address}`}
          </Text>
        ) : null}
      </Panel>

      {ready ? (
        <Block title={copy.letKnow}>
          <StatusButtons
            buttons={statusButtons("owner", booking.delivery_mode)}
            mine={day.my_status}
            disabled={!can("set_status") || !reached(day.call_from, now)}
            sending={sendingStatus}
            onTap={(status) => void tapStatus(status)}
          />
          {statusNote(day, now) ? (
            <Text fontSize="text-xs" tone="body" style={{ textAlign: "center" }}>
              {statusNote(day, now)}
            </Text>
          ) : null}
          <CallButton copy={callCopy("owner", day, first, now)} />
        </Block>
      ) : null}

      <Block title="At the handover">
        <StepList steps={handoverSteps(booking, recorded)} />
      </Block>

      {booking.claim_open ? (
        <Notice tone="warning" icon="clock">
          {`${first} reported the item as not as described. Renit decides by the end of tomorrow, and the code is paused until then.`}
        </Notice>
      ) : null}

      {ready && !recorded && (can("capture_handover") || draft) ? (
        <Button onPress={() => record(false)}>{draft ? "Continue recording the condition" : "Start recording the condition"}</Button>
      ) : null}

      <UploadNote number={number} moment="handover" side="owner" />

      {recorded || flags.theirs ? (
        <MomentSets
          number={number}
          moment="handover"
          side="owner"
          otherName={first}
          otherTitle={`${first}'s`}
          poll={watching && !(flags.mine && flags.theirs)}
        />
      ) : null}

      {ready && recorded && !flags.theirs ? (
        <TextButton label={`${first}'s phone can't record?`} onPress={() => record(true)} />
      ) : null}

      {ready && can("enter_handover_code") && !booking.claim_open ? (
        <Block title={copy.codeTitle}>
          <Text fontSize="text-sm" tone="body">
            {copy.codeSub}
          </Text>
          {!recorded ? (
            <Notice tone="warning" icon="warning">
              Record the condition first. You are paid only once your photos and video have uploaded.
            </Notice>
          ) : null}
          {closed ? null : <CodeInput round={round} disabled={running === "code"} onChange={(value) => (setCode(value), setCodeError(null))} />}
          {codeError ? (
            <Text fontSize="text-sm" tone="danger" accessibilityRole="alert" style={{ textAlign: "center" }}>
              {codeError}
            </Text>
          ) : null}
          {closed ? null : (
            <Button onPress={() => void start()} loading={running === "code"} disabled={running !== null || code.length !== CODE_LENGTH}>
              Start the rental
            </Button>
          )}
          <Text fontSize="text-xs" tone="body" style={{ textAlign: "center" }}>
            {`If ${first}'s phone is off and the code can't be shown, Renit's desk can finish the handover by phone.`}
          </Text>
        </Block>
      ) : null}

      {ready && !can("enter_handover_code") && !booking.claim_open && !reached(day.call_from, now) ? (
        <Notice icon="clock">
          {day.call_from
            ? `${first}'s code can be typed from ${whenShort(day.call_from, now)}: a rental can't be started before its day.`
            : `${first}'s code can be typed once an arrival window is picked.`}
        </Notice>
      ) : null}

      {after ? (
        <View
          style={{
            gap: space.md,
            padding: space.md,
            borderRadius: radius.card,
            backgroundColor: color.successWash,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <CheckCircleIcon size={24} color={color.success} />
            <Text fontSize="text-md" fontWeight="font-bold" tone="success" style={{ flex: 1 }}>
              {after.title}
            </Text>
          </View>
          {after.payout ? (
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <BanknotesIcon size={20} color={color.text} />
              <Text fontSize="text-md" style={{ flex: 1 }}>
                {after.payout}
              </Text>
            </View>
          ) : null}
          {waits ? (
            <Text fontSize="text-sm" tone="body">
              {waits}
            </Text>
          ) : null}
          <MoneyLine label="Renit's fee" amount={after.fee.charged} struck={after.fee.struck ?? undefined} />
          {after.dueBack ? (
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <ClockIcon size={20} color={color.text} />
              <Text fontSize="text-md" style={{ flex: 1 }}>
                {after.dueBack}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {ready ? (
        <Panel>
          <LinkRow
            title={noShow.title}
            sub={noShow.sub}
            disabled={!noShow.open || !can("no_show")}
            onPress={() =>
              navigation.navigate("BookingReport", {
                number,
                kind: "no_show",
                role: "owner",
                name: first,
                mode: booking.delivery_mode,
              })
            }
          />
        </Panel>
      ) : null}

      <Button variant="outline" onPress={() => navigation.navigate("ShopBooking", { number })}>
        Booking details
      </Button>
    </ScrollView>
  );
}

/**
 * SH-08 and SH-09, the shop's handover: who is coming and when, the preset
 * buttons the shop sees (the waiting side sees two, decision A-36), Call, the
 * capture, both sets side by side, and typing the customer's code, which starts
 * the rental and the owner's payout. The payout itself waits for the owner's
 * record to upload, and the screen says so. "They did not come" opens thirty
 * minutes after the window, by the server's clock, with a photo.
 */
export default function ShopHandoverScreen() {
  const { params } = useRoute<RouteProps<"ShopHandover">>();
  const focused = useIsFocused();
  const active = useAppActive();
  const watching = focused && active;
  const query = useShopBooking(params.number);
  const { refetch } = query;
  const booking = query.data;

  useEffect(() => {
    if (watching) void refetch();
  }, [watching, refetch]);

  // On the day the customer's taps and their record change this screen; a push says so too.
  const waiting = watching && booking?.stage === "ready" && !booking.exit;
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => void refetch(), SLOW_POLL_MS);
    return () => clearInterval(timer);
  }, [waiting, refetch]);

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Handover" />
      {booking ? (
        <Handover booking={booking} receivedAt={query.dataUpdatedAt} watching={watching} />
      ) : query.isError ? (
        <BookingLoadError error={query.error} what="this booking" onRetry={() => void refetch()} />
      ) : (
        <BookingLoading label="Loading the booking" />
      )}
    </NonScrollableContainer>
  );
}
