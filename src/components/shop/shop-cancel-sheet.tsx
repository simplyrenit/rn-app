import { cancelShopBooking, fetchShopCancelWarning } from "@/backend/shop-bookings";
import { refreshShop } from "@/backend/shop-today";
import { shopBookingQueryKey } from "@/backend/shop-ring";
import { Button, Skeleton, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { apiError } from "@/lib/api-error";
import { SCREEN_GUTTER, space } from "@/lib/design-tokens";
import { ShopCancelWarning, cancelWarningCopy, shopActionErrorText } from "@/lib/shop-booking";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

export interface ShopCancelSheetHandle {
  present: () => void;
}

/**
 * The shop cancels after accepting (API-CONTRACT OE-F). The sheet first asks the
 * server what cancelling would do and shows exactly that, in the server's own
 * lines: the customer is refunded in full, it is marked on the shop's record, and
 * a second one in 30 days pauses its listings. Nothing is cancelled until the
 * second button, which sends `confirm: true`.
 */
export const ShopCancelSheet = forwardRef<ShopCancelSheetHandle, { number: string }>(({ number }, ref) => {
  const { color, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const sheet = useRef<BottomSheetModal>(null);
  const [warning, setWarning] = useState<ShopCancelWarning | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const busy = useRef(false);

  const load = async () => {
    setWarning(null);
    setNote(null);
    setFailed(false);
    try {
      setWarning(await fetchShopCancelWarning(number));
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

  const confirm = async () => {
    if (!warning || busy.current) return;
    busy.current = true;
    setCancelling(true);
    setNote(null);
    try {
      const booking = await cancelShopBooking(number);
      queryClient.setQueryData(shopBookingQueryKey(number), booking);
      refreshShop(queryClient);
      sheet.current?.dismiss();
      toast.success("Booking cancelled", { message: "The customer has been refunded." });
    } catch (error) {
      const failure = apiError(error);
      setNote(shopActionErrorText(failure));
      // Whatever refused it, the booking behind the sheet may be out of date.
      if (failure && failure.status > 0) void queryClient.invalidateQueries(shopBookingQueryKey(number));
    } finally {
      busy.current = false;
      setCancelling(false);
    }
  };

  const copy = warning ? cancelWarningCopy(warning) : null;

  return (
    <CustomBottomSheetModal ref={sheet} isDark={isDark} snapPoints={[400 + insets.bottom]} frame>
      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.sm,
          paddingBottom: insets.bottom + space.sm,
          gap: space.md,
        }}
      >
        <Text role="sectionTitle" accessibilityRole="header">
          {copy?.title ?? "Cancel this booking?"}
        </Text>
        {copy ? (
          <View style={{ gap: space.xs }}>
            {copy.lines.map((line) => (
              <Text key={line} fontSize="text-md" tone="body">
                {line}
              </Text>
            ))}
          </View>
        ) : failed ? null : (
          <View accessible accessibilityRole="progressbar" accessibilityLabel="Working out what cancelling does">
            <Skeleton width="100%" height={72} />
          </View>
        )}
        {note ? (
          <Text fontSize="text-sm" accessibilityRole="alert" style={{ color: color.danger }}>
            {note}
          </Text>
        ) : null}
        <View style={{ gap: space.sm }}>
          {copy ? (
            <Button variant="warning" loading={cancelling} disabled={cancelling} onPress={() => void confirm()}>
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
