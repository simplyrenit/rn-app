import type { SavedAddress } from "@/lib/addresses";
import type { Cart, CartCard, CartLine } from "@/lib/cart";
import type { MyDetailsResponse } from "@/lib/my-details";
import { Image } from "react-native";
import type { DevFixture } from "./registry";

// ENG-429 G2: cart (2089:26744, 26814, 26957) and choose dates (2089:28290, 28473, 28666, 28848). Every write these
// screens make (cart PUT/DELETE, favourites, address, book) is left unlisted, so the interceptor answers it 409. The one
// write-method key listed is `POST …/bookings/quote/`, which prices and writes nothing (backend/bookings.ts).

const photo = (asset: number) => Image.resolveAssetSource(asset).uri;
const SPEAKER = photo(require("@/dev/assets/04-cart-dates/bluetooth-speaker.png"));
const GLASSES = photo(require("@/dev/assets/04-cart-dates/meta-vr-glasses.png"));
const PS5 = photo(require("@/dev/assets/04-cart-dates/ps5-fifa.png"));
const BAG = photo(require("@/dev/assets/04-cart-dates/boxing-bag.png"));

// The renter. Her coordinates put SkyHire's Indiranagar listing 2.5 km away (lib/distance.ts reads the session user as
// the viewer), as 28666 prints it. `firebase_uid` empty keeps chat's Firestore off.
const meera: MyDetailsResponse = {
  username: "meera_rao",
  firebase_uid: "",
  email: "meera.rao@gmail.com",
  first_name: "Meera",
  last_name: "Rao",
  phone: "+91 98450 12345",
  country: "IN",
  image: null,
  addresses: [],
  business_name: null,
  account_type: "user",
  merchant_approval_status: null,
  coordinates: { lat: 13.0009, long: 77.6408 },
  timezone: "Asia/Kolkata",
  email_verified: true,
  phone_verified: true,
  business_verified: false,
  currency: "INR",
  bills_to_business: false,
  billing_as_business: false,
};
const session = { user: meera };

// ---- Cart ------------------------------------------------------------------------------------------------------------

const skyHire = { key: "skyhire_rentals", name: "SkyHire Rentals", locality: "Indiranagar", delivers: true, verified: true };
const partyProps = { key: "party_props", name: "Party Props", locality: "Koramangala", delivers: false, verified: true };

const line = (name: string, title: string, cover: string, rate: string, deposit: string, warning: CartLine["warning"] = null): CartLine => ({
  product: { name, title, cover_image: cover, rate, deposit },
  warning,
  booking: null,
  added_at: "2026-11-20T10:00:00Z",
});
const speakerLine = line("bluetooth-speaker-skyhire", "Bluetooth speaker", SPEAKER, "550.00", "3000.00");
// "Now ₹900 a day (was ₹1,000)": lineNote's computed copy (the frame draws "/day").
const glassesLine = line("meta-vr-glasses-skyhire", "Meta VR Glasses", GLASSES, "900.00", "5000.00", {
  code: "price_changed",
  rate_was: "1000.00",
  deposit_was: "5000.00",
});

const cart = (...cards: CartCard[]): Cart => ({ count: cards.reduce((n, c) => n + c.lines.length, 0), cards });

// 26814's HomeEase booking, accepted and waiting for ₹1,240 by 4:34 pm IST. Only what the rent strip and the cart read.
const RENT_DUE = "2026-11-23T11:04:00Z";
const homeEase = {
  number: "RN-30412",
  stage: "accepted",
  shop: { name: "HomeEase", locality: "HSR Layout" },
  pay_now: null,
  money: { rent_due_at: RENT_DUE, pay_after_accept: "1240.00", deposit_with_rent: false },
};
const bookings = (results: object[]) => ({
  "GET /api/bookings/": { results, counts: { open: results.length, past: 0 }, current_page: 1, total_pages: 1 },
});

const cartFixture = (body: Cart, results: object[] = [], params?: object): DevFixture => ({
  route: "Cart",
  params,
  responses: { "GET /api/cart/": body, ...bookings(results), "GET /api/favorites/": [] },
  session,
});

// ---- Choose dates ----------------------------------------------------------------------------------------------------

