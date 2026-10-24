import { cancelShopBooking, fetchShopCancelWarning } from "@/backend/shop-bookings";
import { refreshShop } from "@/backend/shop-today";
import { shopBookingQueryKey } from "@/backend/shop-ring";
import { Button, Skeleton, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { apiError } from "@/lib/api-error";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { ShopCancelWarning, cancelWarningCopy, shopActionErrorText } from "@/lib/shop-booking";
import { ShopLine, cancelAfter, isBasket, liveLines } from "@/lib/shop-lines";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

export interface ShopCancelSheetHandle {
  present: () => void;
}

/** One choice of "Which item can't you give?". */
function Choice({ title, sub, selected, onPress }: { title: string; sub: string; selected: boolean; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}. ${sub}`}
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        minHeight: MIN_TOUCH_TARGET + 12,
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        borderRadius: radius.input,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? color.brand : color.line,
        backgroundColor: selected ? color.brandWash : color.surface,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
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
 * The shop cancels after accepting (API-CONTRACT OE-F). The sheet first asks the
 * server what cancelling would do and shows exactly that, in the server's own
 * lines: the customer is refunded in full, it is marked on the shop's record, and
 * a second one in 30 days pauses its listings. Nothing is cancelled until the
 * second button, which sends `confirm: true`.
 *
 * A booking of several items (MR-08, cart D46) can't lose one item: the whole booking is cancelled, and the sheet asks
 * which item the shop can't give (`line`), or "It's not one item". The customer can then book the rest again.
 */
export const ShopCancelSheet = forwardRef<
  ShopCancelSheetHandle,
  { number: string; lines?: ShopLine[]; firstName?: string }
>(({ number, lines, firstName = "The customer" }, ref) => {
  const { color, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const sheet = useRef<BottomSheetModal>(null);
  const [warning, setWarning] = useState<ShopCancelWarning | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const busy = useRef(false);
  // A basket's choice: a line id, `null` for "It's not one item", undefined until one is picked.
  const basket = isBasket({ lines });
  const live = liveLines({ lines });
  const [line, setLine] = useState<number | null | undefined>(undefined);

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
      setLine(undefined);
      sheet.current?.present();
      void load();
    },
  }));

  const confirm = async () => {
    if (!warning || busy.current || (basket && line === undefined)) return;
    busy.current = true;
    setCancelling(true);
    setNote(null);
    try {
      const booking = await cancelShopBooking(number, basket ? line ?? null : null);
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
  const after = basket ? cancelAfter(firstName, { lines }, line ?? null) : null;

  return (
    <CustomBottomSheetModal ref={sheet} isDark={isDark} snapPoints={basket ? ["90%"] : [400 + insets.bottom]} frame>
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
        {basket ? (
          <>
            <Text fontSize="text-md" tone="body">
              You can't cancel one item. The whole booking is cancelled.
            </Text>
            <Text fontSize="text-md" fontWeight="font-bold">
              Which item can't you give?
            </Text>
            <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
              {live.map((l) => (
                <Choice key={l.id} title={l.product.title} sub={l.ref} selected={line === l.id} onPress={() => setLine(l.id)} />
              ))}
              <Choice title="It's not one item" sub="Something else stops the booking" selected={line === null} onPress={() => setLine(null)} />
            </View>
          </>
        ) : null}
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
        {after ? (
          <Text fontSize="text-sm" tone="body">
            {after}
          </Text>
        ) : null}
        {note ? (
          <Text fontSize="text-sm" accessibilityRole="alert" style={{ color: color.danger }}>
            {note}
          </Text>
        ) : null}
        <View style={{ gap: space.sm }}>
          {copy ? (
            <Button
              variant="warning"
              loading={cancelling}
              disabled={cancelling || (basket && line === undefined)}
              onPress={() => void confirm()}
            >
              {basket ? "Cancel the whole booking" : copy.confirm}
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
