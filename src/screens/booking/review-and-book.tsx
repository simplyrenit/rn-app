import { QuoteInput, bookNow, bookingQueryKey, useQuote } from "@/backend/bookings";
import { useBuyerGstin } from "@/backend/business";
import { cartQueryKey } from "@/backend/cart";
import { extendBooking } from "@/backend/handover";
import { LineRow, ShopHead } from "@/components/booking/card-lines";
import {
  BookingLoadError,
  BookingLoading,
  BottomBar,
  MoneyLine,
  Notice,
  Panel,
  SummaryCard,
} from "@/components/booking/parts";
import { Button, SubpageHeader, Text } from "@/components/core";
import { AppSwitch } from "@/components/core/switch";
import { RentalTermsTick } from "@/components/terms/owner-terms-tick";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { apiError, failureCode } from "@/lib/api-error";
import { billToRow, gstInvoiceLine, shortGstin } from "@/lib/business";
import { Cart, afterBookRoutes, rememberDates } from "@/lib/cart";
import {
  bookBy,
  bookErrorText,
  courierQuote,
  daysRefusal,
  quoteRefusal,
  bookLabel,
  bookRefusalIsFinal,
  daysLabel,
  howLabel,
  handoverIdLine,
  idCheckCopy,
  money,
  monthlyLine,
  morningNotice,
  paySteps,
  plainLines,
  priceLines,
  rangeLabel,
  rateLine,
  reviewBlocker,
  termsTicked,
  totalLabel,
  totalLine,
  Quote,
} from "@/lib/booking";
import {
  CARD_REFUSALS,
  LineChip,
  asOneItem,
  blockedNote,
  cardPriceLines,
  depositOwnPage,
  fixLabel,
  lineBlock,
  lineChanges,
  lineChip,
  lineRefusalNote,
  madeOf,
  othersLine,
  refusalButton,
  refusalNotice,
  wasAmount,
} from "@/lib/card-checkout";
import { dayErrorText, extensionLines } from "@/lib/day-of";
import { track, trackLeftOut } from "@/lib/events";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { startIdCheck } from "@/lib/id-check";
import { rememberReturnTo } from "@/lib/return-to";
import { deliveryReason } from "@/lib/delivery";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { uuidv4 } from "@/lib/uuid";
import { StackActions, useFocusEffect, useRoute } from "@react-navigation/native";
import { currentSource } from "@/lib/attribution";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import { CheckBadgeIcon, IdentificationIcon } from "react-native-heroicons/outline";
import { useQueryClient } from "react-query";

/**
 * BK-03 "Review and book" (and BK-11, the same screen for a shop that is closed
 * now): the whole price before anything is paid, what is paid when, the three
 * plain lines, the terms tick, then Book now.
 *
 * Every number is the server's quote. Book now sends the total the customer saw
 * (`expected_total`), so a price that moved is refused instead of charged, and a
 * key made once per tap (`client_key`), so a double tap or a retry after a lost
 * answer returns the first booking instead of making a second.
 *
 * With `extends` it is the same screen for an extension (ENG-220): the quote is
 * asked for the days after that booking, the request goes to `extend`, and the
 * deposit is not asked for again because it carries on.
 *
 * Card mode (cart plan §3.3, CT-22, CT-23, CT-43a, CT-44): a row per item, the
 * summed price, the shop named in the steps, and Book sends `products[]` with
 * the deposit seen and `from_cart`. An item that can't go names itself and can
 * be left in the cart from here. Book Now on `book_flow=card` sends its one
 * item that way and looks as it always has (D41).
 */
