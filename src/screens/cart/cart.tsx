import { useBookings } from "@/backend/bookings";
import { useCart } from "@/backend/cart";
import useSaved from "@/backend/useSaved";
import { BookingLoading, Notice, Thumb } from "@/components/booking/parts";
import { CartChip, RentStrip } from "@/components/cart/parts";
import { Avatar, Button, EmptyState, SubpageHeader, Text, VerifiedBusinessBadge } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { apiError } from "@/lib/api-error";
import { BookingCustomer, clock } from "@/lib/booking";
import {
  CartCard,
  CartLine,
  CartProduct,
  CartShop,
  addFailure,
  cardDeposit,
  cardNote,
  cartSize,
  checkoutDates,
  checkoutLines,
  lineNote,
  waitingForRent,
} from "@/lib/cart";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { formatCurrency } from "@/lib/format";
import { pluralize } from "@/lib/pluralize";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, TouchableOpacity, View } from "react-native";
import { ExclamationTriangleIcon, MapPinIcon, ShoppingBagIcon, TruckIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** A quiet brand action written as a word: Remove, Move to Saved. */
function LinkButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      activeOpacity={0.6}
      disabled={disabled}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8 }}
      style={{ minHeight: 32, justifyContent: "center", alignSelf: "flex-start", opacity: disabled ? 0.5 : 1 }}
    >
      <Text fontSize="text-sm" fontWeight="font-semibold" tone="brand">
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Figma CT-10: one row of a shop's card. The rate a day and the deposit, as
 * dates are picked at checkout (G21); at most one warning; Remove and Move to
 * Saved, which a line in checkout does not offer (G18).
 */
function LineRow({
  line,
  card,
  busy,
  bookAlone,
  onRemove,
  onMove,
  onBook,
  onOpenBooking,
}: {
  line: CartLine;
  card: CartCard;
  busy: boolean;
  /** One item per booking at this shop for now: the line offers Book now on its own (§3.2 `one_item_only`). */
  bookAlone: boolean;
  onRemove: () => void;
  onMove: () => void;
  onBook: () => void;
  onOpenBooking: (number: string) => void;
}) {
  const code = line.warning?.code;
  const gone = code === "not_listed";
  const inCheckout = code === "in_checkout";
  const note = lineNote(line, card);
  // A listing that is gone keeps its row, drawn as left out (G12): words dimmed, money struck.
  const struck = gone ? ({ textDecorationLine: "line-through" } as const) : undefined;
  const { product } = line;
  return (
    <View style={{ flexDirection: "row", gap: 12, paddingVertical: 12 }}>
      <View style={{ opacity: gone ? 0.5 : 1 }}>
        <Thumb uri={product.cover_image} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text fontSize="text-md" fontWeight="font-semibold" tone={gone ? "dim" : undefined} numberOfLines={2}>
          {product.title}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", columnGap: 8 }}>
          {product.rate ? (
            <Text fontSize="text-md" fontWeight="font-bold" tone={gone ? "dim" : undefined} style={struck}>
              {`${formatCurrency(product.rate)} a day`}
            </Text>
          ) : null}
          {Number(product.deposit) > 0 ? (
            <Text fontSize="text-sm" tone={gone ? "dim" : "body"} style={struck}>
              {`Deposit ${formatCurrency(product.deposit)}`}
            </Text>
          ) : null}
        </View>
        {note ? (
          <CartChip
            text={note.text}
            tone={note.tone}
            onPress={note.booking ? () => onOpenBooking(note.booking!) : undefined}
          />
        ) : null}
        {!inCheckout && !gone ? <LinkButton label="Move to Saved" onPress={onMove} disabled={busy} /> : null}
        {bookAlone && !inCheckout && !gone ? (
          <View style={{ alignSelf: "flex-start" }}>
            <Button variant="outline" size="compact" onPress={onBook} accessibilityLabel={`Book ${product.title} on its own`}>
              Book now
            </Button>
          </View>
        ) : null}
      </View>
      {!inCheckout ? (
        <LinkButton label="Remove" onPress={onRemove} disabled={busy} />
      ) : null}
    </View>
  );
}

