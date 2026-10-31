import { useCart } from "@/backend/cart";
import { Panel, Pill, TextButton, Thumb } from "@/components/booking/parts";
import { Button, Text } from "@/components/core";
import { BookingCustomer, BookingLine, money } from "@/lib/booking";
import { isBasket, itemsText, leftOutChip, leftOutLines, liveLines, madeOf, reviewableItems } from "@/lib/booking-lines";
import { space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { View } from "react-native";
import { CheckCircleIcon } from "react-native-heroicons/outline";

type PillTone = React.ComponentProps<typeof Pill>["tone"];

/**
 * One item of a booking (cart plan §3.7, CT-31): the photo, the name, a quiet line, its rent and deposit share, and a chip
 * for where it stands. `struck`: not in the booking (G12), its title dim and its amounts crossed out, never faded.
 * `right` sits beside the title (CT-27's tick); `children` under it (the day-of's Got it / Not here).
 */
export function ItemRow({
  title,
  image,
  meta,
  amount,
  deposit,
  struck = false,
  chip,
  right,
  first = true,
  children,
}: {
  title: string;
  image?: string | null;
  meta?: string | null;
  amount?: string | null;
  deposit?: string | null;
  struck?: boolean;
  chip?: { label: string; tone: PillTone } | null;
  right?: React.ReactNode;
  /** The first row of a list has no hairline above it. */
  first?: boolean;
  children?: React.ReactNode;
}) {
  const { color } = useTheme();
  const strike = struck ? ({ textDecorationLine: "line-through" } as const) : undefined;
  return (
    <View style={{ gap: space.sm, paddingVertical: space.md, borderTopWidth: first ? 0 : 1, borderTopColor: color.line }}>
      <View style={{ flexDirection: "row", gap: space.md }}>
        <Thumb uri={image} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Text fontSize="text-md" fontWeight="font-bold" tone={struck ? "dim" : "default"} numberOfLines={2} style={{ flex: 1 }}>
              {title}
            </Text>
            {right}
          </View>
          {meta ? (
            <Text fontSize="text-sm" tone="body">
              {meta}
            </Text>
          ) : null}
          {amount || deposit ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", columnGap: space.sm }}>
              {amount ? (
                <Text fontSize="text-md" fontWeight="font-bold" tone={struck ? "body" : "default"} style={strike}>
                  {amount}
                </Text>
              ) : null}
              {deposit ? (
                <Text fontSize="text-sm" tone="body" style={strike}>
                  {deposit}
                </Text>
              ) : null}
            </View>
          ) : null}
          {chip ? (
            <View style={{ flexDirection: "row", marginTop: space.xs }}>
              <Pill label={chip.label} tone={chip.tone} />
            </View>
          ) : null}
        </View>
      </View>
      {children}
    </View>
  );
}

/**
 * "Still in your cart" (D6, CT-29, CT-41, CT-47a): the booking's items that are in the customer's cart now, as the cart
 * draws them (G21: a day's rate and the deposit), and the way back to it. Read from the cart itself, so it never says an
 * item is there that was removed meanwhile; nothing is drawn when none is.
 */
export function StillInCart({ booking, movedFrom }: { booking: BookingCustomer; movedFrom?: string }) {
  const { cart } = useCart();
  const navigation = useTypedNavigation();
  const names = new Set((booking.lines ?? []).map((line) => line.product.name).filter(Boolean));
  const inCart = (cart?.cards ?? []).flatMap((card) => card.lines).filter((line) => names.has(line.product.name));
  if (!inCart.length) return null;
  return (
    <View style={{ gap: space.sm }}>
      <Text role="sectionTitle" accessibilityRole="header">
        {`Still in your cart · ${itemsText(inCart.length)}`}
      </Text>
      <Panel style={{ paddingHorizontal: space.md }}>
        {inCart.map((line, index) => (
          <ItemRow
            key={line.product.name}
            first={index === 0}
            title={line.product.title}
            image={line.product.cover_image}
            amount={line.product.rate ? `${money(line.product.rate)} a day` : null}
            deposit={`Deposit ${money(line.product.deposit)}`}
          />
        ))}
      </Panel>
      <Button onPress={() => navigation.navigate("Cart")}>Go to your cart</Button>
      {/* §3.3: other dates rerun this card's checkout; the ₹99 moves with it while it still can (`movedFrom`). */}
      <TextButton
        label="Pick other dates"
        onPress={() =>
          navigation.navigate("BookingDates", {
            products: inCart.map((line) => line.product.name),
            from_cart: true,
            moved_from: movedFrom,
          })
        }
      />
    </View>
  );
}

/** The listing names of the customer's cart lines, to say "Still in your cart" only where it is true. */
function useCartNames(): Set<string> {
  const { cart } = useCart();
  return new Set((cart?.cards ?? []).flatMap((card) => card.lines.map((line) => line.product.name)));
}