const TODAY = "2026-10-22";
const DATES = { first_day: "2026-10-24", last_day: "2026-10-26" };

const shop = {
  name: "SkyHire Rentals",
  locality: "Indiranagar",
  hours: null,
  is_open: true,
  opens_at: null,
  min_notice_hours: 0,
  delivers: true,
  delivery_base_fee: "50.00",
  delivery_per_km: "15.00",
  delivery_max_km: "10",
};

const product = (name: string, title: string, cover: string, rate: string, deposit: string, booked: { start_date: string; end_date: string }[]) => ({
  name,
  title,
  description: "",
  security_deposit: deposit,
  category: { title: "Audio", parent: { title: "Electronics" } },
  moderation_labels: [],
  plans: [{ unit: "day", price: rate, min: 3 }],
  shop,
  live_booking: true,
  can_add_to_cart: true,
  requested: null,
  condition: "excellent",
  rate,
  currency: "INR",
  coordinates: { lat: 12.9784, long: 77.6408 },
  booked,
  images: [cover],
  location: "Indiranagar, Bengaluru",
  cover_image: cover,
  brand_name: "",
  model_name: "",
  usage_description: "",
  contact_name: "",
  owner: {
    username: "skyhire_rentals",
    firebase_uid: "",
    first_name: "SkyHire",
    last_name: "Rentals",
    image: null,
    business_name: "SkyHire Rentals",
    business_verified: true,
  },
});
// 28–30 Oct taken: the frames' three struck days.
const speaker = product("bluetooth-speaker-skyhire", "Bluetooth speaker", SPEAKER, "550.00", "3000.00", [
  { start_date: "2026-10-28", end_date: "2026-10-30" },
]);

const address = (over: Partial<SavedAddress>): SavedAddress => ({
  id: 4101,
  address: "12, 4th Cross, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038",
  address_line_1: "12, 4th Cross",
  address_line_2: "HAL 2nd Stage",
  locality: "Indiranagar",
  address_type: "home",
  label: "",
  coordinates: { lat: 12.9719, long: 77.6412 },
  is_default: true,
  postal_code: "560038",
  ...over,
});

/** One quote body: the interceptor matches method and path, so the pickup and the delivery quote get the same one. */
const quote = (over: { total: string; delivery: object; lines?: object[] }) => ({
  product: "bluetooth-speaker-skyhire",
  ...DATES,
  days: 3,
  delivery_mode: "pickup",
  rate: "550.00",
  rent: "1650.00",
  plan: { unit: "day", price: "550.00", min: 3 },
  min_days: 3,
  fee_shown: "0.00",
  fee_charged: "0.00",
  pay_now: "99.00",
  pay_after_accept: "1551.00",
  rent_pay_minutes: 30,
  deposit: { amount: "3000.00", with_rent: false, due_on: null, refundable: true },
  units_free: 1,
  shop: { is_open: true, opens_at: null, book_for_morning: false, hours_first_day: null },
  id_check: { needed: "none", passed: null },
  terms: null,
  can_book: true,
  blockers: [],
  ...over,
});
const DELIVERY_OK = { status: "ok", fee: "170.00", distance_km: "8", offer_pickup: true };

const dates = (params: object, responses: Record<string, unknown>): DevFixture => ({
  route: "BookingDates",
  params,
  responses: { ...responses, ...bookings([]) },
  session,
});

