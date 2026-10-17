import { fetchWindows } from "@/backend/bookings";
import { askWindowChange } from "@/backend/shop-bookings";
import { refreshShop } from "@/backend/shop-today";
import { shopBookingQueryKey } from "@/backend/shop-ring";
import { Button, Skeleton, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { apiError } from "@/lib/api-error";
import { TimeWindow, dayLong, windowLabel } from "@/lib/booking";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { shopActionErrorText } from "@/lib/shop-booking";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

export interface WindowChangeSheetHandle {
  present: () => void;
}

/**
 * "Ask to change the time" (SH-07): the one-hour windows left on the first day,
 * inside the shop's hours, exactly as the server lists them. Picking one sends a
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

    return (
      <CustomBottomSheetModal ref={sheet} isDark={isDark} snapPoints={[520 + insets.bottom]} frame>
        <View
          style={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: space.sm,
            paddingBottom: insets.bottom + space.sm,
            gap: space.md,
          }}
        >
          <View style={{ gap: space.xs }}>
            <Text role="sectionTitle" accessibilityRole="header">
              Ask to change the time
            </Text>
            <Text fontSize="text-sm" tone="body">
              {day ? `${dayLong(day)} · ${firstName} answers it` : `${firstName} answers it`}
            </Text>
          </View>
          {windows ? (
            windows.length === 0 ? (
              <Text fontSize="text-md" tone="body">
                No other time is left on that day.
              </Text>
            ) : (
              <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
                {windows.map((w) => {
                  const selected = picked === w.start;
                  return (
                    <TouchableOpacity
                      key={w.start}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      activeOpacity={0.8}
                      onPress={() => setPicked(w.start)}
                      style={{
                        minHeight: MIN_TOUCH_TARGET + 6,
                        justifyContent: "center",
                        paddingHorizontal: space.md,
                        borderRadius: radius.input,
                        borderWidth: selected ? 2 : 1,
                        borderColor: selected ? color.brand : color.line,
                        backgroundColor: selected ? color.brandWash : color.surface,
                      }}
                    >
                      <Text fontSize="text-md" fontWeight="font-bold">
                        {windowLabel(w)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )
          ) : failed ? null : (
            <View accessible accessibilityRole="progressbar" accessibilityLabel="Loading the times" style={{ gap: space.sm }}>
              <Skeleton width="100%" height={56} />
              <Skeleton width="100%" height={56} />
            </View>
          )}
          {note ? (
            <Text fontSize="text-sm" accessibilityRole="alert" style={{ color: color.danger }}>
              {note}
            </Text>
          ) : null}
          <View style={{ gap: space.sm }}>
            {failed ? (
              <Button variant="outline" onPress={() => void load()}>
                Try again
              </Button>
            ) : (
              <Button loading={sending} disabled={!picked || sending} onPress={() => void send()}>
                {`Ask ${firstName}`}
              </Button>
            )}
            <Button variant="ghost" disabled={sending} onPress={() => sheet.current?.dismiss()}>
              Not now
            </Button>
          </View>
        </View>
      </CustomBottomSheetModal>
    );
  }
);
