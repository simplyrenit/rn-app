import { usePublicProduct, useQuote } from "@/backend/bookings";
import { AddressPickerSheet, AddressPickerSheetHandle } from "@/components/addresses/address-picker-sheet";
import { BookingLoadError, BookingLoading, BottomBar, Notice, Panel } from "@/components/booking/parts";
import { Button, Skeleton, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { SavedAddress, addressTitle, flatAndLandmark } from "@/lib/addresses";
import { deliveryAddressKey, useDeliveryAddress } from "@/context/delivery-address";
import { addressMayHelp, areaLabel, areaOf, offersDelivery } from "@/lib/delivery";
import { createLocationRequest } from "@/lib/location-request";
import { InformationCircleIcon } from "react-native-heroicons/outline";
import { apiError } from "@/lib/api-error";
import {
  DeliveryMode,
  PickedDays,
  addDays,
  bookedDays,
  datesBlocker,
  daysRefusal,
  lastBookableDay,
  lastReturnDay,
  daysAllowed,
  daysInsideMinimum,
  dayShort,
  dayCount,
  daysLabel,
  addressSheetLine,
  deliveryOption,
  money,
  rangeIsFree,
  rangeLabel,
  shopNameOf,
  tapDay,
  todayIst,
} from "@/lib/booking";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { useDistanceTo } from "@/lib/distance";
import { kmText } from "@/lib/shop";
import { minDays as minDaysOf, minimumWords, plansOf } from "@/lib/plans";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";

/** A day cell: 40 tall, as the frame draws it. The row pitch leaves room for a 44pt target. */
const DAY = 40;
const DAY_HIT_SLOP = { top: 2, bottom: 2, left: 2, right: 2 };

/** One way to get the item: a radio card, tinted when it is the one chosen. */
function ChoiceCard({
  title,
  sub,
  reason,
  note,
  selected,
  disabled,
  action,
  onPress,
}: {
  title: string;
  sub?: string | null;
  /** Why it can't be chosen (ENG-284): under the sub-line with an info mark, and the screen reader's hint. */
  reason?: string | null;
  /** A line under the sub-line with the same info mark, on a card that can be chosen (B1's "The shop won't be there"). */
  note?: string | null;
  selected: boolean;
  disabled?: boolean;
  /** A small action on the right: "Change" beside the delivery address. */
  action?: { label: string; onPress: () => void };
  onPress: () => void;
}) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected, disabled: Boolean(disabled) }}
      accessibilityLabel={[title, sub, note].filter(Boolean).join(". ")}
      accessibilityHint={reason ?? undefined}
      activeOpacity={0.7}
      disabled={disabled}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        padding: space.md,
        borderRadius: radius.card,
        borderWidth: selected ? 2 : 1,
        // The 1pt it gains when chosen is taken back from the padding, so the card does not jump.
        margin: selected ? -1 : 0,
        borderColor: selected ? color.brand : color.inputLine,
        backgroundColor: selected ? color.brandPanel : color.surface,
        opacity: disabled ? 0.6 : 1,
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
        {selected ? (
          <View style={{ width: 10, height: 10, borderRadius: radius.full, backgroundColor: color.brand }} />
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text fontSize="text-md" fontWeight="font-bold">
          {title}
        </Text>
        {sub ? (
          <Text fontSize="text-sm" tone="body">
            {sub}
          </Text>
        ) : null}
        {reason || note ? (
          <View style={{ flexDirection: "row", gap: space.xs, marginTop: 2 }}>
            <InformationCircleIcon size={16} color={color.textBody} style={{ marginTop: 2 }} />
            <Text fontSize="text-sm" tone="body" style={{ flex: 1 }}>
              {reason ?? note}
            </Text>
          </View>
        ) : null}
      </View>
      {action ? (
        <Text
          fontSize="text-sm"
          fontWeight="font-bold"
          tone="brand"
          accessibilityRole="button"
          onPress={action.onPress}
          // The label is small; the padding makes a 44pt target of it.
          style={{ paddingVertical: space.md, paddingLeft: space.sm }}
        >
          {action.label}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

function LegendDot({ label, fill, ring }: { label: string; fill?: string; ring?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: radius.full,
          backgroundColor: fill ?? "transparent",
          borderWidth: ring ? 1.5 : 0,
          borderColor: ring,
        }}
      />
      <Text fontSize="text-xs" tone="body">
        {label}
      </Text>
    </View>
  );
}

/**
 * BK-02, "Choose dates": the days and how the item changes hands. No time of
 * day is asked for here; the arrival window comes after the rent is paid.
 *
 * The quote is asked again on every change. Two are kept, one for self pickup
 * and one for delivery to the chosen address, because the delivery card shows
 * its fee and distance before it is chosen.
 */
export default function BookingDatesScreen() {
  const { params } = useRoute<RouteProps<"BookingDates">>();
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const { authTokens, isAuthenticated } = useGlobalContext();
  const signedIn = Boolean(isAuthenticated && authTokens?.access_token);

  const productQuery = usePublicProduct(params.product);
  const product = productQuery.data;
  // ENG-284 D12: the address chosen on search results, for the whole session;
  // the picker below writes it back, so results and the product page follow.
  const { address, choose: chooseAddress } = useDeliveryAddress();
  const addressSheet = useRef<AddressPickerSheetHandle>(null);
  const distanceLabel = useDistanceTo(product?.coordinates);

  const today = todayIst();
  const taken = useMemo(() => bookedDays(product?.booked), [product?.booked]);

  const [picked, setPicked] = useState<PickedDays | null>(() =>
    params.first_day &&
    params.last_day &&
    params.first_day >= today &&
    params.last_day >= params.first_day &&
    // Days a search or an earlier request carried that the server would refuse (a start more than 180 days ahead, more
    // than a year) are not kept.
    daysAllowed(params.first_day, params.last_day, today)
      ? { first: params.first_day, last: params.last_day }
      : null
  );
  const [mode, setMode] = useState<DeliveryMode>("pickup");
  /**
   * The address (its key) the customer just chose or edited to have it
   * delivered. Once that address's quote is in, Delivery is selected if it
   * works; if not, self pickup stays with the new reason.
   */
  const wantDeliveryFor = useRef<string | null>(null);

  // ENG-281: the shortest booking the listing's plans allow. A first tap alone is a one-day rental only when one day is.
  const minDays = product ? minDaysOf(plansOf(product)) : 1;
  const first = picked?.first ?? null;
  const last = picked ? picked.last ?? (minDays > 1 ? null : picked.first) : null;
  const choosingReturn = Boolean(picked && !picked.last);

  // Dates that came from a search or an earlier request may have been taken since.
  useEffect(() => {
    if (first && last && !rangeIsFree(first, last, taken)) {
      setPicked(null);
      toast.info("Those dates are no longer free", { message: "Pick other dates.", haptic: false });
    }
    // Only when the taken days arrive or change, never on each tap: `tapDay` guards those.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taken]);

  // B1: the shop delivers, or the courier does (`delivery_from`); the quote then says who.
  const canDeliver = product ? offersDelivery(product) : false;
  const addressKey = deliveryAddressKey(address);

  const pickupQuote = useQuote(
    first && last
      ? { product: params.product, first_day: first, last_day: last, delivery_mode: "pickup", address_id: null }
      : null
  );
  const asksDelivery = Boolean(first && last && canDeliver && signedIn && address);
  const deliveryQuote = useQuote(
    asksDelivery && first && last && address
      ? {
          product: params.product,
          first_day: first,
          last_day: last,
          delivery_mode: "owner_delivery",
          address_id: address.id,
        }
      : null,
    // The PIN and point too: an edited PIN keeps the id but changes the answer.
    addressKey
  );
  // Back from Review and book after the shop stopped delivering there (ENG-284): the cached
  // answer still says Delivery, so ask again each time the screen comes back into view.
  const returning = useRef(false);
  const refetchDelivery = deliveryQuote.refetch;
  useFocusEffect(
    useCallback(() => {
      if (returning.current && asksDelivery) void refetchDelivery();
      returning.current = true;
    }, [asksDelivery, refetchDelivery])
  );
  // An answer for the last address or dates says nothing about these ones.
  const delivery = address
    ? deliveryOption(deliveryQuote.isPreviousData ? undefined : deliveryQuote.data, addressTitle(address), {
        name: product ? shopNameOf(product) : "The shop",
        maxKm: product?.shop?.delivery_max_km,
      })
    : null;
  // Asking again for a new address or a fixed PIN: the card waits as a skeleton.
  const requoting = Boolean(deliveryQuote.isFetching && (deliveryQuote.isPreviousData || !deliveryQuote.data));

  useEffect(() => {
    const fresh = deliveryQuote.data && !deliveryQuote.isPreviousData && !deliveryQuote.isFetching;
    if (!wantDeliveryFor.current || wantDeliveryFor.current !== addressKey || !fresh) return;
    wantDeliveryFor.current = null;
    if (deliveryQuote.data?.delivery.status === "ok") setMode("owner_delivery");
  }, [addressKey, deliveryQuote.data, deliveryQuote.isPreviousData, deliveryQuote.isFetching]);

  /**
   * The customer chose (or edited) this address to have it delivered. The address already in use gets no new quote, so
   * Delivery is selected now if it works: a flag left set would fire on some later, unrelated re-quote.
   */
  const wantDelivery = (saved: SavedAddress) => {
    const key = deliveryAddressKey(saved);
    if (key !== addressKey) wantDeliveryFor.current = key;
    else if (delivery?.ok) setMode("owner_delivery");
    // Still quoting (new dates): its answer decides, as for a new address.
    else if (deliveryQuote.isFetching) wantDeliveryFor.current = key;
  };

  // A delivery that turns out too far (a new address, new dates) falls back to pickup.
  useEffect(() => {
    if (mode === "owner_delivery" && (!delivery || !delivery.ok)) setMode("pickup");
  }, [mode, delivery]);

  const active = mode === "pickup" ? pickupQuote : deliveryQuote;
  // With no return day yet (a minimum over a day) the last answer is for other dates: none is shown.
  const quote = first && last ? active.data : undefined;
  // The last answer stays on screen while the next loads; it must not be continued from.
  const settling = active.isFetching || active.isPreviousData;
  const blocker = datesBlocker(quote);

  const markedDates = useMemo(() => {
    // The calendar's own marking type knows only its built-in marks; these are read by `renderDay`.
    const marks: Record<string, any> = {};
    taken.forEach((day) => {
      marks[day] = { taken: true };
    });
    if (first && choosingReturn && minDays > 1) {
      // Return days inside the minimum cannot be tapped; the minimum's own last day can.
      for (const day of daysInsideMinimum(first, minDays)) marks[day] = { ...marks[day], short: true };
      marks[first] = { ...marks[first], inRange: true, start: true, end: true };
    }
    if (first && last) {
      const count = dayCount(first, last);
      for (let i = 0, day = first; i < count; i++) {
        marks[day] = { inRange: true, start: i === 0, end: i === count - 1 };
        day = addDays(day, 1);
      }
    }
    return marks;
  }, [taken, first, last, choosingReturn, minDays]);

  const onDayPress = (day: string) => {
    const next = tapDay(picked, day, taken, minDays);
    setPicked(next.picked);
    if (next.short) {
      toast.info(`Minimum rental is ${minimumWords(plansOf(product ?? {}))}`, { haptic: false });
    } else if (next.blocked) {
      toast.info("Those dates include a day that is not available", { haptic: false });
    }
  };

  const renderDay = ({ date, state, marking }: any) => {
    const day: string = date?.dateString;
    const isTaken = Boolean(marking?.taken);
    const isOff = isTaken || Boolean(marking?.short) || state === "disabled";
    const isEnd = Boolean(marking?.start || marking?.end);
    const inRange = Boolean(marking?.inRange);
    const isToday = day === today;
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={isTaken ? `${day}, unavailable` : day}
        accessibilityState={{ disabled: isOff, selected: inRange }}
        disabled={isOff}
        hitSlop={DAY_HIT_SLOP}
        activeOpacity={0.8}
        onPress={() => onDayPress(day)}
        style={{
          // Stretched across the column so a run of days reads as one band.
          alignSelf: "stretch",
          height: DAY,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: inRange ? color.brandPanel : "transparent",
          borderTopLeftRadius: marking?.start ? DAY / 2 : 0,
          borderBottomLeftRadius: marking?.start ? DAY / 2 : 0,
          borderTopRightRadius: marking?.end ? DAY / 2 : 0,
          borderBottomRightRadius: marking?.end ? DAY / 2 : 0,
        }}
      >
        <View
          style={{
            width: DAY,
            height: DAY,
            borderRadius: DAY / 2,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isEnd ? color.brand : isTaken ? color.surfaceRaised : "transparent",
            borderWidth: isToday && !isEnd ? 2 : 0,
            borderColor: color.brand,
          }}
        >
          <Text
            fontSize="text-md"
            fontWeight={isEnd || isToday || inRange ? "font-bold" : "font-normal"}
            style={{
              // A picked day past the start limit stays in the band's colour (ENG-281: a year-long booking ends there).
              color: isEnd ? color.onBrand : isOff && !inRange ? color.textDim : color.text,
              textDecorationLine: isTaken ? "line-through" : "none",
            }}
          >
            {date?.day}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const header = <SubpageHeader title="Choose dates" />;

  if (productQuery.isLoading) {
    return (
      <NonScrollableContainer>
        {header}
        <BookingLoading label="Loading the dates" />
      </NonScrollableContainer>
    );
  }
  if (!product) {
    return (
      <NonScrollableContainer>
        {header}
        <BookingLoadError error={productQuery.error} what="this listing" onRetry={() => void productQuery.refetch()} />
      </NonScrollableContainer>
    );
  }

  const shopName = shopNameOf(product);
  // From the chosen address when the delivery quote has measured it, so the card agrees with the reason
  // under Delivery ("pick it up 2.5 km away") and with the search card; else from the phone, as before.
  const addressKm = !deliveryQuote.isPreviousData ? deliveryQuote.data?.delivery.distance_km : null;
  const pickupDistance = addressKm ? `${kmText(addressKm)} away` : distanceLabel;
  const pickupSub = [shopName, product.shop?.locality || product.location, pickupDistance].filter(Boolean).join(" · ");

  // "Not in Vesava? Edit this address": only when the shop turned that area off,
  // since a wrong PIN is the one thing the customer can fix here.
  const quoted = deliveryQuote.isPreviousData ? undefined : deliveryQuote.data;
  const offArea = quoted?.delivery.reason === "area_off" ? areaLabel(quoted.delivery.area) : null;
  const editAddress = () => {
    if (!address) return;
    navigation.navigate("AddressDetails", {
      address,
      requestId: createLocationRequest((_coords, _line, saved) => {
        if (saved) wantDelivery(saved);
      }),
    });
  };

  const goOn = () => {
    if (!first || !last) return;
    navigation.navigate("ReviewAndBook", {
      item: {
        name: product.name,
        title: product.title,
        cover_image: product.cover_image ?? null,
        shop_name: shopName,
      },
      first_day: first,
      last_day: last,
      delivery_mode: mode,
      address_id: mode === "owner_delivery" ? address?.id ?? null : null,
      address_name: mode === "owner_delivery" && address ? addressTitle(address) : undefined,
      moved_from: params.moved_from,
    });
  };

  return (
    <NonScrollableContainer>
      {header}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.lg }}
      >
        <Panel style={{ padding: space.sm }}>
          <Calendar
            current={first ?? today}
            minDate={today}
            // Days past the limit (T-25) are greyed and cannot be tapped: the server refuses them. A booking starts within
            // 180 days and, once it has, may end up to a year later (ENG-281).
            maxDate={first && choosingReturn ? lastReturnDay(first) : lastBookableDay(today)}
            firstDay={1}
            hideExtraDays
            markedDates={markedDates}
            dayComponent={renderDay}
            theme={{
              backgroundColor: color.surface,
              calendarBackground: color.surface,
              textSectionTitleColor: color.textBody,
              monthTextColor: color.text,
              arrowColor: color.text,
              textMonthFontWeight: "700",
            }}
          />
          <View
            style={{
              flexDirection: "row",
              gap: space.md,
              paddingTop: space.sm,
              paddingHorizontal: space.sm,
              paddingBottom: space.xs,
              borderTopWidth: 1,
              borderTopColor: color.line,
            }}
          >
            <LegendDot label="Your dates" fill={color.brand} />
            <LegendDot label="Unavailable" fill={color.surfaceRaised} />
            <LegendDot label="Today" ring={color.brand} />
          </View>
        </Panel>

        {minDays > 1 ? (
          <Notice icon="clock">
            {first && choosingReturn
              ? `Minimum rental is ${minimumWords(plansOf(product))}. The earliest return from ${dayShort(first)} is ${dayShort(addDays(first, minDays - 1))}.`
              : `Minimum rental is ${minimumWords(plansOf(product))}.`}
          </Notice>
        ) : null}

        <View style={{ gap: space.sm }}>
          <Text role="sectionTitle" accessibilityRole="header">
            How will you get it?
          </Text>
          <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
            <ChoiceCard
              title="Self pickup · Free"
              sub={pickupSub}
              selected={mode === "pickup"}
              onPress={() => {
                // Self pickup on purpose: an address still being quoted must not switch it back.
                wantDeliveryFor.current = null;
                setMode("pickup");
              }}
            />
            {canDeliver ? (
              !signedIn ? (
                <ChoiceCard
                  title="Delivery"
                  sub="Sign in to see the delivery fee to your address."
                  selected={false}
                  onPress={() => navigation.navigate("Welcome")}
                />
              ) : !address || !delivery ? (
                <ChoiceCard
                  title="Delivery"
                  sub="Add an address to see the delivery fee."
                  selected={false}
                  onPress={() => addressSheet.current?.present()}
                />
              ) : requoting ? (
                <View
                  accessible
                  accessibilityRole="progressbar"
                  accessibilityLabel={`Checking delivery to ${addressTitle(address)}`}
                  style={{ padding: space.md, borderRadius: radius.card, borderWidth: 1, borderColor: color.inputLine, gap: space.sm }}
                >
                  <Skeleton width="60%" height={18} borderRadius={4} />
                  <Skeleton width="40%" height={14} borderRadius={4} />
                </View>
              ) : delivery.ok ? (
                <ChoiceCard
                  title={delivery.title}
                  sub={delivery.sub ?? [addressTitle(address), address.locality].filter(Boolean).join(" · ")}
                  note={delivery.note}
                  selected={mode === "owner_delivery"}
                  onPress={() => setMode("owner_delivery")}
                  action={{ label: "Change", onPress: () => addressSheet.current?.present() }}
                />
              ) : (
                // Shown, not hidden, so the customer learns why; it can't be chosen (D11).
                <ChoiceCard
                  title={delivery.title}
                  sub={[addressTitle(address), [areaOf(address), address.postal_code].filter(Boolean).join(" ")]
                    .filter(Boolean)
                    .join(" · ")}
                  reason={delivery.reason}
                  selected={false}
                  disabled
                  onPress={() => {}}
                />
              )
            ) : null}
          </View>
          {canDeliver && signedIn && address && delivery && !delivery.ok && !requoting ? (
            <View style={{ gap: space.sm }}>
              {offArea ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={editAddress}
                  style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: "center" }}
                >
                  <Text fontSize="text-sm" tone="brand" fontWeight="font-bold">
                    {`Not in ${offArea}? Edit this address`}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {/* B1: the courier refused the item itself, so no other address would change the answer. */}
              {!quoted || addressMayHelp(quoted.delivery) ? (
                <Button variant="outline" onPress={() => addressSheet.current?.present()}>
                  Use another address
                </Button>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <BottomBar>
        {blocker ? (
          <Text fontSize="text-sm" tone="warning" accessibilityRole="alert">
            {blocker}
          </Text>
        ) : active.isError && first && daysRefusal(apiError(active.error)) ? (
          // The server refused the days themselves: its own sentence, and trying again would not change it.
          <Text fontSize="text-sm" tone="warning" accessibilityRole="alert">
            {daysRefusal(apiError(active.error))}
          </Text>
        ) : active.isError && first ? (
          <Text fontSize="text-sm" tone="body">
            {"We couldn't work out the price. "}
            <Text
              fontSize="text-sm"
              fontWeight="font-bold"
              tone="brand"
              accessibilityRole="button"
              onPress={() => void active.refetch()}
            >
              Try again
            </Text>
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <Text fontSize="text-md" fontWeight="font-bold" style={{ flex: 1 }}>
            {first && last
              ? quote && !settling
                ? `${daysLabel(quote.days)} · ${money(quote.total)}`
                : daysLabel(dayCount(first, last))
              : "Pick your dates"}
          </Text>
          {first && last ? (
            <Text fontSize="text-sm" tone="body">
              {rangeLabel(first, last)}
            </Text>
          ) : null}
        </View>
        <Button
          onPress={goOn}
          disabled={!first || !quote || settling || Boolean(blocker)}
          loading={Boolean(first) && active.isFetching}
        >
          {mode === "pickup" && delivery && !delivery.ok && !requoting ? "Continue with self pickup" : "Continue"}
        </Button>
      </BottomBar>

      <AddressPickerSheet
        ref={addressSheet}
        title="Delivery address"
        description={addressSheetLine(quoted)}
        savedOnly
        selected={
          address
            ? { lat: address.coordinates.lat, long: address.coordinates.long, fullAddress: flatAndLandmark(address) }
            : undefined
        }
        onPick={(pickedAddress) => {
          // Saved addresses only (savedOnly): a one-off spot has no id to quote.
          if (!pickedAddress.saved) return;
          wantDelivery(pickedAddress.saved);
          chooseAddress(pickedAddress.saved);
        }}
      />
    </NonScrollableContainer>
  );
}
