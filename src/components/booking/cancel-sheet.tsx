import { bookingQueryKey, cancelBooking, fetchCancelOutcome, readUntilRefund } from "@/backend/bookings";
import { Button, Skeleton, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { apiError } from "@/lib/api-error";
import { BookingCustomer, CancelOutcome, cancelCopy, cancelErrorText, cancelledKey } from "@/lib/booking";
import { cancelHead } from "@/lib/booking-lines";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

export interface CancelSheetHandle {
  present: () => void;
}

const isOutcome = (value: unknown): value is CancelOutcome =>
  typeof value === "object" && value !== null && typeof (value as CancelOutcome).case === "string";

/**
 * Cancelling a request or a booking. The sheet first asks the server what
 * cancelling would do to the money and shows exactly that; the cancel call then
 * says which outcome was shown (`case`, decision A-33). If the booking has moved
 * on in between (the owner accepted a second ago, the free time just ended) the
 * server cancels nothing and sends the new outcome, which replaces the one on
 * screen and is asked about again. So a tap never costs more than the sheet said.
 */
/**
 * `courier`: a B1 courier booking, whose courier fee the sheet never says goes to the owner. `booking`: with several items
 * the sheet first says the cancel covers all of them, and whether they stay in the cart (CT-33).
 */
export const CancelSheet = forwardRef<
  CancelSheetHandle,
  { number: string; courier?: boolean; booking?: BookingCustomer }
>(({ number, courier = false, booking }, ref) => {
  const { color, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const sheet = useRef<BottomSheetModal>(null);
  const [outcome, setOutcome] = useState<CancelOutcome | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const busy = useRef(false);

  const load = async () => {
    setOutcome(null);
    setNote(null);
    setFailed(false);
    try {
      setOutcome(await fetchCancelOutcome(number));
    } catch (error) {
      setFailed(true);
      setNote(cancelErrorText(apiError(error)));
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      present: () => {
        sheet.current?.present();
        void load();
      },
    }),
    // `load` reads only the booking number.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [number]
  );

  const confirm = async () => {
    if (!outcome || busy.current) return;
    busy.current = true;
    setCancelling(true);
    setNote(null);
    try {
      const answer = await cancelBooking(number, outcome.case);
      // The page behind says what the server did with the money (the outcome it carried out, else the one shown here).
      // Set before the booking, so the booking's re-render already has it.
      const done = answer.outcome ?? outcome;
      queryClient.setQueryData(cancelledKey(number), done);
      queryClient.setQueryData(bookingQueryKey(number), answer.booking);
      // The refund row comes a few seconds after the cancel: read the booking again until it is there.
      void readUntilRefund(queryClient, number, done);
      sheet.current?.dismiss();
      toast.success(outcome.case === "ringing" ? "Request cancelled" : "Booking cancelled");
    } catch (error) {
      const failure = apiError(error);
      setNote(cancelErrorText(failure));
      const next = failure?.details?.outcome;
      if (failure?.code === "outcome_changed" && isOutcome(next)) setOutcome(next);
      // Whatever refused it, the booking on screen behind the sheet is out of date.
      else if (failure && failure.status > 0) void queryClient.invalidateQueries(bookingQueryKey(number));
    } finally {
      busy.current = false;
      setCancelling(false);
    }
  };

  const copy = outcome ? cancelCopy(outcome, courier) : null;
  const head = outcome && booking ? cancelHead(outcome, booking) : null;

  return (
    <CustomBottomSheetModal ref={sheet} isDark={isDark} snapPoints={[(head ? 500 : 380) + insets.bottom]} frame>
      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.sm,
          paddingBottom: insets.bottom + space.sm,
          gap: space.md,
        }}
      >
        <Text role="sectionTitle" accessibilityRole="header">
          {copy?.title ?? "Cancel?"}
        </Text>
        {head ? (
          <View style={{ gap: 2, padding: space.md, borderRadius: radius.button, backgroundColor: color.surfaceRaised }}>
            <Text fontSize="text-md" fontWeight="font-bold">
              {head.title}
            </Text>
            {head.sub ? (
              <Text fontSize="text-sm" tone="body">
                {head.sub}
              </Text>
            ) : null}
          </View>
        ) : null}
        {copy ? (
          <View style={{ gap: space.xs }}>
            {[...copy.lines, ...(head?.stay ? [head.stay] : [])].map((line) => (
              <Text key={line} fontSize="text-md" tone="body">
                {line}
              </Text>
            ))}
          </View>
        ) : failed ? null : (
          <View accessible accessibilityRole="progressbar" accessibilityLabel="Working out what cancelling does">
            <Skeleton width="100%" height={48} />
          </View>
        )}
        {note ? (
          <Text fontSize="text-sm" accessibilityRole="alert" style={{ color: color.danger }}>
            {note}
          </Text>
        ) : null}
        <View style={{ gap: space.sm }}>
          {copy ? (
            <Button variant="warning" loading={cancelling} disabled={cancelling} onPress={confirm}>
              {copy.confirm}
            </Button>
          ) : failed ? (
            <Button variant="outline" onPress={() => void load()}>
              Try again
            </Button>
          ) : null}
          <Button variant="ghost" disabled={cancelling} onPress={() => sheet.current?.dismiss()}>
            Keep it
          </Button>
        </View>
      </View>
    </CustomBottomSheetModal>
  );
});