export default function ReviewAndBookScreen() {
  const { params } = useRoute<RouteProps<"ReviewAndBook">>();
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const queryClient = useQueryClient();
  const { authTokens, isAuthenticated, userDetails } = useGlobalContext();
  const signedIn = Boolean(isAuthenticated && authTokens?.access_token);

  // `lines`: the card's quote (`products[]`); a cart's card, or several items, draws as one.
  const asCard = Boolean(params.lines);
  const card = Boolean(params.from_cart) || (params.lines?.length ?? 0) > 1;
  // Items left in the cart from this screen (CT-23b): they drop out of the booking.
  const [dropped, setDropped] = useState<string[]>([]);
  const items = (params.lines ?? [params.item]).filter((line) => !dropped.includes(line.name));
  const titleOf = (name: string) => params.lines?.find((line) => line.name === name)?.title ?? name;

  const input: QuoteInput = useMemo(
    () => ({
      ...(asCard ? { products: items.map((line) => line.name) } : { product: params.item.name }),
      first_day: params.first_day,
      last_day: params.last_day,
      delivery_mode: params.delivery_mode,
      address_id: params.address_id ?? null,
      ...(params.extends ? { extends: params.extends } : {}),
    }),
    // `items` follows `params.lines` and `dropped`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [asCard, dropped, params.lines, params.item.name, params.first_day, params.last_day, params.delivery_mode, params.address_id, params.extends]
  );
  const extending = params.extends ?? null;
  const quoteQuery = useQuote(input);
  // Book Now's one item on the card's quote reads its reasons as the quote's own, as for `product` (D41).
  const quote = quoteQuery.data && asCard && !card ? asOneItem(quoteQuery.data) : quoteQuery.data;
  // CT-23a: the quote on screen when Book now answered `price_changed`, to show what moved.
  const [was, setWas] = useState<Quote | null>(null);
  // Book now's refusal that named something: the whole card (CT-44), or the earlier request (`already_requested`).
  const [refused, setRefused] = useState<{ code: string; details?: Record<string, unknown> | null } | null>(null);

  // The ₹99 of a refused or unanswered request, moving here. Dropped if the server says it no longer can.
  const [movedFrom, setMovedFrom] = useState<string | null>(params.moved_from ?? null);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const busy = useRef(false);
  const clientKey = useRef<string | null>(null);
  // The terms version the box was ticked for (ENG-175); null while it is empty.
  const [tickedFor, setTickedFor] = useState<string | null>(null);
  // Book now answered `id_check_needed` (ENG-176): the level it named. The quote usually says so first.
  const [idRefused, setIdRefused] = useState<string | null>(null);
  // ENG-352: Bill to is on by default for a business customer with a GSTIN; this is them turning it off.
  const buyerGstin = useBuyerGstin();
  const [billToOff, setBillToOff] = useState(false);

  // Coming back to this screen (from the profile, from a sign-in) asks for the price again.
  const seen = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (seen.current) {
        // Back from the ID check (or anywhere else): the quote says afresh whether it is passed.
        setIdRefused(null);
        void quoteQuery.refetch();
        // Back from Business billing: the GSTIN may have been added.
        if (userDetails?.billing_as_business) void buyerGstin.refetch();
      }
      seen.current = true;
      // `refetch` is stable for the life of the query.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // The checkout's events share the dates step's attempt (cart plan §9.5). A new request straight from an outcome's
  // "ask again" starts its own here; an extension is no checkout.
  const attempt = useRef(params.attempt_id ?? null);
  const from = params.from_cart ? "cart" : "book_now";
  useEffect(() => {
    if (attempt.current || extending || !signedIn) return;
    attempt.current = uuidv4();
    track("checkout_started", { from }, attempt.current);
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const header = <SubpageHeader title={extending ? "Extend your rental" : "Review and book"} />;
  const refusal = quoteQuery.isError ? daysRefusal(apiError(quoteQuery.error)) ?? quoteRefusal(apiError(quoteQuery.error)) : null;

  if (!quote) {
    return (
      <NonScrollableContainer>
        {header}
        {quoteQuery.isError && refusal ? (
          // The server refused the days themselves, or an extension that cannot be priced (a rental past its last day):
          // its own sentence, with the way back.
          <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: SCREEN_GUTTER, gap: space.md }}>
            <Notice tone="warning" icon="warning">
              {refusal}
            </Notice>
            <Button variant="outline" onPress={() => navigation.goBack()}>
              {daysRefusal(apiError(quoteQuery.error)) ? "Change the dates" : "Go back"}
            </Button>
          </View>
        ) : quoteQuery.isError ? (
          <BookingLoadError error={quoteQuery.error} what="the price" onRetry={() => void quoteQuery.refetch()} />
        ) : (
          <BookingLoading label="Working out the price" />
        )}
      </NonScrollableContainer>
    );
  }

  const moved = movedFrom !== null;
  // Book now's 409 named the earlier request; the quote fetched after it doesn't.
  const earlier =
    refused?.code === "already_requested" && typeof refused.details?.number === "string" ? refused.details.number : null;
  const blocker = reviewBlocker(quote, earlier);
  const deliveryGone = !extending && quote.delivery_mode === "owner_delivery" && quote.delivery.offer_pickup;
  const notice = morningNotice(quote, params.item.shop_name);
  const terms = quote.terms;
  const ticked = termsTicked(terms, tickedFor);
  const idCheck = idCheckCopy(quote, idRefused);
  // An extension is billed as its booking, by the server: no row for it.
  const billTo = extending
    ? ({ kind: "hidden" } as const)
    : billToRow(Boolean(userDetails?.billing_as_business), buyerGstin.data, billToOff, buyerGstin.isError);
  const gstLine = billTo.kind === "hidden" ? null : gstInvoiceLine(quote.gst_invoice);
  const idNeeded = idCheck?.state === "needed";

  // ---- Card mode ----
  const shop = params.item.shop_name;
  const words = card ? { shop, madeOf: madeOf(quote.lines, titleOf) } : undefined;
  const lineOf = (name: string) => quote.lines?.find((line) => line.product === name);
  const changes = card ? lineChanges(was, quote) : {};
  // The number of an earlier request for an item, when Book now's refusal named it (CT-44c).
  const requestOf = (name: string) =>
    refused?.code === "already_requested" && refused.details?.product === name && typeof refused.details?.number === "string"
      ? refused.details.number
      : null;
  const blocked = card ? items.map((line) => line.name).filter((name) => lineBlock(lineOf(name))) : [];
  const blockedItems = blocked.map((name) => ({
    title: titleOf(name),
    code: lineBlock(lineOf(name)) as string,
    number: requestOf(name),
  }));
  // CT-44: the whole card refused, by Book now or already by the quote.
  const refusalCode = card
    ? refused?.code ?? quote.blockers.find((code) => code === "one_item_only" || code === "too_many_in_flight") ?? null
    : null;
  const refusalCopy = refusalCode
    ? refusalNotice(refusalCode, {
        shop,
        amount: money(quote.pay_now),
        details: refused?.code === refusalCode ? refused.details : null,
        titleOf,
      })
    : null;
  const refusalWay = refusalCode ? refusalButton(refusalCode) : null;
  // Leaving an item answers a refusal that named it (CT-44c); the old amounts included it, so they go too.
  const drop = (more: string[]) => {
    if (signedIn) for (const name of more) trackLeftOut(attempt.current, name, lineBlock(lineOf(name)) ?? "customer");
    setDropped((was) => [...was, ...more]);
    setRefused(null);
    setWas(null);
  };
  const depositPage = card ? depositOwnPage(quote) : null;

  const openIdCheck = () => {
    // The check is ENG-12's and has no customer flow in this build; see `startIdCheck`.
    if (!startIdCheck(navigation)) {
      toast.info("The ID check isn't open in the app yet", {
        message: "Contact Renit from your profile and we will help.",
      });
    }
  };

  const book = async () => {
    if (busy.current) return;
    if (!signedIn) {
      // The session ended while this screen was open: signing in returns to the listing, dates kept.
      rememberReturnTo({
        name: "ProductDetail",
        params: { id: params.item.name, dates: { first_day: params.first_day, last_day: params.last_day } },
      });
      toast.info("Sign in to book", { message: "You'll come back to this listing." });
      navigation.navigate("Welcome");
      return;
    }
    busy.current = true;
    setBooking(true);
    setBookError(null);
    setWas(null);
    setRefused(null);
    clientKey.current ??= uuidv4();
    try {
      // The version on screen when the box was ticked; the server stores it with the booking.
      const terms_version = ticked && terms ? terms.version : null;
      const answer = extending
        ? await extendBooking(extending, {
            last_day: quote.last_day,
            terms_version,
            expected_total: quote.total,
            client_key: clientKey.current,
          })
        : await bookNow({
            ...input,
            // B1: the carrier it was quoted with; the server refuses a change with `price_changed`.
            ...bookBy(quote),
            terms_version,
            expected_total: quote.total,
            // Card mode: the deposit seen too (D36), and whether the cart's lines go "in checkout" (D6).
            ...(asCard ? { expected_deposit: quote.deposit.amount } : {}),
            ...(params.from_cart ? { from_cart: true } : {}),
            ...(billTo.kind === "switch" && billTo.on ? { bill_to: true } : {}),
            source: await currentSource(),
            moved_from: movedFrom,
            client_key: clientKey.current,
          });
      clientKey.current = null;
      if (!extending) track("checkout_booked", { from }, attempt.current);
      // The booking carries its own pay page (`pay_now.payment`) and the next screen
      // pays from it. This answer's `payment` is that same page, so it stands in if
      // the booking beside it came without one.
      const { booking: booked, payment } = answer;
      queryClient.setQueryData(
        bookingQueryKey(booked.number),
        payment && booked.pay_now && !booked.pay_now.payment
          ? { ...booked, pay_now: { ...booked.pay_now, payment } }
          : booked
      );
      // The booking exists now, so the way back is to the Rentals tab, not to the price screen;
      // from the cart, through the cart while it has more to check out (cart plan §3.4).
      const fromCart = Boolean(params.from_cart) && !extending;
      if (!extending) rememberDates(params.first_day, params.last_day);
      navigation.reset(
        afterBookRoutes({
          number: answer.booking.number,
          pay: Boolean(answer.payment),
          fromCart,
          cart: queryClient.getQueryData<Cart>(cartQueryKey(userDetails?.username)),
          // Every item this booking took; a card's are the lines still in it after any Leave in cart here.
          booked: items.map((line) => line.name),
        })
      );
      // Its lines are in checkout now.
      if (fromCart) void queryClient.invalidateQueries("cart");
    } catch (error) {
      const failure = apiError(error);
      // A refusal ends this tap. No answer, or a fault on the way, may mean the
      // booking was made and its reply lost, so the next tap asks with the same key.
      if (bookRefusalIsFinal(failure)) clientKey.current = null;
      if (failure?.code === "move_not_allowed") setMovedFrom(null);
      // The terms moved on while the screen was open: the box empties and is asked for again.
      if (failure?.code === "terms_not_accepted") setTickedFor(null);
      // The GSTIN was removed on another screen or phone: show what is saved now, with Bill to off.
      if (failure?.code === "bill_to_unavailable") {
        setBillToOff(true);
        void buyerGstin.refetch();
      }
      if (failure?.code === "id_check_needed") {
        setIdRefused(typeof failure.details?.needed === "string" ? failure.details.needed : "id");
      }
      if (card && failure?.code === "price_changed") setWas(quote);
      // Kept on Book Now too, for the request `already_requested` names; only a card draws CT-44 from it.
      if (failure?.code && CARD_REFUSALS.includes(failure.code)) {
        setRefused({ code: failure.code, details: failure.details });
      }
      if (!extending) track("checkout_book_failed", { from, code: failureCode(failure) }, attempt.current);
      setBookError(
        failure?.code === "already_extending" || failure?.code === "shop_closed" || failure?.code === "too_late_to_extend"
          ? dayErrorText(failure, new Date())
          : (card ? lineRefusalNote(failure, titleOf) : null) ?? bookErrorText(failure)
      );
      // Whatever refused it (the price, the last unit, the shop closing) is in a fresh quote.
      if (failure && failure.status > 0) void quoteQuery.refetch();
    } finally {
      busy.current = false;
      setBooking(false);
    }
  };

  return (
    <NonScrollableContainer>
      {header}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.md }}
      >
        {refusalCopy ? (
          <Notice tone="warning" icon="warning" title={refusalCopy.title}>
            {refusalCopy.text}
          </Notice>
        ) : null}

        {notice ? (
          <Notice tone="warning" icon="clock">
            <Text fontSize="text-sm" fontWeight="font-bold" tone="warning">
              {notice.lead}
            </Text>
            {` ${notice.rest}`}
          </Notice>
        ) : null}

        {card ? (
          // CT-22: the shop once, the dates, then a row per item.
          <Panel style={{ padding: space.md, gap: space.xs }}>
            <ShopHead
              name={shop}
              delivers={quote.delivery_mode === "owner_delivery"}
              handover={
                quote.delivery_mode === "pickup"
                  ? `Self pickup · You collect it from ${shop}`
                  : `${howLabel(quote.delivery_mode, params.address_name, courierQuote(quote))} · ${money(quote.delivery.fee)}`
              }
              dates={`${rangeLabel(quote.first_day, quote.last_day, true)} · ${daysLabel(quote.days)}`}
            />
            <View style={{ height: 1, backgroundColor: color.line, marginVertical: space.xs }} />
            {items.map((item) => {
              const line = lineOf(item.name);
              const code = lineBlock(line);
              const number = requestOf(item.name);
              const chips: { chip: LineChip; onView?: () => void }[] = (changes[item.name] ?? []).map((text) => ({
                chip: { text, tone: "warning" },
              }));
              const said = code ? lineChip(code, { review: true, number }) : null;
              if (said) {
                chips.push({
                  chip: said,
                  onView: number ? () => navigation.navigate("Booking", { number }) : undefined,
                });
              }
              return (
                <LineRow
                  key={item.name}
                  title={item.title}
                  image={item.cover_image}
                  meta={line ? `${money(line.rate)} a day · ${daysLabel(quote.days)}` : daysLabel(quote.days)}
                  amount={line ? money(line.rent) : null}
                  deposit={line && Number(line.deposit) > 0 ? `Deposit ${money(line.deposit)}` : null}
                  chips={chips}
                  // The last item can't be left: the bar's way on is other dates then.
                  action={code && blocked.length < items.length ? { label: "Leave in cart", onPress: () => drop([item.name]) } : undefined}
                />
              );
            })}
          </Panel>
        ) : (
          <SummaryCard
            title={params.item.title}
            image={params.item.cover_image}
            lines={[
              `${rangeLabel(quote.first_day, quote.last_day, true)} · ${daysLabel(quote.days)}`,
              // ENG-284: self pickup says where it is collected, as the design writes it.
              quote.delivery_mode === "pickup" && !params.extends
                ? `You collect it from ${params.item.shop_name}`
                : `${howLabel(quote.delivery_mode, params.address_name, courierQuote(quote) && !extending)} · ${params.item.shop_name}`,
            ]}
          />
        )}
        {card && othersLine(params.others) ? (
          <Text fontSize="text-sm" tone="body">
            {othersLine(params.others)}
          </Text>
        ) : null}

        <Panel style={{ padding: space.md, gap: space.sm }}>
          {(card ? cardPriceLines(quote, items.length) : priceLines(quote, Boolean(params.extends))).map((line, index) => (
            <React.Fragment key={line.label}>
              {/* CT-23a: the rent before a price change, struck beside the new one. */}
              {card && index === 0 && wasAmount(was?.rent, quote.rent) ? (
                <MoneyLine {...line} struck={wasAmount(was?.rent, quote.rent)} amountTone="default" />
              ) : (
                <MoneyLine {...line} />
              )}
              {/* Under the rent, as the design draws it (ENG-281): how the plan's price came to the day rate. */}
              {index === 0 && rateLine(quote) ? (
                <Text fontSize="text-xs" tone="success">
                  {rateLine(quote)}
                </Text>
              ) : null}
            </React.Fragment>
          ))}
          <View style={{ height: 1, backgroundColor: color.line }} />
          <MoneyLine
            label={card ? "Total" : totalLabel(quote)}
            amount={money(quote.total)}
            struck={card ? wasAmount(was?.total, quote.total) : undefined}
            amountTone={card ? "default" : undefined}
            bold
          />
          {/* ENG-282: billed a month at a time, so the total is not what is paid at the start. */}
          {monthlyLine(quote) ? (
            <Text fontSize="text-sm" fontWeight="font-bold" tone="brand">
              {monthlyLine(quote)}
            </Text>
          ) : null}
        </Panel>

        <Text role="sectionTitle" accessibilityRole="header" style={{ marginTop: space.sm }}>
          What you pay, and when
        </Text>
        <Panel>
          {paySteps(quote, moved, undefined, words)
            // An extension's deposit is the first booking's, carried on: there is no deposit step.
            .filter((step) => !extending || step.title !== "Deposit")
            // CT-23a: a step whose amount moved at Book now says what it was.
            .map((step) =>
              card && was
                ? {
                    ...step,
                    was: step.title === "Deposit"
                      ? wasAmount(was.deposit.amount, quote.deposit.amount)
                      : step.title !== "Now"
                        ? wasAmount(was.pay_after_accept, quote.pay_after_accept)
                        : undefined,
                  }
                : step
            )
            .map((step, index) => (
            <View
              key={step.title}
              accessible
              accessibilityLabel={`${step.title}: ${step.amount}. ${step.sub}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.md,
                padding: space.md,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: color.line,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: radius.full,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: color.brandPanel,
                }}
              >
                <Text fontSize="text-sm" fontWeight="font-bold" tone="brand">
                  {index + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text fontSize="text-md" fontWeight="font-bold">
                  {step.title}
                </Text>
                <Text fontSize="text-sm" tone="body">
                  {step.sub}
                </Text>
              </View>
              {step.was ? (
                <View style={{ alignItems: "flex-end" }}>
                  <Text fontSize="text-md" fontWeight="font-bold">
                    {step.amount}
                  </Text>
                  <Text fontSize="text-xs" tone="body">{`(was ${step.was})`}</Text>
                </View>
              ) : (
                <Text fontSize="text-md" fontWeight="font-bold">
                  {step.amount}
                </Text>
              )}
            </View>
          ))}
        </Panel>

        {/* A card's steps already say it all (FIXES B2 row 12). */}
        {extending || card ? null : (
          <Text fontSize="text-sm" fontWeight="font-bold">
            {totalLine(quote, moved)}
          </Text>
        )}

        {card && items.length > 1 ? (
          <Notice tone="info" icon="info">
            {`${shop} may accept only some items. You'll see the new total and can cancel with your ${money(quote.pay_now)} back.`}
          </Notice>
        ) : null}
        {/* CT-43a, D48: over ₹1 lakh the deposit is its own payment. */}
        {depositPage ? (
          <Notice tone="info" icon="info" title={depositPage.title}>
            {depositPage.text}
          </Notice>
        ) : null}

        <View style={{ gap: space.xs }}>
          {(extending ? extensionLines(quote.pay_now) : plainLines(quote, moved, words)).map((line) => (
            <Text key={line} fontSize="text-sm" tone="body">
              {line}
            </Text>
          ))}
        </View>

        {idCheck?.state === "needed" ? (
          <Panel style={{ padding: space.md, gap: space.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <IdentificationIcon size={24} color={color.brandText} />
              <Text fontSize="text-md" fontWeight="font-bold" style={{ flex: 1 }}>
                {idCheck.title}
              </Text>
            </View>
            <Text fontSize="text-sm" tone="body">
              {idCheck.body}
            </Text>
            <Button variant="outline" onPress={openIdCheck}>
              Start ID check
            </Button>
          </Panel>
        ) : idCheck ? (
          <View style={{ gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <CheckBadgeIcon size={20} color={color.success} />
              <Text fontSize="text-sm" fontWeight="font-bold" tone="success">
                {idCheck.title}
              </Text>
            </View>
            {idCheck.body ? (
              <Text fontSize="text-sm" tone="body">
                {idCheck.body}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* An item whose handover needs the ID match: the customer is told to bring an ID, with or without a check above. Not for an extension: the item is already with them. */}
        {handoverIdLine(quote, extending) ? (
          <Notice tone="info" icon="info">
            {handoverIdLine(quote, extending)}
          </Notice>
        ) : null}

        {billTo.kind === "switch" ? (
          <Panel style={{ padding: space.md, gap: space.xs }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <View style={{ flex: 1 }}>
                <Text fontSize="text-md" fontWeight="font-bold">
                  {`Bill to ${billTo.gstin.legal_name}`}
                </Text>
                <Text fontSize="text-sm" tone="body">
                  {`GSTIN ${shortGstin(billTo.gstin.gstin)}`}
                </Text>
              </View>
              <AppSwitch
                value={billTo.on}
                onValueChange={(on) => setBillToOff(!on)}
                accessibilityLabel={`Bill to ${billTo.gstin.legal_name}`}
              />
            </View>
            {gstLine ? (
              <Text fontSize="text-sm" tone="body">
                {gstLine}
              </Text>
            ) : null}
          </Panel>
        ) : billTo.kind === "add" ? (
          <Panel style={{ padding: space.md, gap: space.xs }}>
            <Text
              fontSize="text-sm"
              fontWeight="font-bold"
              tone="brand"
              accessibilityRole="button"
              onPress={() => {
                setBillToOff(false); // a GSTIN added now is billed, as the switch's default
                navigation.navigate("BusinessBilling");
              }}
            >
              Add your GSTIN to get a GST invoice
            </Text>
            {gstLine ? (
              <Text fontSize="text-sm" tone="body">
                {gstLine}
              </Text>
            ) : null}
          </Panel>
        ) : billTo.kind === "loading" ? (
          // Book waits for it (a booking's bill-to can't be added later), so say why.
          <Text fontSize="text-sm" tone="body">
            Loading your GSTIN…
          </Text>
        ) : billTo.kind === "failed" ? (
          <Notice tone="warning" icon="warning">
            {"We couldn't load your GSTIN, so this booking won't be billed to your business."}
            <Text
              fontSize="text-sm"
              fontWeight="font-bold"
              tone="brand"
              accessibilityRole="button"
              onPress={() => void buyerGstin.refetch()}
            >
              {"  Try again"}
            </Text>
          </Notice>
        ) : null}

        {terms ? (
          <RentalTermsTick
            checked={ticked}
            onChange={(next) => setTickedFor(next ? terms.version : null)}
            onOpenTerms={() => void Linking.openURL(terms.url).catch(() => navigation.navigate("Terms"))}
          />
        ) : null}

        {/* Delivery gone: the bottom bar already says why, once. A card's refusal is said at the top. */}
        {blocker &&
        blocker.code !== refusalCode &&
        !(deliveryGone && ["too_far", "area_off", "delivery_not_offered"].includes(blocker.code)) ? (
          <Notice tone="warning" icon="warning">
            {blocker.text}
            {blocker.code === "phone_required" ? (
              <Text
                fontSize="text-sm"
                fontWeight="font-bold"
                tone="brand"
                accessibilityRole="button"
                onPress={() => navigation.navigate("MainTabs", { screen: "Profile" })}
              >
                {"  Go to profile"}
              </Text>
            ) : blocker.code === "too_many_in_flight" ? (
              // Book Now's way on from D49's cap; a card's is its CT-44b button.
              <Text
                fontSize="text-sm"
                fontWeight="font-bold"
                tone="brand"
                accessibilityRole="button"
                onPress={() => navigation.navigate("MainTabs", { screen: "Rentals" })}
              >
                {"  See your open requests"}
              </Text>
            ) : null}
          </Notice>
        ) : null}
      </ScrollView>

      <BottomBar>
        {card && blocked.length ? (
          // CT-23b: the item in the way, named; its own row says why.
          <Text fontSize="text-sm" tone="warning" accessibilityRole="alert" style={{ textAlign: "center" }}>
            {blockedNote(blockedItems, true)}
          </Text>
        ) : card && bookError && !deliveryGone && !refusalCopy ? (
          <Text fontSize="text-sm" tone="warning" accessibilityRole="alert" style={{ textAlign: "center" }}>
            {bookError}
          </Text>
        ) : !card && bookError && !deliveryGone ? (
          <Text fontSize="text-sm" tone="danger" accessibilityRole="alert">
            {bookError}
          </Text>
        ) : null}
        {deliveryGone ? (
          <Text fontSize="text-sm" tone="warning" accessibilityRole="alert">
            {deliveryReason(quote.delivery, params.item.shop_name, null)}
          </Text>
        ) : null}
        {deliveryGone ? (
          // The shop stopped delivering here while this screen was open (an area turned off, the
          // distance cut, delivery switched off): Book now can only be refused again, so the way
          // on is back to "How will you get it?", which falls back to self pickup and says why.
          <Button onPress={() => navigation.goBack()}>Change to self pickup</Button>
        ) : refusalWay ? (
          // CT-44: nothing can be booked from here; the way on is the cart or the open requests.
          <Button
            onPress={() =>
              refusalCode === "one_item_only"
                ? navigation.dispatch(StackActions.pop(2))
                : navigation.navigate("MainTabs", { screen: "Rentals" })
            }
          >
            {refusalWay}
          </Button>
        ) : card && blocked.length ? (
          // G11: the main button is the fix. With every item in the way, the dates are.
          blocked.length < items.length ? (
            <Button onPress={() => drop(blocked)} disabled={quoteQuery.isFetching}>
              {fixLabel(blocked.length)}
            </Button>
          ) : (
            <Button onPress={() => navigation.goBack()}>Pick other dates</Button>
          )
        ) : (
          <Button
            onPress={book}
            loading={booking}
            // Signed out there are no terms in the quote: the tap asks to sign in instead.
            disabled={
              booking ||
              Boolean(blocker) ||
              idNeeded ||
              quoteQuery.isFetching ||
              (terms !== null && !ticked) ||
              billTo.kind === "loading"
            }
          >
            {extending ? `Extend · Pay ${money(quote.pay_now)}` : bookLabel(quote, moved)}
          </Button>
        )}
      </BottomBar>
    </NonScrollableContainer>
  );
}
