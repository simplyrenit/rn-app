import { QuoteInput, usePublicProducts, useQuote } from "@/backend/bookings";
import { AddressPickerSheet, AddressPickerSheetHandle } from "@/components/addresses/address-picker-sheet";
import { LineRow, ShopHead } from "@/components/booking/card-lines";
import { BookingLoadError, BookingLoading, BottomBar, Notice, Panel, TextButton } from "@/components/booking/parts";
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
import {
  CHECKOUT_CAP,
  LineChip,
  aloneNote,
  asOneItem,
  barLine,
  blockedNote,
  cardDays,
  fixLabel,
  lineAlone,
  lineBlock,
  lineChip,
  noDayAllFree,
  noDayNotice,
  notDeliveredReason,
  othersLine,
  shortestOf,
  startLeftOut,
} from "@/lib/card-checkout";
import { pluralize } from "@/lib/pluralize";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { useDistanceTo } from "@/lib/distance";
import { kmText } from "@/lib/shop";
import { minDays as minDaysOf, minimumWords, plansOf } from "@/lib/plans";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { BackendProduct, RouteProps, useTypedNavigation } from "@/lib/types";
import { StackActions, useFocusEffect, useRoute } from "@react-navigation/native";
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
 *
 * Card mode (cart plan §3.3, CT-20, CT-21, CT-40): a cart card's items, one
 * booking. Each item can be left in the cart or added back; the calendar greys
 * a day only when no included item is free, and its minimum is the smallest
 * included one (D40). Any range is quoted, and an item that can't go names
 * itself: the main button then leaves it in the cart and goes on (G11). Book
 * Now on a server whose `book_flow` is `card` asks the same quote for its one
 * item and looks as it always has (D41).
 */