/** Design fixtures for Figma section 04, cart and choose dates (ENG-429 G2), keyed by frame id (registry.ts). */
export const fixtures: Record<string, DevFixture> = {
  // cart · one shop: one card of two lines, nothing waiting for rent, so Check out is the bar.
  "2089:26744": cartFixture(cart({ shop: skyHire, warning: null, lines: [speakerLine, glassesLine] })),
  // cart · rent due elsewhere, closed shop, one item per booking. `design.now` is 4:12 before the rent is due, so the
  // strip's countdown holds still at "4:12 left" (the frame's sample reads "04:12").
  "2089:26814": cartFixture(
    cart(
      { shop: skyHire, warning: { code: "closed_now", opens_at: "2026-11-24T03:30:00Z" }, lines: [speakerLine] },
      {
        shop: partyProps,
        warning: { code: "one_item_only" },
        lines: [
          line("ps5-fifa-partyprops", "PS5 with FIFA", PS5, "750.00", "10000.00"),
          line("boxing-bag-partyprops", "Boxing Bag", BAG, "250.00", "1500.00"),
        ],
      }
    ),
    [homeEase],
    { design: { now: "2026-11-23T10:59:48Z" } }
  ),
  // cart · empty.
  "2089:26957": cartFixture(cart()),

  // booking-dates · dates picked, delivery: Home quoted at ₹170 / 8 km, Delivery selected (`design.mode`). The pickup
  // line reads the delivery quote's 8 km, not the frame's 2.5 km (choose-dates reads one distance).
  "2089:28290": dates(
    { product: speaker.name, ...DATES, design: { today: TODAY, mode: "owner_delivery" } },
    {
      "GET /api/products/bluetooth-speaker-skyhire/": speaker,
      "GET /api/my/addresses/": [address({})],
      "POST /api/bookings/quote/": quote({ total: "1820.00", delivery: DELIVERY_OK }),
    }
  ),
  // booking-dates · delivery not available: Home in Vesava 400061, an area SkyHire turned off; self pickup stays.
  "2089:28473": dates(
    { product: speaker.name, ...DATES, design: { today: TODAY } },
    {
      "GET /api/products/bluetooth-speaker-skyhire/": speaker,
      "GET /api/my/addresses/": [
        address({
          address: "7, Yari Road, Vesava, Mumbai, Maharashtra 400061",
          address_line_1: "7, Yari Road",
          address_line_2: "",
          locality: "Vesava",
          postal_code: "400061",
          coordinates: { lat: 19.1333, long: 72.8156 },
        }),
      ],
      "POST /api/bookings/quote/": quote({
        total: "1650.00",
        delivery: {
          status: "too_far",
          fee: "0.00",
          distance_km: "2.5",
          offer_pickup: true,
          reason: "area_off",
          area: { pin: "400061", name: "Vesava" },
        },
      }),
    }
  ),
  // booking-dates · no dates yet: signed in, no saved address; 2.5 km from the session user.
  "2089:28666": dates(
    { product: speaker.name, design: { today: TODAY } },
    {
      "GET /api/products/bluetooth-speaker-skyhire/": speaker,
      "GET /api/my/addresses/": [],
    }
  ),
  // booking-dates-card · cart checkout, one item blocked: the VR Glasses are booked 24–30 (and the speaker the 30th), so
  // 27–29 have "Some items free" and the 30th is struck; the quote's line says the glasses aren't free; the Boxing Bag
  // starts left in the cart (`design.left`). The shop head reads the delivery quote's 8 km, not "2.5 km".
  "2089:28848": dates(
    {
      products: ["bluetooth-speaker-skyhire", "meta-vr-glasses-skyhire", "boxing-bag-skyhire"],
      from_cart: true,
      others: { items: 2, shops: ["Party Props"] },
      ...DATES,
      design: { today: TODAY, left: ["boxing-bag-skyhire"] },
    },
    {
      "GET /api/products/bluetooth-speaker-skyhire/": product("bluetooth-speaker-skyhire", "Bluetooth speaker", SPEAKER, "550.00", "3000.00", [
        { start_date: "2026-10-30", end_date: "2026-10-30" },
      ]),
      "GET /api/products/meta-vr-glasses-skyhire/": product("meta-vr-glasses-skyhire", "Meta VR Glasses", GLASSES, "900.00", "5000.00", [
        { start_date: "2026-10-24", end_date: "2026-10-30" },
      ]),
      "GET /api/products/boxing-bag-skyhire/": product("boxing-bag-skyhire", "Boxing Bag", BAG, "250.00", "1500.00", []),
      "GET /api/my/addresses/": [address({})],
      "POST /api/bookings/quote/": quote({
        total: "1650.00",
        delivery: DELIVERY_OK,
        lines: [
          { product: "bluetooth-speaker-skyhire", n: 1, rate: "550.00", rent: "1650.00", deposit: "3000.00", units_free: 1, blockers: [] },
          { product: "meta-vr-glasses-skyhire", n: 1, rate: "900.00", rent: "2700.00", deposit: "5000.00", units_free: 0, blockers: ["no_unit_free"] },
        ],
      }),
    }
  ),
};
