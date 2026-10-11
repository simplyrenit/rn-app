import { QuoteInput, bookNow, bookingQueryKey, useQuote } from "@/backend/bookings";
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
import { RentalTermsTick } from "@/components/terms/owner-terms-tick";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { apiError } from "@/lib/api-error";
import {
  bookErrorText,
  bookLabel,
  daysLabel,
  howLabel,
  idCheckCopy,
  money,
  morningNotice,
  paySteps,
  plainLines,
  priceLines,
  rangeLabel,
  reviewBlocker,
  termsTicked,
  totalLabel,
} from "@/lib/booking";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { startIdCheck } from "@/lib/id-check";
import { rememberPayment } from "@/lib/payments";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { uuidv4 } from "@/lib/uuid";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import React, { useCallback, useMemo, useRef, useState } from "react";
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
 */
export default function ReviewAndBookScreen() {
  const { params } = useRoute<RouteProps<"ReviewAndBook">>();
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const queryClient = useQueryClient();
  const { authTokens, isAuthenticated } = useGlobalContext();
  const signedIn = Boolean(isAuthenticated && authTokens?.access_token);

  const input: QuoteInput = useMemo(
    () => ({
      product: params.item.name,
      first_day: params.first_day,
      last_day: params.last_day,
      delivery_mode: params.delivery_mode,
      address_id: params.address_id ?? null,
    }),
    [params.item.name, params.first_day, params.last_day, params.delivery_mode, params.address_id]
  );
  const quoteQuery = useQuote(input);
  const quote = quoteQuery.data;

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

  // Coming back to this screen (from the profile, from a sign-in) asks for the price again.
  const seen = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (seen.current) {
        // Back from the ID check (or anywhere else): the quote says afresh whether it is passed.
        setIdRefused(null);
        void quoteQuery.refetch();
      }
      seen.current = true;
      // `refetch` is stable for the life of the query.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const header = <SubpageHeader title="Review and book" />;

  if (!quote) {
    return (
      <NonScrollableContainer>
        {header}
        {quoteQuery.isError ? (
          <BookingLoadError error={quoteQuery.error} what="the price" onRetry={() => void quoteQuery.refetch()} />
        ) : (
          <BookingLoading label="Working out the price" />
        )}
      </NonScrollableContainer>
    );
  }

  const moved = movedFrom !== null;
  const blocker = reviewBlocker(quote);
  const notice = morningNotice(quote, params.item.shop_name);
  const terms = quote.terms;
  const ticked = termsTicked(terms, tickedFor);
  const idCheck = idCheckCopy(quote, idRefused);
  const idNeeded = idCheck?.state === "needed";

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
      toast.info("Sign in to book");
      navigation.navigate("Welcome");
      return;
    }
    busy.current = true;
    setBooking(true);
    setBookError(null);
    clientKey.current ??= uuidv4();
    try {
      const answer = await bookNow({
        ...input,
        // The version on screen when the box was ticked; the server stores it with the booking.
        terms_version: ticked && terms ? terms.version : null,
        expected_total: quote.total,
        moved_from: movedFrom,
        client_key: clientKey.current,
      });
      clientKey.current = null;
      if (answer.payment) await rememberPayment(answer.booking.number, answer.payment);
      queryClient.setQueryData(bookingQueryKey(answer.booking.number), answer.booking);
      // The booking exists now, so the way back is to the Rentals tab, not to the price screen.
      navigation.reset({
        index: 1,
        routes: [
          { name: "MainTabs", params: { screen: "Rentals" } },
          { name: "Booking", params: { number: answer.booking.number, pay: Boolean(answer.payment) } },
        ],
      });
    } catch (error) {
      const failure = apiError(error);
      // An answer ends this tap. No answer at all may mean the booking was made
      // and its reply lost, so the next tap asks with the same key.
      if (failure && failure.status > 0) clientKey.current = null;
      if (failure?.code === "move_not_allowed") setMovedFrom(null);
      // The terms moved on while the screen was open: the box empties and is asked for again.
      if (failure?.code === "terms_not_accepted") setTickedFor(null);
      if (failure?.code === "id_check_needed") {
        setIdRefused(typeof failure.details?.needed === "string" ? failure.details.needed : "id");
      }
      setBookError(bookErrorText(failure));
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
        {notice ? (
          <Notice tone="warning" icon="clock">
            <Text fontSize="text-sm" fontWeight="font-bold" tone="warning">
              {notice.lead}
            </Text>
            {` ${notice.rest}`}
          </Notice>
        ) : null}

        <SummaryCard
          title={params.item.title}
          image={params.item.cover_image}
          lines={[
            `${rangeLabel(quote.first_day, quote.last_day, true)} · ${daysLabel(quote.days)}`,
            `${howLabel(quote.delivery_mode, params.address_name)} · ${params.item.shop_name}`,
          ]}
        />

        <Panel style={{ padding: space.md, gap: space.sm }}>
          {priceLines(quote).map((line) => (
            <MoneyLine key={line.label} {...line} />
          ))}
          <View style={{ height: 1, backgroundColor: color.line }} />
          <MoneyLine label={totalLabel(quote)} amount={money(quote.total)} bold />
        </Panel>

        <Text role="sectionTitle" accessibilityRole="header" style={{ marginTop: space.sm }}>
          What you pay, and when
        </Text>
        <Panel>
          {paySteps(quote, moved).map((step, index) => (
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
              <Text fontSize="text-md" fontWeight="font-bold">
                {step.amount}
              </Text>
            </View>
          ))}
        </Panel>

        <View style={{ gap: space.xs }}>
          {plainLines(quote).map((line) => (
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

        {terms ? (
          <RentalTermsTick
            checked={ticked}
            onChange={(next) => setTickedFor(next ? terms.version : null)}
            onOpenTerms={() => void Linking.openURL(terms.url).catch(() => navigation.navigate("Terms"))}
          />
        ) : null}

        {blocker ? (
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
            ) : null}
          </Notice>
        ) : null}
      </ScrollView>

      <BottomBar>
        {bookError ? (
          <Text fontSize="text-sm" tone="danger" accessibilityRole="alert">
            {bookError}
          </Text>
        ) : null}
        <Button
          onPress={book}
          loading={booking}
          // Signed out there are no terms in the quote: the tap asks to sign in instead.
          disabled={
            booking || Boolean(blocker) || idNeeded || quoteQuery.isFetching || (terms !== null && !ticked)
          }
        >
          {bookLabel(quote, moved)}
        </Button>
      </BottomBar>
    </NonScrollableContainer>
  );
}