export default function BookingDatesScreen() {
  const { params } = useRoute<RouteProps<"BookingDates">>();
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const { authTokens, isAuthenticated } = useGlobalContext();
  const signedIn = Boolean(isAuthenticated && authTokens?.access_token);

  // A cart checkout names its card's listings; Book Now names one. Followed from the params, as `product` always was.
  const names = useMemo(
    () => params.products ?? (params.product ? [params.product] : []),
    [params.products, params.product]
  );
  const namesKey = names.join("\n");
  const card = Boolean(params.from_cart) || names.length > 1;
  const productQueries = usePublicProducts(names);
  const byName = new Map<string, BackendProduct>();
  names.forEach((name, i) => {
    const data = productQueries[i]?.data;
    if (data) byName.set(name, data);
  });
  const titleOf = (name: string) => byName.get(name)?.title ?? name;
  // A listing taken down since the cart was read is left out of the card; it stays in the cart.
  const gone = card ? names.filter((_, i) => apiError(productQueries[i]?.error)?.status === 404) : [];
  const listed = names.filter((name) => byName.has(name));
  const [left, setLeft] = useState<string[]>(() => startLeftOut(names));
  // Items the quote said are collected elsewhere or billed monthly: checked out on their own (CT-21d, e) until added back.
  const [alone, setAlone] = useState<Record<string, { code: string; locality?: string | null }>>({});
  // Other listings in the same screen (a navigate that lands back on it) start over; so does a line already requested
  // (`you_booked_it`, §3.2), which starts left in the cart once its listing says so.
  // Keyed on the listings loaded too, so one that loads on Retry is seeded. The card's quote waits for it.
  const seeded = useRef<string | null>(null);
  const loaded = productQueries.every((q) => !q.isLoading);
  const seedKey = `${namesKey}|${names.filter((_, i) => productQueries[i]?.data).join("\n")}`;
  useEffect(() => {
    if (!card || !loaded || seeded.current === seedKey) return;
    seeded.current = seedKey;
    const booked = names.filter((name) => byName.get(name)?.requested);
    setAlone({});
    // A new array every time: the render it causes is the one whose quote is asked.
    setLeft([...new Set([...startLeftOut(names), ...booked])]);
    // `byName` is read once the listings are in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, loaded, seedKey]);
  const included = card ? listed.filter((name) => !left.includes(name) && !alone[name]) : listed;
  const includedProducts = included.map((name) => byName.get(name) as BackendProduct);
  // The shop's place, name and delivery: every item of a card is one shop's.
  const product = includedProducts[0] ?? byName.get(listed[0]);
  // D41: Book Now books through the card's quote when the server says so; a server without the switch is classic.
  const asCard = card || product?.book_flow === "card";

  // ENG-284 D12: the address chosen on search results, for the whole session;
  // the picker below writes it back, so results and the product page follow.
  const { address, choose: chooseAddress } = useDeliveryAddress();
  const addressSheet = useRef<AddressPickerSheetHandle>(null);
  const distanceLabel = useDistanceTo(product?.coordinates);

  const today = todayIst();
  // One listing: its booked days. A card: the days no included item is free, and those only some are (D40).
  const daysKey = includedProducts.map((p) => `${p.name}:${JSON.stringify(p.booked ?? [])}`).join("|");
  const { none: taken, some } = useMemo(
    () => cardDays(includedProducts.map((p) => p.booked)),
    // The booked runs, not the objects: a refetch with the same days must not clear the picked range.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [daysKey]
  );

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
  // A card's is its included item with the smallest (D40); the others say so on their own line if the range is short.
  const shortest = shortestOf(includedProducts);
  const minDays = shortest ? minDaysOf(plansOf(shortest)) : 1;
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

  // B1: the shop delivers, or the server sent a from-price (`delivery_from`); the quote then says who.
  // A card offers it when an included item is delivered; the quote names any item that isn't (D26).
  const canDeliver = includedProducts.some(offersDelivery);
  const addressKey = deliveryAddressKey(address);

  // What is priced: Book Now's listing, as `product` or (D41) `products:[name]`; a card's included items once loaded.
  const asked: Pick<QuoteInput, "product" | "products"> | null = card
    ? included.length && seeded.current === seedKey
      ? { products: included }
      : null
    : asCard
      ? { products: names }
      : { product: params.product };
  const pickupQuote = useQuote(
    first && last && asked
      ? { ...asked, first_day: first, last_day: last, delivery_mode: "pickup", address_id: null }
      : null
  );
  const asksDelivery = Boolean(first && last && canDeliver && signedIn && address && asked);
  const deliveryQuote = useQuote(
    asksDelivery && first && last && address && asked
      ? {
          ...asked,
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
  const offered = address
    ? deliveryOption(deliveryQuote.isPreviousData ? undefined : deliveryQuote.data, addressTitle(address), {
        name: product ? shopNameOf(product) : "The shop",
        maxKm: product?.shop?.delivery_max_km,
      })
    : null;
  // CT-21c: an included item that isn't delivered keeps Delivery off for the card, and the card names it.
  const notDelivered = card
    ? (deliveryQuote.isPreviousData ? [] : deliveryQuote.data?.lines ?? [])
        .filter((line) => included.includes(line.product) && line.blockers.includes("delivery_not_offered"))
        .map((line) => line.product)
    : [];
  const delivery =
    offered && notDelivered.length
      ? { ...offered, ok: false, reason: notDeliveredReason(notDelivered.map(titleOf)) }
      : offered;
  // Asking again for a new address or a fixed PIN: the card waits as a skeleton.
  const requoting = Boolean(deliveryQuote.isFetching && (deliveryQuote.isPreviousData || !deliveryQuote.data));

  useEffect(() => {
    const fresh = deliveryQuote.data && !deliveryQuote.isPreviousData && !deliveryQuote.isFetching;
    if (!wantDeliveryFor.current || wantDeliveryFor.current !== addressKey || !fresh) return;
    wantDeliveryFor.current = null;
    if (deliveryQuote.data?.delivery.status === "ok" && notDelivered.length === 0) setMode("owner_delivery");
    // `notDelivered` is read from the same answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // Book Now's one item on the card's quote (D41) has its reasons read back into the quote's, so it reads as today.
  const answer = first && last ? active.data : undefined;
  const quote = answer && asCard && !card ? asOneItem(answer) : answer;
  // The last answer stays on screen while the next loads; it must not be continued from.
  const settling = active.isFetching || active.isPreviousData;
  const blocker = datesBlocker(quote);

  // A card's items that can't go on these dates (D40), and those the quote says go on their own (CT-21d, e).
  const lineOf = (name: string) => (card ? quote?.lines?.find((line) => line.product === name) : undefined);
  const blocked = included.filter((name) => lineBlock(lineOf(name)));
  const pickupLines = pickupQuote.isPreviousData ? undefined : pickupQuote.data?.lines;
  useEffect(() => {
    if (!card || !pickupLines) return;
    setAlone((was) => {
      const found = pickupLines.filter((line) => lineAlone(line) && !was[line.product]);
      if (found.length === 0) return was;
      const next = { ...was };
      for (const line of found) next[line.product] = { code: lineAlone(line) as string, locality: line.pickup_locality };
      return next;
    });
  }, [card, pickupLines]);
  // Billed monthly depends on the days: other dates ask again about those items.
  useEffect(() => {
    setAlone((was) =>
      Object.values(was).some((a) => a.code === "monthly_book_alone")
        ? Object.fromEntries(Object.entries(was).filter(([, a]) => a.code !== "monthly_book_alone"))
        : was
    );
  }, [first, last]);

  // CT-40: the month on screen has no day with every included item free.
  const [month, setMonth] = useState(() => (picked?.first ?? today).slice(0, 7));
  const monthFull = useMemo(
    () =>
      card
        ? noDayAllFree(
            month,
            today,
            lastBookableDay(today),
            includedProducts.map((p) => ({ name: p.name, taken: bookedDays(p.booked) }))
          )
        : { none: false, culprits: [] as string[] },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [card, month, today, daysKey]
  );

  const markedDates = useMemo(() => {
    // The calendar's own marking type knows only its built-in marks; these are read by `renderDay`.
    const marks: Record<string, any> = {};
    // A card's day with some items free: a dot, and it can still be picked (D40).
    some.forEach((day) => {
      marks[day] = { some: true };
    });
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
  }, [some, taken, first, last, choosingReturn, minDays]);

  const onDayPress = (day: string) => {
    const next = tapDay(picked, day, taken, minDays);
    setPicked(next.picked);
    if (next.short) {
      toast.info(`Minimum rental is ${minimumWords(plansOf(shortest ?? {}))}`, { haptic: false });
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
          {marking?.some && !isOff && !isEnd ? (
            <View
              style={{ position: "absolute", bottom: 3, width: 5, height: 5, borderRadius: radius.full, backgroundColor: color.warning }}
            />
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const header = <SubpageHeader title="Choose dates" />;

  // A card waits for every item; one that is gone (404) is left out, anything else can be tried again.
  const failed = productQueries.find((q, i) => q.isError && !q.data && !gone.includes(names[i]));
  if (productQueries.some((q) => q.isLoading)) {
    return (
      <NonScrollableContainer>
        {header}
        <BookingLoading label="Loading the dates" />
      </NonScrollableContainer>
    );
  }
  if (!product || failed) {
    return (
      <NonScrollableContainer>
        {header}
        <BookingLoadError
          error={failed?.error ?? productQueries[0]?.error}
          what={card ? "these items" : "this listing"}
          onRetry={() => {
            for (const q of productQueries) if (q.isError) void q.refetch();
          }}
        />
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

  const itemOf = (p: BackendProduct) => ({
    name: p.name,
    title: p.title,
    cover_image: p.cover_image ?? null,
    shop_name: shopName,
  });

  /** `going`: the card's items that go on to the price; Book Now's one listing otherwise. */
  const goOn = (going: string[] = included) => {
    if (!first || !last) return;
    const lines = going.map((name) => itemOf(byName.get(name) as BackendProduct));
    navigation.navigate("ReviewAndBook", {
      item: card ? lines[0] : itemOf(product),
      ...(asCard ? { lines } : {}),
      ...(card ? { from_cart: params.from_cart, others: params.others } : {}),
      first_day: first,
      last_day: last,
      delivery_mode: mode,
      address_id: mode === "owner_delivery" ? address?.id ?? null : null,
      address_name: mode === "owner_delivery" && address ? addressTitle(address) : undefined,
      moved_from: params.moved_from,
    });
  };

  // ---- Card mode: the items, and the bar's fix (G11) ----
  const leave = (more: string[]) => setLeft((was) => [...was, ...more.filter((name) => !was.includes(name))]);
  const addBack = (names: string[]) => {
    setLeft((was) => was.filter((name) => !names.includes(name)));
    setAlone((was) => Object.fromEntries(Object.entries(was).filter(([name]) => !names.includes(name))));
  };
  const blockedItems = blocked.map((name) => {
    const code = lineBlock(lineOf(name)) as string;
    const p = byName.get(name) as BackendProduct;
    return { name, title: p.title, code, minDays: minDaysOf(plansOf(p)), number: p.requested?.number ?? null };
  });
  const range = Boolean(first && last);
  const culprits = !range && monthFull.none ? monthFull.culprits : [];
  const going = included.filter((name) => !blocked.includes(name));
  // Above the card's bar: what is in the way first, then what was left out and why.
  const cardNote = included.length === 0 ? "Add back at least one item to go on." : blockedNote(blockedItems) ?? blocker;
  const leftNote = aloneNote(Object.entries(alone).map(([name, a]) => ({ title: titleOf(name), ...a })));
  // The way on when something is in the way: add the items back, or leave the blocking ones in the cart.
  const back = Math.min(listed.length, CHECKOUT_CAP);
  const leaveAndGo = () => {
    leave(blocked);
    goOn(going);
  };
  const cardFix: { label: string; onPress: () => void } | null = !card
    ? null
    : included.length === 0
      ? {
          label: back > 1 && back === listed.length ? `Add back all ${back} items` : `Add back ${pluralize(back, "item")}`,
          onPress: () => addBack(listed.slice(0, CHECKOUT_CAP)),
        }
      : blocked.length && quote && !settling
        ? going.length && !blocker
          ? { label: fixLabel(blocked.length), onPress: leaveAndGo }
          : { label: fixLabel(blocked.length, false), onPress: () => leave(blocked) }
        : culprits.length
          ? { label: fixLabel(culprits.length, false), onPress: () => leave(culprits) }
          : null;

  return (
    <NonScrollableContainer>
      {header}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.lg }}
      >
        {card ? (
          <>
            {!range && monthFull.none ? (
              <Notice tone="warning" icon="warning" title={noDayNotice(included.length, culprits.map(titleOf)).title}>
                {noDayNotice(included.length, culprits.map(titleOf)).text}
              </Notice>
            ) : null}
            <Panel style={{ padding: space.md, gap: space.xs }}>
              <ShopHead
                name={shopName}
                verified={product.owner?.business_verified}
                sub={[product.shop?.locality || product.location, pickupDistance].filter(Boolean).join(" · ")}
                delivers={canDeliver}
                handover={canDeliver ? "Delivers" : "Self pickup only"}
              />
              <View style={{ height: 1, backgroundColor: color.line, marginVertical: space.xs }} />
              {listed.map((name) => {
                const p = byName.get(name) as BackendProduct;
                const own = alone[name];
                const isLeft = own !== undefined || left.includes(name);
                const line = isLeft ? undefined : lineOf(name);
                const code = lineBlock(line);
                const days = range && first && last ? dayCount(first, last) : null;
                const rate = money(line?.rate ?? p.rate);
                const deposit = line?.deposit ?? p.security_deposit;
                const requested = p.requested?.number ?? null;
                const chips: { chip: LineChip; onView?: () => void }[] = [];
                const chip = (said: LineChip | null, onView?: () => void) => said && chips.push({ chip: said, onView });
                chip(own ? lineChip(own.code, { locality: own.locality }) : isLeft ? lineChip("left") : null);
                const view = requested ? () => navigation.navigate("Booking", { number: requested }) : undefined;
                if (code) {
                  chip(
                    lineChip(code, { minDays: minDaysOf(plansOf(p)), number: requested }),
                    code === "already_requested" ? view : undefined
                  );
                } else if (isLeft && !own && requested) {
                  // Why it started left in the cart (§3.2 `you_booked_it`).
                  chip(lineChip("already_requested", { number: requested }), view);
                }
                if (culprits.includes(name)) chip(lineChip("month_full"));
                if (notDelivered.includes(name)) chip(lineChip("delivery_not_offered"));
                const full = included.length >= CHECKOUT_CAP;
                return (
                  <LineRow
                    key={name}
                    title={p.title}
                    image={p.cover_image}
                    meta={days ? `${rate} a day · ${daysLabel(days)}` : `${rate} a day`}
                    amount={line ? money(line.rent) : null}
                    deposit={Number(deposit) > 0 ? `Deposit ${money(deposit)}` : null}
                    left={isLeft}
                    chips={chips}
                    action={
                      isLeft
                        ? {
                            label: "Add back",
                            disabled: full,
                            hint: full ? `Up to ${CHECKOUT_CAP} items go in one booking` : undefined,
                            // An item on its own is asked about again: the next quote says whether it still is.
                            onPress: () => addBack([name]),
                          }
                        : { label: "Leave in cart", onPress: () => leave([name]) }
                    }
                    extra={
                      own?.code === "monthly_book_alone" ? (
                        <View style={{ alignSelf: "flex-start" }}>
                          <TextButton
                            label="Book it on its own"
                            // A new dates step for that item: `navigate` would only change this one's params.
                            onPress={() =>
                              navigation.dispatch(
                                StackActions.push("BookingDates", {
                                  product: name,
                                  first_day: first ?? undefined,
                                  last_day: last ?? undefined,
                                })
                              )
                            }
                          />
                        </View>
                      ) : null
                    }
                  />
                );
              })}
            </Panel>
            {[
              included.length > 1 ? "Leave an item in your cart to book the rest." : null,
              left.length > 0 && included.length >= CHECKOUT_CAP
                ? `Up to ${CHECKOUT_CAP} items go in one booking. Leave one in your cart to add another.`
                : null,
              gone.length
                ? `${gone.length === 1 ? "An item" : `${gone.length} items`} from this shop ${gone.length === 1 ? "is" : "are"} no longer listed.`
                : null,
              othersLine(params.others),
            ]
              .filter(Boolean)
              .map((text) => (
                <Text key={text} fontSize="text-sm" tone="body">
                  {text}
                </Text>
              ))}
          </>
        ) : null}

        <Panel style={{ padding: space.sm }}>
          <Calendar
            current={first ?? today}
            onMonthChange={(shown: { dateString: string }) => setMonth(shown.dateString.slice(0, 7))}
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
            {some.size ? <LegendDot label="Some items free" fill={color.warning} /> : null}
            <LegendDot label="Unavailable" fill={color.surfaceRaised} />
            <LegendDot label="Today" ring={color.brand} />
          </View>
        </Panel>

        {minDays > 1 && shortest ? (
          <Notice icon="clock">
            {first && choosingReturn
              ? `Minimum rental is ${minimumWords(plansOf(shortest))}. The earliest return from ${dayShort(first)} is ${dayShort(addDays(first, minDays - 1))}.`
              : `Minimum rental is ${minimumWords(plansOf(shortest))}.`}
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
        {card && cardNote ? (
          <Text fontSize="text-sm" tone="warning" accessibilityRole="alert" style={{ textAlign: "center" }}>
            {cardNote}
          </Text>
        ) : !card && blocker ? (
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
        ) : card && (leftNote || (!range && monthFull.none)) ? (
          <Text fontSize="text-sm" tone={leftNote ? "body" : "warning"} style={{ textAlign: "center" }}>
            {leftNote ?? "No day this month has every item free."}
          </Text>
        ) : null}
        {card ? (
          // CT-20: the card's total, and when it is paid, so it doesn't read as due now (FIXES B2 row 16).
          <View style={{ gap: 2 }}>
            <Text fontSize="text-lg" fontWeight="font-bold">
              {included.length === 0
                ? "No items"
                : first && last
                  ? quote && !settling
                    ? money(quote.total)
                    : daysLabel(dayCount(first, last))
                  : "Pick your dates"}
            </Text>
            {included.length > 0 && quote && !settling ? (
              <Text fontSize="text-sm" tone="body">
                {barLine(quote, shopName)}
              </Text>
            ) : first && last ? (
              <Text fontSize="text-sm" tone="body">
                {rangeLabel(first, last)}
              </Text>
            ) : null}
          </View>
        ) : (
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
        )}
        {cardFix ? (
          <Button onPress={cardFix.onPress}>{cardFix.label}</Button>
        ) : (
          <Button
            onPress={() => goOn()}
            disabled={!first || !quote || settling || Boolean(blocker) || (card && included.length === 0)}
            loading={Boolean(first) && active.isFetching}
          >
            {mode === "pickup" && delivery && !delivery.ok && !requoting ? "Continue with self pickup" : "Continue"}
          </Button>
        )}
      </BottomBar>

      <AddressPickerSheet
        ref={addressSheet}
        title="Delivery address"
        description={addressSheetLine(quoted, product)}
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
