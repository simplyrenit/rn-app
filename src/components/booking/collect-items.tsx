import { bookingQueryKey } from "@/backend/bookings";
import { postReceived } from "@/backend/handover";
import { ItemRow } from "@/components/booking/items";
import { Panel, Pill, TextButton } from "@/components/booking/parts";
import { Button, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { apiError } from "@/lib/api-error";
import { BookingCustomer, BookingLine } from "@/lib/booking";
import {
  Received,
  Tick,
  Ticks,
  liveLines,
  notHereCopy,
  receivedBody,
  rememberTicks,
  rememberedTicks,
  ticksOf,
} from "@/lib/booking-lines";
import { dayErrorText, telUrl } from "@/lib/day-of";
import { track } from "@/lib/events";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef, useState } from "react";
import { Linking, TouchableOpacity, View } from "react-native";
import { CheckCircleIcon, CheckIcon, XMarkIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

/**
 * The day-of ticks on a booking of several items (cart D44, CT-34): Got it or Not here for each item. The code shows once
 * every item has one; the ticks then go to the server as evidence (logged once). They never hold the code back: a counter
 * with no signal must still be able to hand over, so a send that fails is offered again (`retry`) while the code stays.
 * Undo works until the server has them; this phone keeps the server's answer for the rest of the run.
 */
export function useItemTicks(booking: BookingCustomer, now: Date) {
  const queryClient = useQueryClient();
  // Back on this screen in the same run: the server's ticks, or the phone's whose send failed (offered again).
  const kept = rememberedTicks(booking.number);
  const [posted, setPosted] = useState<Received | null>(kept?.logged ? kept.received : null);
  const [draft, setDraft] = useState<Ticks>(kept && !kept.logged ? ticksOf(kept.received) : {});
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(Boolean(kept && !kept.logged));

  const send = async (body: Received) => {
    setSending(true);
    setFailed(false);
    // Kept before the send: the rental screen's prompt to report what was Not here must not depend on the signal.
    rememberTicks(booking.number, body, false);
    try {
      const answer = await postReceived(booking.number, body);
      rememberTicks(booking.number, answer, true);
      setPosted(answer);
      track("handover_items_ticked", { booking: booking.number, not_here: answer.not_here.length });
    } catch (error) {
      const failure = apiError(error);
      if (failure?.code === "validation_error") {
        // The booking's items are not the ones on screen: read it again and tick afresh.
        setDraft({});
        toast.error("Your ticks didn't go through", { message: "The items of this booking changed. Tick them again." });
      } else {
        setFailed(true);
        toast.error("Your ticks didn't reach Renit", { message: dayErrorText(failure, now) });
      }
      if (failure && failure.status > 0) void queryClient.invalidateQueries(bookingQueryKey(booking.number));
    } finally {
      setSending(false);
    }
  };

  const tick = (line: BookingLine, value: Tick) => {
    if (posted || sending) return;
    const next = { ...draft, [line.id]: value };
    setDraft(next);
    const body = receivedBody(booking, next);
    if (body) void send(body);
  };

  const undo = (line: BookingLine) => {
    if (posted || sending) return;
    setFailed(false);
    setDraft((ticks) => Object.fromEntries(Object.entries(ticks).filter(([id]) => Number(id) !== line.id)));
  };

  const retry = () => {
    const body = receivedBody(booking, draft);
    if (body && !posted && !sending) void send(body);
  };

  const ticks = posted ? ticksOf(posted) : draft;
  return { ticks, posted, sending, failed, done: receivedBody(booking, ticks) !== null, tick, undo, retry };
}

function TickButton({ label, Icon, disabled, onPress }: { label: string; Icon: typeof CheckIcon; disabled: boolean; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: MIN_TOUCH_TARGET,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: space.xs,
        borderRadius: radius.button,
        borderWidth: 1,
        borderColor: color.inputLine,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon size={18} color={color.text} />
      <Text fontSize="text-md" fontWeight="font-bold">
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * CT-34a, "Collect these 3 items". `open`: ticks can be sent (from two hours before the window, as the server allows);
 * before then the buttons wait and `closedNote` says when. `onNotHere` opens the sheet for that item instead of ticking it.
 */
export function CollectItems({
  booking,
  ticks,
  sent,
  sending,
  failed,
  open,
  closedNote,
  onTick,
  onUndo,
  onNotHere,
  onRetry,
}: {
  booking: BookingCustomer;
  ticks: Ticks;
  sent: boolean;
  sending: boolean;
  /** The last send failed: the code shows anyway, and the ticks can go again. */
  failed: boolean;
  open: boolean;
  closedNote: string | null;
  onTick: (line: BookingLine) => void;
  onUndo: (line: BookingLine) => void;
  onNotHere: (line: BookingLine) => void;
  onRetry: () => void;
}) {
  const { color } = useTheme();
  const live = liveLines(booking);
  return (
    <View style={{ gap: space.sm }}>
      <Text role="sectionTitle" accessibilityRole="header">
        {`Collect these ${live.length} items`}
      </Text>
      <Text fontSize="text-sm" tone="body">
        {sent
          ? "Your ticks are with Renit."
          : (open ? null : closedNote) ??
            `Tap Undo if you ticked the wrong item. Your code shows once all ${live.length} are ticked.`}
      </Text>
      <Panel style={{ paddingHorizontal: space.md }}>
        {live.map((line, index) => {
          const tick = ticks[line.id];
          return (
            <ItemRow
              key={line.id}
              first={index === 0}
              title={line.product.title}
              image={line.product.cover_image}
              right={tick === "got" ? <CheckCircleIcon size={22} color={color.success} accessibilityLabel="Got it" /> : null}
            >
              {tick ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                  <Pill label={tick === "got" ? "Got it" : "Not here"} tone={tick === "got" ? "success" : "warning"} />
                  {sent ? null : (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Undo: ${line.product.title}`}
                      disabled={sending}
                      onPress={() => onUndo(line)}
                      style={{ minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET, justifyContent: "center" }}
                    >
                      <Text fontSize="text-sm" fontWeight="font-bold" tone="brand">
                        Undo
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={{ flexDirection: "row", gap: space.sm }}>
                  <TickButton label="Got it" Icon={CheckIcon} disabled={!open || sending} onPress={() => onTick(line)} />
                  <TickButton label="Not here" Icon={XMarkIcon} disabled={!open || sending} onPress={() => onNotHere(line)} />
                </View>
              )}
            </ItemRow>
          );
        })}
      </Panel>
      {failed ? <TextButton label="Your ticks didn't reach Renit. Send them again" disabled={sending} onPress={onRetry} /> : null}
    </View>
  );
}

type Choice = "ask" | "take" | "refuse";

/** A radio choice with a line under it: the "Not here" sheet's three, the problem report's two. */
export function ChoiceRow({ title, sub, selected, onPress }: { title: string; sub: string; selected: boolean; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        flexDirection: "row",
        gap: space.sm,
        padding: space.md,
        borderRadius: radius.input,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? color.brand : color.line,
        backgroundColor: selected ? color.brandWash : color.surface,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          marginTop: 1,
          borderRadius: radius.full,
          borderWidth: 2,
          borderColor: selected ? color.brand : color.inputLine,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? <View style={{ width: 10, height: 10, borderRadius: radius.full, backgroundColor: color.brand }} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text fontSize="text-md" fontWeight="font-bold">
          {title}
        </Text>
        <Text fontSize="text-sm" tone="body">
          {sub}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * CT-45a, "The lens isn't here?": Ask the shop (a call; it may still be in the car), Take the rest and report (the item is
 * ticked Not here and the code shows for the rest; the report on it is filed after the handover, where the server takes
 * it), or Refuse everything (today's refusal at the door, for every item). `callNumber`: the shop's, once calls are open.
 */
export const NotHereSheet = forwardRef<
  BottomSheetModal,
  {
    booking: BookingCustomer;
    line: BookingLine | null;
    callNumber: string | null;
    canRefuse: boolean;
    onTake: (line: BookingLine) => void;
    onRefuse: () => void;
  }
>(({ booking, line, callNumber, canRefuse, onTake, onRefuse }, ref) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [choice, setChoice] = useState<Choice>("ask");
  const copy = line ? notHereCopy(booking, line) : null;
  const dismiss = () => (ref && "current" in ref ? ref.current?.dismiss() : undefined);

  const go = () => {
    if (!line) return;
    if (choice === "ask") {
      if (callNumber) {
        void Linking.openURL(telUrl(callNumber)).catch(() =>
          toast.error("The call could not be started", { message: "Check that this phone can make calls." })
        );
      }
      return;
    }
    dismiss();
    if (choice === "take") onTake(line);
    else onRefuse();
  };

  return (
    <CustomBottomSheetModal ref={ref} isDark={isDark} snapPoints={[600 + insets.bottom]} frame onDismiss={() => setChoice("ask")}>
      {copy ? (
        <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.sm, paddingBottom: insets.bottom + space.sm, gap: space.md }}>
          <View style={{ gap: space.xs }}>
            <Text role="sectionTitle" accessibilityRole="header">
              {copy.title}
            </Text>
            <Text fontSize="text-sm" tone="body">
              {copy.sub}
            </Text>
          </View>
          <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
            <ChoiceRow {...copy.ask} selected={choice === "ask"} onPress={() => setChoice("ask")} />
            <ChoiceRow {...copy.take} selected={choice === "take"} onPress={() => setChoice("take")} />
            {canRefuse ? <ChoiceRow {...copy.refuse} selected={choice === "refuse"} onPress={() => setChoice("refuse")} /> : null}
          </View>
          <Button variant={choice === "refuse" ? "warning" : "primary"} disabled={choice === "ask" && !callNumber} onPress={go}>
            {choice === "ask" ? `Call ${booking.shop.name}` : choice === "take" ? "Take the rest" : "Refuse everything"}
          </Button>
          {choice === "ask" && !callNumber ? (
            <Text fontSize="text-xs" tone="body" style={{ textAlign: "center" }}>
              Calls open shortly before the arrival window. Renit's desk is on Get help.
            </Text>
          ) : null}
        </View>
      ) : null}
    </CustomBottomSheetModal>
  );
});