/** Figma CT-10 to CT-12: the shop, its warning, its lines and what Check out takes. */
function ShopCard({
  card,
  busy,
  quiet,
  bookings,
  onRemove,
  onMove,
  onCheckOut,
  onBook,
  onOpenBooking,
}: {
  card: CartCard;
  busy: string | null;
  /** Another booking waits for its rent: that payment is the loud action (G24), so Check out steps back. */
  quiet: boolean;
  bookings: BookingCustomer[];
  onRemove: (line: CartLine) => void;
  onMove: (line: CartLine) => void;
  onCheckOut: () => void;
  onBook: (name: string) => void;
  onOpenBooking: (number: string) => void;
}) {
  const { color } = useTheme();
  const { shop } = card;
  const note = cardNote(card);
  const going = checkoutLines(card);
  const deposit = cardDeposit(card);
  const checkingOut = card.lines.find((l) => l.warning?.code === "in_checkout");
  const checkoutNumber = checkingOut ? checkingOut.booking ?? (checkingOut.warning as { booking: string }).booking : null;
  const checkoutBooking = bookings.find((b) => b.number === checkoutNumber);
  const hairline = { height: 1, backgroundColor: color.line } as const;

  let footer: React.ReactNode = null;
  if (going.length > 0) {
    const caption =
      card.warning?.code === "one_item_only"
        ? "Each item is booked on its own for now"
        : card.warning?.code === "shop_paused"
          ? "Check out is off for now"
          : deposit > 0
            ? `Deposit ${formatCurrency(deposit)} (refundable)`
            : null;
    footer = (
      <>
        <View style={{ flex: 1, gap: 2 }}>
          <Text fontSize="text-md" fontWeight="font-bold">
            {pluralize(going.length, "item")}
          </Text>
          {caption ? (
            <Text fontSize="text-sm" tone="body">
              {caption}
            </Text>
          ) : null}
        </View>
        <Button
          variant={note?.off || quiet ? "outline" : "primary"}
          disabled={Boolean(note?.off)}
          onPress={onCheckOut}
          accessibilityLabel={`Check out ${pluralize(going.length, "item")} from ${shop.name}`}
        >
          Check out
        </Button>
      </>
    );
  } else if (checkoutNumber) {
    // Every line is in one checkout: the footer names its stage and opens it (FIXES-r1 B1 row 3).
    const stage =
      checkoutBooking?.stage === "ringing"
        ? `Asking ${shop.name}`
        : checkoutBooking?.stage === "accepted"
          ? `Waiting for your payment${checkoutBooking.money.rent_due_at ? ` · by ${clock(checkoutBooking.money.rent_due_at)}` : ""}`
          : null;
    footer = (
      <>
        <View style={{ flex: 1, gap: 2 }}>
          <Text fontSize="text-md" fontWeight="font-bold">
            {`${pluralize(card.lines.filter((l) => l.warning?.code === "in_checkout").length, "item")} in checkout`}
          </Text>
          {stage ? (
            <Text fontSize="text-sm" tone="body">
              {stage}
            </Text>
          ) : null}
        </View>
        <Button variant="outline" onPress={() => onOpenBooking(checkoutNumber)}>
          View booking
        </Button>
      </>
    );
  }

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: color.line,
        borderRadius: radius.card,
        backgroundColor: color.surface,
        paddingHorizontal: 16,
        paddingTop: 16,
      }}
    >
      <View style={{ flexDirection: "row", gap: 12, paddingBottom: 12 }}>
        <Avatar name={shop.name} size={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text fontSize="text-md" fontWeight="font-bold" numberOfLines={1} style={{ flexShrink: 1 }}>
              {shop.name}
            </Text>
            <VerifiedBusinessBadge verified={shop.verified} />
          </View>
          {shop.locality ? (
            <Text fontSize="text-sm" tone="body">
              {shop.locality}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {shop.delivers ? (
              <TruckIcon size={16} color={color.textBody} />
            ) : (
              <MapPinIcon size={16} color={color.textBody} />
            )}
            {/* The cart has no fee to show: it is worked out for the dates and address at checkout (FIXES-r1 B1 row 7). */}
            <Text fontSize="text-sm" tone="body">
              {shop.delivers ? "Delivers · fee at checkout" : "Self pickup only"}
            </Text>
          </View>
        </View>
      </View>

      {note ? (
        <View style={{ paddingBottom: 12 }}>
          <Notice tone={note.tone} icon={note.tone === "warning" ? "warning" : "info"} title={note.title}>
            {note.body}
          </Notice>
        </View>
      ) : null}

      <View style={hairline} />
      {card.lines.map((line) => (
        <LineRow
          key={line.product.name}
          line={line}
          card={card}
          busy={busy === line.product.name}
          bookAlone={card.warning?.code === "one_item_only"}
          onRemove={() => onRemove(line)}
          onMove={() => onMove(line)}
          onBook={() => onBook(line.product.name)}
          onOpenBooking={onOpenBooking}
        />
      ))}

      {footer ? (
        <>
          <View style={hairline} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16 }}>{footer}</View>
        </>
      ) : null}
    </View>
  );
}

/**
 * The customer's cart (cart plan §3.2, Figma CT-10 to CT-16, CT-42): one card
 * per shop, most recently changed first, each checking out as its own booking.
 * rn-api groups and warns; this screen draws. No grand total: each shop is its
 * own payment, priced at checkout.
 */
