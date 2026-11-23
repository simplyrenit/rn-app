import { cancelShopBooking, fetchShopCancelWarning } from "@/backend/shop-bookings";
import { refreshShop } from "@/backend/shop-today";
import { shopBookingQueryKey } from "@/backend/shop-ring";
import { Button, SheetFooter, SheetHeader, Skeleton, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { apiError } from "@/lib/api-error";
import { SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { ShopCancelWarning, cancelWarningCopy, shopActionErrorText } from "@/lib/shop-booking";
import { ShopLine, cancelAfter, isBasket, liveLines } from "@/lib/shop-lines";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

export interface ShopCancelSheetHandle {
  present: () => void;
}

/**
 * A radio card of the 08 sheets (2094:24377 windows, 2094:24597 "Which item can't you give?"): padded 14/16 inside a
 * 1pt `line` edge, r12, a 22 ring at 60% beside SemiBold 16/24, and `sub` under it at 14/20. Picked, the edge is 2pt
 * brand over `brandPanel` and the ring holds a 10 dot, so the card grows by the 2pt as the frames draw it (54 → 56).
 */
export function RadioCard({
  title,
  sub,
  selected,
  onPress,
}: {
  title: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={sub ? `${title}. ${sub}` : title}
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: radius.input,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? color.brand : color.line,
        backgroundColor: selected ? color.brandPanel : color.surface,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: radius.full,
          borderWidth: 2,
          borderColor: selected ? color.brand : color.textDim,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? <View style={{ width: 10, height: 10, borderRadius: radius.full, backgroundColor: color.brand }} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text fontSize="text-md" fontWeight="font-semibold">
          {title}
        </Text>
        {sub ? (
          <Text fontSize="text-sm" tone="body">
            {sub}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// 2094:24597 without its 21pt home-indicator strip; the content scrolls between the header and the pinned footer.
const BASKET_HEIGHT = 780 - 21;
// 2094:24524 around the measured body: gorhom's grabber 21, the Sheet header 52, the actions column 124 (16, the 56
// Destructive button, 4, the 44 "Keep it", 4). The body is the warning lines (and a note) with 8 below them.
const ONE_ITEM_CHROME = 21 + 52 + 124;
// Before the warning is in (and when reading it failed): the height the sheet always had.
const ONE_ITEM_START = 400;

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
  const [bodyHeight, setBodyHeight] = useState<number | null>(null);

  const load = async () => {
    setWarning(null);
    setBodyHeight(null);
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

  const dismiss = () => sheet.current?.dismiss();
  const noteView = note ? (
    <Text fontSize="text-sm" accessibilityRole="alert" style={{ color: color.danger }}>
      {note}
    </Text>
  ) : null;
  const loading = copy ? null : failed ? null : (
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Working out what cancelling does">
      <Skeleton width="100%" height={72} />
    </View>
  );

  if (basket) {
    // 2094:24597: the kit Sheet footer, red, once the warning is in (or "Try again" when it could not be read).
    return (
      <CustomBottomSheetModal ref={sheet} isDark={isDark} snapPoints={[BASKET_HEIGHT + insets.bottom]} frame scrollView={false}>
        <SheetHeader title={copy?.title ?? "Cancel this booking?"} grabber={false} />
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 24, gap: 12 }}
        >
          <Text fontSize="text-md" tone="body">
            You can't cancel one item. The whole booking is cancelled.
          </Text>
          <Text fontSize="text-md" fontWeight="font-semibold">
            Which item can't you give?
          </Text>
          <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
            {live.map((l) => (
              <RadioCard key={l.id} title={l.product.title} sub={l.ref} selected={line === l.id} onPress={() => setLine(l.id)} />
            ))}
            <RadioCard title="It's not one item" sub="Something else stops the booking" selected={line === null} onPress={() => setLine(null)} />
          </View>
          {copy ? (
            <View style={{ gap: 8 }}>
              {copy.lines.map((text) => (
                <Text key={text} fontSize="text-sm" tone="body">
                  {text}
                </Text>
              ))}
            </View>
          ) : (
            loading
          )}
          <Text fontSize="text-md" fontWeight="font-semibold">
            You earn ₹0 from this booking.
          </Text>
          {after ? (
            <Text fontSize="text-sm" tone="body">
              {after}
            </Text>
          ) : null}
          {noteView}
        </BottomSheetScrollView>
        {copy ? (
          <SheetFooter
            tone="danger"
            primary={{
              label: "Cancel the whole booking",
              onPress: () => void confirm(),
              loading: cancelling,
              disabled: cancelling || line === undefined,
            }}
            secondary={{ label: "Keep it", onPress: dismiss, disabled: cancelling }}
          />
        ) : failed ? (
          <SheetFooter primary={{ label: "Try again", onPress: () => void load() }} secondary={{ label: "Keep it", onPress: dismiss }} />
        ) : null}
      </CustomBottomSheetModal>
    );
  }

  // 2094:24524: the Sheet · Confirm destructive layout, kept in this sheet so the warning is read after it opens, as
  // before. The height follows the measured warning once it is in.
  const height = copy && bodyHeight !== null ? ONE_ITEM_CHROME + bodyHeight : ONE_ITEM_START;
  return (
    <CustomBottomSheetModal ref={sheet} isDark={isDark} snapPoints={[height + insets.bottom]} frame>
      <SheetHeader title={copy?.title ?? "Cancel this booking?"} grabber={false} />
      <View
        onLayout={copy ? (event) => setBodyHeight(event.nativeEvent.layout.height) : undefined}
        style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: 8 }}
      >
        {copy ? (
          // One text, as the frame sets the server's lines.
          <Text fontSize="text-sm" tone="body">
            {copy.lines.join("\n")}
          </Text>
        ) : (
          loading
        )}
        {noteView}
      </View>
      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 16, paddingBottom: 4 + insets.bottom, alignItems: "center", gap: 4 }}>
        {copy ? (
          <Button
            variant="warning"
            loading={cancelling}
            disabled={cancelling}
            onPress={() => void confirm()}
            style={{ alignSelf: "stretch", minHeight: 56 }}
          >
            {copy.confirm}
          </Button>
        ) : failed ? (
          <Button onPress={() => void load()} style={{ alignSelf: "stretch" }}>
            Try again
          </Button>
        ) : null}
        <Button variant="ghost" tone="muted" disabled={cancelling} onPress={dismiss}>
          Keep it
        </Button>
      </View>
    </CustomBottomSheetModal>
  );
});
