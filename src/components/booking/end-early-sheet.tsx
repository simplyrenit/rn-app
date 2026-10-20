import { bookingQueryKey, endEarly, fetchEndEarly } from "@/backend/bookings";
import { usePay } from "@/components/booking/use-pay";
import { Button, Skeleton, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { DayPickerModal } from "@/components/shop/day-picker-modal";
import { apiError } from "@/lib/api-error";
import { EndEarlyLine, EndEarlyQuote, endEarlyCopy, endEarlyErrorText, payPeriodErrorText } from "@/lib/billing";
import { BookingCustomer, dayShort } from "@/lib/booking";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

export interface EndEarlySheetHandle {
  present: () => void;
}

function Line({ line, bold = false }: { line: EndEarlyLine; bold?: boolean }) {
  return (
    <View accessible accessibilityLabel={`${line.label}: ${line.value}`} style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
      <Text fontSize="text-md" fontWeight={bold ? "font-bold" : "font-normal"} tone={bold ? "default" : "body"} style={{ flex: 1 }}>
        {line.label}
      </Text>
      <Text fontSize="text-md" fontWeight="font-bold" tone={line.quiet ? "dim" : "default"}>
        {line.value}
      </Text>
    </View>
  );
}

/**
 * Ending a monthly-billed rental early (ENG-282, Figma 9481:5305), built as the cancel sheet is: it first asks the server
 * what ending on a day costs and shows exactly that. The return day can be moved from today to the end of the current
 * month (a later day costs more, an earlier one saves nothing), and each pick asks again. Inside the minimum the notice is
 * paid at once: the end is confirmed, then its pay page opens; unpaid by the return day, it comes out of the deposit.
 */
export const EndEarlySheet = forwardRef<EndEarlySheetHandle, { booking: BookingCustomer }>(({ booking }, ref) => {
  const { number } = booking;
  const { color, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const sheet = useRef<BottomSheetModal>(null);
  const [quote, setQuote] = useState<EndEarlyQuote | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [ending, setEnding] = useState(false);
  const [picking, setPicking] = useState(false);
  const busy = useRef(false);
  // The day last asked about: an answer for an earlier pick that lands late is dropped, never shown or confirmed.
  const asked = useRef<string | null>(null);

  const { phase, pay } = usePay(number, {
    onResult: () => void queryClient.invalidateQueries(bookingQueryKey(number)),
    onError: (error) => toast.error("We couldn't start the payment", { message: payPeriodErrorText(apiError(error)) }),
  });

  // Each ask clears the quote on screen, so no button stands for a day that is no longer the one asked about.
  const load = async (day?: string) => {
    const key = day ?? "";
    asked.current = key;
    setNote(null);
    setFailed(false);
    setQuote(null);
    try {
      const answer = await fetchEndEarly(number, day);
      if (asked.current === key) setQuote(answer);
    } catch (error) {
      if (asked.current !== key) return;
      setFailed(true);
      setNote(endEarlyErrorText(apiError(error)));
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
    if (!quote || busy.current) return;
    busy.current = true;
    setEnding(true);
    setNote(null);
    try {
      const answer = await endEarly(number, quote.day);
      queryClient.setQueryData(bookingQueryKey(number), answer.booking);
      sheet.current?.dismiss();
      toast.success(`Your rental ends on ${dayShort(quote.day)}`);
      // The end stands whatever happens to the payment: an unpaid notice is due on the return day, on the schedule.
      if (answer.payment) void pay(async () => answer.payment);
    } catch (error) {
      const failure = apiError(error);
      setNote(endEarlyErrorText(failure));
      // The day is no longer one that can be picked (midnight passed): ask again for the server's own.
      if (failure?.code === "day_out_of_range") void load();
      // Whatever refused it, the booking behind the sheet is out of date.
      else if (failure && failure.status > 0) void queryClient.invalidateQueries(bookingQueryKey(number));
    } finally {
      busy.current = false;
      setEnding(false);
    }
  };

  const copy = quote ? endEarlyCopy(quote, booking) : null;
  const working = ending || phase === "working";

  return (
    <CustomBottomSheetModal ref={sheet} isDark={isDark} snapPoints={[620 + insets.bottom]} frame>
      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.sm, paddingBottom: insets.bottom + space.sm, gap: space.md }}>
        <View style={{ gap: space.xs }}>
          <Text role="sectionTitle" accessibilityRole="header">
            End the rental early?
          </Text>
          {copy ? (
            <Text fontSize="text-md" tone="body">
              {copy.lead}
            </Text>
          ) : null}
        </View>

        {copy && quote ? (
          <>
            <View
              style={{
                gap: 10,
                paddingHorizontal: space.md,
                paddingVertical: 14,
                borderRadius: radius.card,
                borderWidth: 1,
                borderColor: color.line,
                backgroundColor: color.surface,
              }}
            >
              {copy.lines.map((line) => (
                <Line key={line.label} line={line} />
              ))}
              <View style={{ height: 1, backgroundColor: color.line }} />
              <Line line={copy.total} bold />
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Return day, ${dayShort(quote.day)}. Change it`}
              activeOpacity={0.7}
              disabled={working}
              onPress={() => setPicking(true)}
              style={{
                minHeight: MIN_TOUCH_TARGET + 8,
                flexDirection: "row",
                alignItems: "center",
                gap: space.md,
                paddingHorizontal: space.md,
                borderRadius: radius.card,
                borderWidth: 1,
                borderColor: color.line,
                backgroundColor: color.surface,
              }}
            >
              <Text fontSize="text-md" tone="body" style={{ flex: 1 }}>
                Return day
              </Text>
              <Text fontSize="text-md" fontWeight="font-bold">
                {dayShort(quote.day)}
              </Text>
              <ChevronRightIcon size={20} color={color.textBody} />
            </TouchableOpacity>

            <Text fontSize="text-sm" tone="body">
              {copy.note}
            </Text>
          </>
        ) : failed ? null : (
          <View accessible accessibilityRole="progressbar" accessibilityLabel="Working out what ending early costs">
            <Skeleton width="100%" height={150} />
          </View>
        )}

        {note ? (
          <Text fontSize="text-sm" tone="danger" accessibilityRole="alert">
            {note}
          </Text>
        ) : null}

        <View style={{ gap: space.sm }}>
          {copy ? (
            <Button loading={working} disabled={working} onPress={() => void confirm()}>
              {copy.button}
            </Button>
          ) : failed ? (
            // The server's own day: a day it refused is not asked about again.
            <Button variant="outline" onPress={() => void load()}>
              Try again
            </Button>
          ) : null}
          <Button variant="ghost" disabled={ending} onPress={() => sheet.current?.dismiss()}>
            Keep renting
          </Button>
        </View>
      </View>

      {picking && quote ? (
        <DayPickerModal
          value={quote.day}
          minDate={quote.earliest}
          maxDate={quote.latest}
          title="Return day"
          line={(picked) => (picked ? `The rental ends on ${dayShort(picked)}.` : "Pick the day the rental ends.")}
          onCancel={() => setPicking(false)}
          onPick={(day) => {
            setPicking(false);
            if (day !== quote.day) void load(day);
          }}
        />
      ) : null}
    </CustomBottomSheetModal>
  );
});