/** An item the shop left out (G12): dim, struck, its chip, and whether it is still in the cart. */
function LeftOutRow({ line, first, inCart }: { line: BookingLine; first: boolean; inCart: boolean }) {
  return (
    <ItemRow
      first={first}
      struck
      title={line.product.title}
      image={line.product.cover_image}
      meta={inCart ? "Still in your cart" : null}
      amount={money(line.rent)}
      deposit={`Deposit ${money(line.deposit)}`}
      chip={leftOutChip(line)}
    />
  );
}

/**
 * CT-31, the booking screen's items: each live one with its ref (D38), rent and deposit share, "Accepted" once the shop
 * said yes, and the deposit's make-up (D21). The ones the shop left out follow under "Not in this booking". Nothing for a
 * booking of one item, whose summary card says it all.
 */
export function BookingItems({ booking }: { booking: BookingCustomer }) {
  const cartNames = useCartNames();
  if (!isBasket(booking)) return null;
  const live = liveLines(booking);
  const out = leftOutLines(booking);
  const accepted = !booking.exit && ["accepted", "confirmed", "ready"].includes(booking.stage);
  const shares = madeOf(booking);
  const them = out.length === 1 ? "it" : "them";
  return (
    <>
      <View style={{ gap: space.sm }}>
        <Text role="sectionTitle" accessibilityRole="header">
          {`Items (${live.length})`}
        </Text>
        <Panel style={{ paddingHorizontal: space.md }}>
          {live.map((line, index) => (
            <ItemRow
              key={line.id}
              first={index === 0}
              title={line.product.title}
              image={line.product.cover_image}
              meta={line.ref}
              amount={money(line.rent)}
              deposit={`Deposit ${money(line.deposit)}`}
              chip={accepted ? { label: "Accepted", tone: "success" } : null}
            />
          ))}
          {shares ? (
            <Text fontSize="text-sm" tone="body" style={{ paddingBottom: space.md }}>
              {`Deposit ${money(booking.money.deposit)}, made of: ${shares}.`}
            </Text>
          ) : null}
        </Panel>
      </View>
      {out.length ? (
        <View style={{ gap: space.sm }}>
          <Text role="sectionTitle" accessibilityRole="header">
            {`Not in this booking (${out.length})`}
          </Text>
          <Panel style={{ paddingHorizontal: space.md }}>
            {out.map((line, index) => (
              <LeftOutRow key={line.id} line={line} first={index === 0} inCart={cartNames.has(line.product.name ?? "")} />
            ))}
            <Text fontSize="text-sm" tone="body" style={{ paddingBottom: space.md }}>
              {`${booking.shop.name} couldn't do ${them} for these dates. You weren't charged for ${them}.`}
            </Text>
          </Panel>
        </View>
      ) : null}
    </>
  );
}

/** ENG-342: a closed rental's items, each with the way into its review form, where one is most likely written. */
export function ReviewItems({ booking }: { booking: BookingCustomer }) {
  const navigation = useTypedNavigation();
  const items = reviewableItems(booking);
  if (!items.length) return null;
  return (
    <View style={{ gap: space.sm }}>
      <Text role="sectionTitle" accessibilityRole="header">
        Review your rental
      </Text>
      <Panel style={{ paddingHorizontal: space.md }}>
        {items.map((product, index) => (
          <ItemRow key={product.name} first={index === 0} title={product.title} image={product.cover_image}>
            <Button
              variant="outline"
              size="compact"
              accessibilityLabel={`Write a review of ${product.title}`}
              onPress={() => navigation.navigate("WriteReviews", { product })}
            >
              Write a review
            </Button>
          </ItemRow>
        ))}
      </Panel>
    </View>
  );
}

/** CT-26, CT-27: the shop's answer item by item, a tick on each it can do and the rest struck. */
export function ShopAnswer({ booking }: { booking: BookingCustomer }) {
  const { color } = useTheme();
  const cartNames = useCartNames();
  const live = liveLines(booking);
  return (
    <Panel style={{ paddingHorizontal: space.md }}>
      {live.map((line, index) => (
        <ItemRow
          key={line.id}
          first={index === 0}
          title={line.product.title}
          image={line.product.cover_image}
          amount={money(line.rent)}
          deposit={`Deposit ${money(line.deposit)}`}
          right={<CheckCircleIcon size={22} color={color.success} accessibilityLabel="Accepted" />}
        />
      ))}
      {leftOutLines(booking).map((line) => (
        <LeftOutRow key={line.id} line={line} first={false} inCart={cartNames.has(line.product.name ?? "")} />
      ))}
    </Panel>
  );
}

/** CT-35, CT-35b: a basket's live items by name, under a heading ("Items (3)", "Lens Lane collects"). */
export function ItemList({ booking, title }: { booking: BookingCustomer; title: string }) {
  const live = liveLines(booking);
  if (!isBasket(booking) || live.length < 2) return null;
  return (
    <View style={{ gap: space.sm }}>
      <Text role="sectionTitle" accessibilityRole="header">
        {title}
      </Text>
      <Panel style={{ paddingHorizontal: space.md }}>
        {live.map((line, index) => (
          <ItemRow key={line.id} first={index === 0} title={line.product.title} image={line.product.cover_image} />
        ))}
      </Panel>
    </View>
  );
}