export default function CartScreen() {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const { cart, query, signedIn, add, remove } = useCart();
  const { favorites, saveFavorite, deleteFavorite } = useSaved();
  const openBookings = useBookings(true, signedIn);
  const bookings = openBookings.data?.pages.flatMap((page) => page.results) ?? [];
  const rentDue = Boolean(waitingForRent(bookings));
  // The line a write is under way for, so a second tap cannot race it.
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Lines change away from this screen: a booking's rent was paid (they leave), a price moved.
  useFocusEffect(
    useCallback(() => {
      if (signedIn) void query.refetch();
    }, [signedIn])
  );

  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([query.refetch(), openBookings.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  /** Undo: the line back in the cart. False when rn-api refused it, which the toast then says. */
  const putBack = async (shop: CartShop, product: CartProduct) => {
    try {
      await add({ product, shop });
      return true;
    } catch (error) {
      const failure = addFailure(apiError(error), shop.name);
      toast[failure.severity](failure.title, { message: failure.message });
      return false;
    }
  };

  const removeLine = async (card: CartCard, line: CartLine) => {
    setBusy(line.product.name);
    try {
      await remove(line.product.name);
    } catch {
      toast.error("Couldn't remove it", { message: "Check your connection and try again." });
      return;
    } finally {
      setBusy(null);
    }
    toast.neutral("Removed from cart", {
      message: line.product.title,
      // A listing that is gone can't go back in (404), nor a line of a shop that takes no carts now (409).
      action:
        line.warning?.code === "not_listed" || card.warning?.code === "one_item_only"
          ? undefined
          : { label: "Undo", onPress: () => void putBack(card.shop, line.product) },
    });
  };

  const moveToSaved = async (card: CartCard, line: CartLine) => {
    const name = line.product.name;
    const wasSaved = favorites.some((item) => item.name === name);
    setBusy(name);
    try {
      if (!wasSaved) await saveFavorite(name);
      await remove(name);
    } catch {
      toast.error("Couldn't move it to Saved", { message: "Check your connection and try again." });
      return;
    } finally {
      setBusy(null);
    }
    toast.neutral("Moved to Saved", {
      message: line.product.title,
      action: {
        label: "Undo",
        onPress: async () => {
          // Saved before it moved: Undo leaves it saved. And it stays saved unless it is back in the
          // cart, so a refused put-back (the shop lost the cart, the listing went) loses nothing.
          if ((await putBack(card.shop, line.product)) && !wasSaved) void deleteFavorite(name).catch(() => {});
        },
      },
    });
  };

  const checkOut = (card: CartCard) => {
    const products = checkoutLines(card).map((line) => line.product.name);
    if (!products.length || !cart) return;
    navigation.navigate("BookingDates", {
      // ponytail: `product` only until A3's card-mode dates step lands and makes it optional; then drop it.
      product: products[0],
      products,
      from_cart: true,
      others: { items: cart.count - card.lines.length, shops: cart.cards.length - 1 },
      ...checkoutDates(),
    });
  };

  const openBooking = (number: string) => navigation.navigate("Booking", { number });

  let body: React.ReactNode;
  if (!cart && signedIn && (query.isLoading || query.isIdle)) {
    body = <BookingLoading label="Loading your cart" />;
  } else if (!cart && signedIn) {
    body = (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <EmptyState
          variant="error"
          icon={<ExclamationTriangleIcon size={28} color={color.danger} />}
          title="Couldn't load your cart"
          body="Check your connection and try again. Your items are still in your cart."
          actionLabel="Try again"
          onAction={() => void query.refetch()}
        />
      </View>
    );
  } else if (!cart || cart.count === 0) {
    body = (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <EmptyState
          icon={<ShoppingBagIcon size={28} color={color.brandText} />}
          title="Your cart is empty"
          body="Add items from any shop. Each shop checks out on its own, on the dates you pick then."
          actionLabel="Find something to rent"
          onAction={() => navigation.navigate("MainTabs", { screen: "Home" })}
          secondaryActionLabel="See your Saved items"
          onSecondaryAction={() => navigation.navigate("MainTabs", { screen: "Saved" })}
        />
      </View>
    );
  } else {
    body = (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.lg }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.textBody} colors={[color.brand]} />
        }
      >
        <RentStrip />
        <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 16, gap: 16 }}>
          <View style={{ gap: 2 }}>
            <Text fontSize="text-md" fontWeight="font-bold">
              {cartSize(cart)}
            </Text>
            <Text fontSize="text-sm" tone="body">
              Each shop is a separate booking: pick dates, pay ₹99 to ask, then pay that shop's rent. Totals show at
              checkout.
            </Text>
          </View>
          {cart.cards.map((card) => (
            <ShopCard
              key={card.shop.key}
              card={card}
              busy={busy}
              quiet={rentDue}
              bookings={bookings}
              onRemove={(line) => void removeLine(card, line)}
              onMove={(line) => void moveToSaved(card, line)}
              onCheckOut={() => checkOut(card)}
              onBook={(name) => navigation.navigate("BookingDates", { product: name, ...checkoutDates() })}
              onOpenBooking={openBooking}
            />
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Your cart" />
      <View style={{ flex: 1, minHeight: MIN_TOUCH_TARGET }}>{body}</View>
    </NonScrollableContainer>
  );
}
