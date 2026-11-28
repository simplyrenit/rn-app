import { fetchWindows } from "@/backend/bookings";
import { askWindowChange } from "@/backend/shop-bookings";
import { refreshShop } from "@/backend/shop-today";
import { shopBookingQueryKey } from "@/backend/shop-ring";
import { SheetFooter, SheetHeader, Skeleton, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { apiError } from "@/lib/api-error";
import { TimeWindow, dayLong, windowLabel } from "@/lib/booking";
import { RadioCard } from "@/components/shop/shop-cancel-sheet";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { WINDOW_ROW, WINDOW_ROW_GAP, shopActionErrorText, windowSheetHeight } from "@/lib/shop-booking";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

export interface WindowChangeSheetHandle {
  present: () => void;
}

/**
 * "Ask to change the time" (SH-07): the one-hour windows left on the first day,
 * exactly as the server lists them (inside the shop's hours, or the courier's
 * slots at any hour, ENG-408). Picking one sends a
 * request; the arrival time stays as it is until the customer accepts, and the
 * request shows under their Today.
 */
export const WindowChangeSheet = forwardRef<WindowChangeSheetHandle, { number: string; firstName: string }>(
  ({ number, firstName }, ref) => {
    const { color, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const sheet = useRef<BottomSheetModal>(null);
    const [day, setDay] = useState<string | null>(null);
    const [windows, setWindows] = useState<TimeWindow[] | null>(null);
    const [picked, setPicked] = useState<string | null>(null);
    const [note, setNote] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const [sending, setSending] = useState(false);
    const busy = useRef(false);

    const load = async () => {
      setWindows(null);
      setPicked(null);
      setNote(null);
      setFailed(false);
      try {
        const answer = await fetchWindows(number);
        setDay(answer.day);
        setWindows(answer.windows);
      } catch (error) {
        setFailed(true);
        setNote(shopActionErrorText(apiError(error)));
      }
    };

    useImperativeHandle(ref, () => ({
      present: () => {
        sheet.current?.present();
        void load();
      },
    }));

    const send = async () => {
      if (!picked || busy.current) return;
      busy.current = true;
      setSending(true);
      setNote(null);
      try {
        const booking = await askWindowChange(number, picked);
        queryClient.setQueryData(shopBookingQueryKey(number), booking);
        refreshShop(queryClient);
        sheet.current?.dismiss();
        toast.success(`Asked ${firstName}`, { message: "The time stays as it is until they accept." });
      } catch (error) {
        const failure = apiError(error);
        setNote(shopActionErrorText(failure));
        // A taken slot, or a change that is already waiting: read both again.
        if (failure && failure.status > 0) {
          setPicked(null);
          void queryClient.invalidateQueries(shopBookingQueryKey(number));
          void load();
        }
      } finally {
        busy.current = false;
        setSending(false);
      }
    };

    const ask = { label: `Ask ${firstName}`, onPress: () => void send(), disabled: !picked || sending, loading: sending };
    return (
      <CustomBottomSheetModal
        ref={sheet}
        isDark={isDark}
        snapPoints={[windowSheetHeight(failed ? "failed" : windows ? windows.length : "loading") + insets.bottom]}
        frame
        scrollView={false}
      >
        <SheetHeader title="Ask to change the time" grabber={false} />
        {/* The footer stays pinned; a long list or a note under it scrolls here. */}
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 24, gap: 16 }}
        >
          <Text fontSize="text-sm" tone="body">
            {day ? `${dayLong(day)} · ${firstName} answers it` : `${firstName} answers it`}
          </Text>
          {windows ? (
            windows.length === 0 ? (
              <Text fontSize="text-md" tone="body">
                No other time is left on that day.
              </Text>
            ) : (
              <View accessibilityRole="radiogroup" style={{ gap: WINDOW_ROW_GAP }}>
                {windows.map((w) => (
                  <RadioCard key={w.start} title={windowLabel(w)} selected={picked === w.start} onPress={() => setPicked(w.start)} />
                ))}
              </View>
            )
          ) : failed ? null : (
            <View accessible accessibilityRole="progressbar" accessibilityLabel="Loading the times" style={{ gap: WINDOW_ROW_GAP }}>
              <Skeleton width="100%" height={WINDOW_ROW} />
              <Skeleton width="100%" height={WINDOW_ROW} />
            </View>
          )}
          {note ? (
            <Text fontSize="text-sm" accessibilityRole="alert" style={{ color: color.danger }}>
              {note}
            </Text>
          ) : null}
        </BottomSheetScrollView>
        <SheetFooter
          primary={failed ? { label: "Try again", onPress: () => void load() } : ask}
          secondary={{ label: "Not now", onPress: () => sheet.current?.dismiss(), disabled: sending }}
        />
      </CustomBottomSheetModal>
    );
  }
);
