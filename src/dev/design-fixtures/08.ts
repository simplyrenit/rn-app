import type { ComingBack, GoingOut, Block, TodayFeed } from "@/lib/shop-today";
import type { LiveAnswer, Ring } from "@/lib/shop-ring";
import type { MyDetailsResponse } from "@/lib/my-details";
import type { OpenState, Shop } from "@/lib/shop";
import type { BookingShop, ShopCancelWarning, ShopCounts, ShopTab } from "@/lib/shop-booking";
import type { ShopLine } from "@/lib/shop-lines";
import type { ShopDesign } from "@/screens/shop/home";
import { Image } from "react-native";
import type { DevFixture } from "./registry";

/**
 * Design fixtures for Figma section 08 (ENG-433), keyed by frame id (registry.ts), plus the two shop-home frames of
 * section 01 (2083:16603, 2083:16747). Every frame is signed in as the merchant `mumbaiGearHub` (a design session), so
 * every write gets a 409 and nothing reaches QA. Sheets and modals open with the one UI-only tap the plan names per frame.
 */

// ---- Group C: the shop's booking and its sheets (2093:*, 2095:26567, 2094:24377–24597) -------------------------------

// `momentLabel` drops the day of an entry on the server's today ("9:41 am"), and the frames write every entry with its
// day ("Sun 22 Nov, 9:41 am"), "on Tue 24 Nov" in the call note too. So the booking reads answer on a day no frame line
// falls on: Wed 25 Nov.
const SERVER_TIME = "2026-11-25T09:41:00+05:30";

const at = (day: string, time: string) => `2026-11-${day}T${time}:00+05:30`;

const sony = { name: "sony-a7-iv", title: "Sony A7 IV mirrorless camera", shop_code: "SNY-A7", cover_image: null, quantity: 1 };

const aarav: BookingShop["customer"] = {
  first_name: "Aarav",
  last_initial: "M",
  full_name: null,
  id_checked: true,
  rentals_completed: 3,
  area: "Andheri East",
  distance_km: "3.2",
  address: null,
};

const money = (deposit_state: string): BookingShop["money"] => ({
  rate: "1200",
  rent: "3600",
  delivery_fee: "0",
  fee_shown: "180",
  fee_charged: "180",
  you_earn: "3420",
  deposit: "15000",
  deposit_state,
  deposit_ask_at: at("23", "10:00"),
  deposit_due_at: null,
  rent_pay_minutes: null,
  rent_due_at: null,
  payout: {
    status: "none",
    status_reason: null,
    text: "Paid to your bank on the day of handover",
    amount: "3420",
    due_at: null,
    paid_at: null,
    more: 0,
  },
});

const day: BookingShop["day"] = {
  call_number: null,
  call_from: at("24", "09:00"),
  my_status: "",
  their_status: "",
  no_show_from: null,
  handover_code: null,
  return_code: null,
};

const noCaptures: BookingShop["captures"] = {
  handover: { mine: false, theirs: false },
  return: { mine: false, theirs: false },
};

const answered: BookingShop["answered"] = {
  at: at("22", "09:43"),
  via: "phone",
  device_name: null,
  seconds: 120,
  this_device: true,
  session_id: null,
};

const entry = (event: string, label: string, when: string): BookingShop["timeline"][number] => ({
  event,
  label,
  at: when,
  by: "system",
});

const booked = entry("create", "Booked", at("22", "09:41"));
const accepted = entry("accept", "Accepted", at("22", "09:43"));
const rentPaid = entry("rent_paid", "Rent paid", at("22", "09:52"));
// `shopTimeline` writes the picked window for this event: "Tue 24 Nov, 10:00 – 11:00 am".
const windowPicked = entry("set_window", "Arrival window picked", at("22", "10:05"));
const depositPaid = entry("deposit_paid", "Deposit paid", at("23", "18:10"));
const handedOver = entry("handover", "Handed over", at("24", "10:42"));

const base: BookingShop = {
  bill_to: null,
  number: "RN-24831",
  stage: "confirmed",
  ring_state: "",
  exit: "",
  exit_reason: "",
  is_open: true,
  product: sony,
  customer: aarav,
  first_day: "2026-11-24",
  last_day: "2026-11-26",
  days: 3,
  delivery_mode: "pickup",
  units: { in_use: 0, quantity: 1 },
  money: money("not_due"),
  answered,
  window: { start: at("24", "10:00"), end: at("24", "11:00") },
  window_request: null,
  return_by: at("26", "20:00"),
  day,
  captures: noCaptures,
  can: ["request_window_change", "cancel", "get_help"],
  timeline: [booked, accepted, rentPaid, windowPicked],
  created_at: at("22", "09:41"),
  server_time: SERVER_TIME,
};

// 2093:21585: ringing, not answered; no action rows in the frame.
const ringing: BookingShop = {
  ...base,
  number: "RN-24852",
  stage: "ringing",
  answered: null,
  window: null,
  can: [],
  timeline: [booked],
};

// 2093:21659: confirmed, Aarav asked for Tue 24 Nov, 12:00 – 1:00 pm.
const asked: BookingShop = {
  ...base,
  window_request: { by: "customer", start: at("24", "12:00"), end: at("24", "13:00"), asked_at: at("23", "11:00") },
  can: ["request_window_change", "cancel", "get_help", "answer_window_change"],
};

// 2093:21769: ready, the deposit paid.
const ready: BookingShop = {
  ...base,
  stage: "ready",
  money: money("paid"),
  timeline: [booked, accepted, rentPaid, windowPicked, depositPaid],
};

// 2095:26567: out. The handover record is on the server from both sides, so no record card is drawn.
const out: BookingShop = {
  ...ready,
  stage: "out",
  day: { ...day, call_from: null },
  captures: { ...noCaptures, handover: { mine: true, theirs: true } },
  handover_at: at("24", "10:42"),
  can: ["get_help"],
  timeline: [...ready.timeline, handedOver],
};

// 2093:21944: cancelled by the shop on Sat 21 Nov.
const cancelled: BookingShop = {
  ...base,
  number: "RN-24817",
  stage: "confirmed",
  exit: "cancelled_by_owner",
  exit_reason: "owner",
  is_open: false,
  answered: { ...answered, at: "2026-11-20T16:15:00+05:30" },
  window: null,
  can: [],
  timeline: [
    entry("create", "Booked", "2026-11-20T16:12:00+05:30"),
    entry("accept", "Accepted", "2026-11-20T16:15:00+05:30"),
    entry("rent_paid", "Rent paid", "2026-11-20T16:31:00+05:30"),
    entry("cancel", "Cancelled", "2026-11-21T11:02:00+05:30"),
  ],
};

const line = (id: number, n: number, ref: string, title: string, rent: string): ShopLine => ({
  id,
  n,
  ref,
  product: { name: null, title, cover_image: null },
  rent,
  deposit: "5000",
  state: "live",
});

// 2094:24597: a basket of three; the sheet names each by its shop code.
const basket: BookingShop = {
  ...asked,
  window_request: null,
  can: ["request_window_change", "cancel", "get_help"],
  lines: [
    line(1, 1, "SNY-A7", "Sony A7 IV mirrorless camera", "3600"),
    line(2, 2, "SIG-2470", "Sigma 24-70 mm f/2.8 lens", "1500"),
    line(3, 3, "MFT-190", "Manfrotto tripod", "600"),
  ],
};

const warning: ShopCancelWarning = {
  refund_to_customer: "3699",
  deposit_back: "0",
  marks_last_30_days: 0,
  will_pause_listings: false,
  text: ["The customer gets everything back, the ₹99 included.", "This is marked on your record."],
};

// The Get help row's sub-line (`parseHelp`).
const help = {
  desk: { open: "08:00", close: "00:00", is_open_now: true, text: "Every day, 8 am to midnight" },
  requests: [],
};

const shopBooking = (b: BookingShop, extra: Record<string, unknown> = {}) => ({
  [`GET /shop/bookings/${b.number}/`]: b,
  "GET /help/": help,
  ...extra,
});

const windows = (list: { start: string; end: string }[]) => ({
  [`GET /bookings/RN-24831/windows/`]: { day: "2026-11-24", windows: list },
});

const bookingFixtures = (user: MyDetailsResponse): Record<string, DevFixture> => {
  const open = (b: BookingShop, extra?: Record<string, unknown>): DevFixture => ({
    route: "ShopBooking",
    params: { number: b.number },
    responses: shopBooking(b, extra),
    session: { user },
  });
  return {
    "2093:21585": open(ringing),
    "2093:21659": open(asked),
    "2093:21769": open(ready),
    "2093:21944": open(cancelled),
    "2095:26567": open(out),
    // The sheets open from the booking with a tap (plan: F+tap): scroll, "Ask to change the time", then the
    // "12:00 – 1:00 pm" radio (local). Never Ask.
    "2094:24377": open(
      asked,
      windows([
        { start: at("24", "11:00"), end: at("24", "12:00") },
        { start: at("24", "12:00"), end: at("24", "13:00") },
        { start: at("24", "13:00"), end: at("24", "14:00") },
        { start: at("24", "16:00"), end: at("24", "17:00") },
      ])
    ),
    "2094:24457": open(asked, windows([])),
    // Scroll, tap "Cancel booking" (the GET only reads the warning). Never the red button.
    "2094:24524": open(asked, { "GET /shop/bookings/RN-24831/cancel/": { warning } }),
    // As above, then the Manfrotto radio (local).
    "2094:24597": open(basket, { "GET /shop/bookings/RN-24831/cancel/": { warning } }),
  };
};

// ---- Group A: the shop's Today and Bookings (2083:16603, 2083:16747, 2091:*, 2094:21684–22168) -----------------------

/** The merchant every 08 frame is signed in as (13.ts's shape). `firebase_uid` empty: chat's Firestore stays off. */
const mumbaiGearHub: MyDetailsResponse = {
  username: "mumbai_gear_hub",
  firebase_uid: "",
  email: "hello@mumbaigearhub.in",
  first_name: "Mumbai Gear",
  last_name: "Hub",
  phone: "+91 98200 12345",
  country: "IN",
  image: null,
  addresses: [],
  business_name: "Mumbai Gear Hub",
  account_type: "merchant",
  merchant_approval_status: "approved",
  coordinates: { lat: 19.1136, long: 72.8697 },
  timezone: "Asia/Kolkata",
  email_verified: true,
  phone_verified: true,
  business_verified: true,
  currency: "INR",
  bills_to_business: false,
  billing_as_business: false,
};

// The design date (plan): Sun 22 Nov 2026. Today's rows follow the feed's `date`; the bookings list and the ring read
// `server_time`; the quick block reads `design.today`.
const TODAY = "2026-11-22";
const TODAY_TIME = at("22", "09:41");

const openNow: OpenState = { is_open: true, reason: "hours", opens_at: null, closes_at: at("22", "20:00") };

const shop = (open: OpenState): Shop => ({
  name: "Mumbai Gear Hub",
  address: "Shop 4, Marol Naka, Andheri East, Mumbai 400059",
  locality: "Andheri East",
  coordinates: { lat: 19.1136, long: 72.8697 },
  address_confirmed: true,
  hours: { mon: { open: "10:00", close: "20:00" }, tue: { open: "10:00", close: "20:00" }, sun: { open: "10:00", close: "20:00" } },
  closed_until: null,
  min_notice_hours: 2,
  open,
  delivers: true,
  delivery_base_fee: "50",
  delivery_per_km: "20",
  delivery_max_km: "10",
  excluded_pincodes: [],
  is_merchant: true,
  can_take_bookings: true,
});

const feed = (over: Partial<TodayFeed>): TodayFeed => ({
  date: TODAY,
  open: openNow,
  ringing: [],
  waiting_to_ring: [],
  going_out: [],
  coming_back: [],
  needs_you: [],
  ...over,
});

const block = (over: Partial<Block> & Pick<Block, "id" | "product">): Block => ({
  quantity: 1,
  first_day: TODAY,
  last_day: "2026-11-24",
  reason: "walk_in",
  source: "quick",
  returned_at: null,
  waiting_back: false,
  created_at: at("22", "09:10"),
  ...over,
});

const guitar = block({ id: 31, product: { name: "electric-guitar", title: "Electric guitar", shop_code: "GTR-01" } });
// "Is it back?": a walk-in that ended today and nobody has marked returned (2091:20977). Not a "Blocked now" row.
const tripod = block({
  id: 32,
  product: { name: "tripod", title: "Tripod", shop_code: "TRP-01" },
  first_day: "2026-11-20",
  last_day: TODAY,
  waiting_back: true,
});

const goingOut: GoingOut[] = [
  {
    number: "RN-24840",
    product_title: "DJI Mini 4 Pro",
    customer_first_name: "Kabir",
    customer_last_initial: "A",
    delivery_mode: "pickup",
    stage: "ready",
    window: { start: at("22", "10:00"), end: at("22", "11:00") },
    deposit_state: "paid",
  },
  {
    number: "RN-24842",
    product_title: "Epson projector",
    customer_first_name: "Rohan",
    customer_last_initial: "S",
    delivery_mode: "owner_delivery",
    stage: "ready",
    window: { start: at("22", "14:00"), end: at("22", "15:00") },
    deposit_state: "due",
  },
];

const comingBack: ComingBack[] = [
  {
    number: "RN-24790",
    product_title: "Treadmill",
    customer_first_name: "Isha",
    customer_last_initial: "T",
    stage: "out",
    return_by: at("21", "20:00"),
    late_days: 1,
    deposit_state: "paid",
  },
  {
    number: "RN-24801",
    product_title: "JBL party speaker",
    customer_first_name: "Neha",
    customer_last_initial: "K",
    stage: "out",
    return_by: at("22", "20:00"),
    late_days: 0,
    deposit_state: "paid",
  },
];

/** The request ringing in 2091:20977 and on the ring screen (2092:21207): one item, so the card has its own Accept. */
const sonyRing: Ring = {
  number: "RN-24852",
  product: { name: "sony-a7-iv", title: "Sony A7 IV mirrorless camera", cover_image: null },
  first_day: "2026-11-24",
  last_day: "2026-11-26",
  days: 3,
  delivery_mode: "pickup",
  customer: {
    first_name: "Aarav",
    last_initial: "M",
    id_checked: true,
    rentals_completed: 3,
    area: "Andheri East",
    distance_km: "3.2",
  },
  units: { in_use: 2, quantity: 3 },
  you_earn: "3420",
  fee_shown: "270",
  fee_charged: "180",
  ring_state: "ringing",
  ring_at: at("22", "09:41"),
  ring_ends_at: at("22", "09:51"),
};

// The picker's items (2094:21970), listed by title as `filterPicker` sorts them; the frame's order is not alphabetical
// (recorded fail-heatmap, plan). Treadmill has no shop code, so its line is "1 in stock".
const pickerItem = (name: string, title: string, shop_code: string, quantity: number) => ({
  name,
  title,
  shop_code,
  quantity,
  status: "live",
});
const myProducts = {
  results: [
    pickerItem("canon-eos-r6-mark-ii", "Canon EOS R6 Mark II", "CAN-R6", 3),
    pickerItem("electric-guitar", "Electric guitar", "GTR-01", 1),
    pickerItem("epson-projector", "Epson projector", "EPS-02", 2),
    pickerItem("jbl-party-speaker", "JBL party speaker", "JBL-01", 4),
    pickerItem("manfrotto-tripod", "Manfrotto tripod", "MFT-190", 1),
    pickerItem("sony-a7-iv", "Sony A7 IV mirrorless camera", "SNY-A7", 3),
    pickerItem("treadmill", "Treadmill", "", 1),
  ],
  total_pages: 1,
};

/** The Rentals tab on Today (or Bookings), as the merchant. `design` is always passed: no system prompt (plan rule 4). */
const shopHome = (design: ShopDesign, responses: Record<string, unknown>): DevFixture => ({
  route: "MainTabs",
  params: { screen: "Rentals", params: { design } },
  responses,
  session: { user: mumbaiGearHub },
});

const today = (design: ShopDesign, todayFeed: TodayFeed | null, extra: Record<string, unknown> = {}) =>
  shopHome(design, {
    ...(todayFeed ? { "GET /shop/today/": todayFeed } : {}),
    "GET /shop/": shop(todayFeed?.open ?? openNow),
    "GET /shop/blocks/": { results: [] },
    ...extra,
  });

// 2083:16603 and the counter sheets over it (21684, 21828, 21970, 22017, 22055): one fixture, opened by taps (plan).
const busy = today(
  { ringPermission: "ask", today: TODAY },
  feed({
    going_out: goingOut,
    coming_back: comingBack,
    needs_you: [
      { kind: "late_no_unit", text: "Treadmill is late: tomorrow's booking for Meera has no unit", booking: "RN-24790" },
      { kind: "drafts_need_photos", text: "42 drafts need photos", count: 42 },
    ],
  }),
  {
    "GET /shop/blocks/": { results: [guitar] },
    "GET /my/products/": myProducts,
    "GET /shop/blocks/free/": { free: 2, quantity: 3 },
  }
);

// 2091:20977 and the Extend modal over it (2094:22168).
const ringingNow = today(
  {},
  feed({
    ringing: [sonyRing],
    waiting_to_ring: [{ ring_at: at("23", "09:00"), count: 2, bookings: [] }],
    needs_you: [{ kind: "block_back", text: "Is it back? Tripod, walk-in block ended today", block: tripod }],
  })
);

const closedBy = (reason: string): OpenState => ({ is_open: false, reason, opens_at: at("23", "10:00"), closes_at: null });

// The Bookings tab's cards (2083:16747, 2091:21515): the server's clock on the design date, so "Collects today".
// Jest resolves no asset source (null there); on a device each is the bundled file's URI.
const asset = (source: number): string | null => Image.resolveAssetSource(source)?.uri ?? null;
const thumb = {
  dji: asset(require("../assets/shop-thumb-dji-mini-4-pro.png")),
  coffee: asset(require("../assets/shop-thumb-coffee-machine.png")),
  jcb: asset(require("../assets/shop-thumb-jcb-backhoe.png")),
};
const listed = (over: Partial<BookingShop>): BookingShop => ({ ...base, stage: "ready", server_time: TODAY_TIME, ...over });
const person = (first_name: string, last_initial: string, distance_km: string | null = null) => ({
  ...aarav,
  first_name,
  last_initial,
  distance_km,
});
const earning = (you_earn: string) => ({ ...money("paid"), you_earn });
const dji = listed({
  number: "RN-24840",
  product: { name: "dji-mini-4-pro", title: "DJI Mini 4 Pro", shop_code: "DJI-M4", cover_image: thumb.dji, quantity: 1 },
  customer: person("Kabir", "A"),
  first_day: "2026-11-22",
  last_day: "2026-11-24",
  window: { start: at("22", "10:00"), end: at("22", "11:00") },
  money: earning("3600"),
});
const coffee = listed({
  number: "RN-24842",
  product: { name: "coffee-machine", title: "Coffee machine", shop_code: "COF-01", cover_image: thumb.coffee, quantity: 1 },
  customer: person("Rohan", "S", "2.8"),
  delivery_mode: "owner_delivery",
  first_day: "2026-11-23",
  last_day: "2026-11-25",
  window: { start: at("23", "14:00"), end: at("23", "15:00") },
  money: earning("1830"),
});
// Renit's courier carries it: the card's next step is the pack-by time, before the seal.
const jcb = listed({
  number: "RN-24845",
  product: { name: "jcb-3dx", title: "JCB 3DX backhoe loader", shop_code: "JCB-3DX", cover_image: thumb.jcb, quantity: 1 },
  customer: person("Meera", "J"),
  delivery_mode: "owner_delivery",
  delivered_by: "renit",
  courier: {
    state: null,
    steps: [],
    banner: null,
    seal: null,
    rider: null,
    pack_by: at("24", "09:15"),
    return: { state: "", window: null, earliest: "", seal: null },
    attempt: 1,
    not_delivered_reason: null,
  },
  window: { start: at("24", "11:00"), end: at("24", "12:00") },
  money: earning("21600"),
});

const counts: ShopCounts = { ringing: 0, accepted: 1, confirmed: 6, ready: 3, out: 9, returned: 2, closed: 24, ended: 5 };
const page = (results: BookingShop[]) => ({ results, current_page: 1, total_pages: 1, total_results: results.length });
// The suffix match ignores `?stage=`: the page served is the opened tab's.
const bookings = (tab: ShopTab, results: BookingShop[]) =>
  shopHome({ segment: "bookings", tab }, { "GET /shop/bookings/counts/": counts, "GET /shop/bookings/": page(results) });
const ended = (b: BookingShop, exit: BookingShop["exit"]): BookingShop => ({ ...b, exit, is_open: false, money: earning("0") });

const shopHomeFixtures: Record<string, DevFixture> = {
  "2083:16603": busy,
  "2094:21684": busy,
  "2094:21828": busy,
  "2094:21970": busy,
  "2094:22017": busy,
  "2094:22055": busy,
  "2091:20870": today({ ringPermission: "settings" }, feed({})),
  "2091:20977": ringingNow,
  "2094:22168": ringingNow,
  "2091:21106": today({}, feed({ open: closedBy("missed_requests") })),
  "2091:21216": today({}, feed({ open: closedBy("manual"), going_out: goingOut })),
  // No `GET /shop/today/`: the session 404s it, so Today shows its load error.
  "2091:21412": today({}, null),
  "2083:16747": bookings("ready", [dji, coffee, jcb]),
  "2091:21515": bookings("ended", [ended(dji, "refused"), ended(coffee, "cancelled_by_owner"), ended(jcb, "no_answer")]),
  "2091:21610": bookings("ringing", []),
};

// ---- Group B: the ring screen and its sheets (2092:*, 2094:24052–24240) ------------------------------------------
// Rebuilt from builder B's handoff and the plan's Group B rows: B's own fixture file did not survive the pause.

const live = (ringing: Ring[]): LiveAnswer => ({
  server_time: at("22", "09:43"),
  poll_after_ms: 3000,
  open: openNow,
  ringing,
  waiting_to_ring: [],
  recent: [],
  needs_you_count: 0,
});

/** The second request, for "1 more request is waiting" (2092:21207). */
const canonRing: Ring = {
  ...sonyRing,
  number: "RN-24853",
  product: { name: "canon-eos-r6-mark-ii", title: "Canon EOS R6 Mark II", cover_image: null },
  ring_at: at("22", "09:42"),
  ring_ends_at: at("22", "09:52"),
};

const basketLine = (id: number, ref: string, title: string, owner_earns: string, deposit: string, in_use: number, quantity: number): ShopLine => ({
  id,
  n: id,
  ref,
  product: { name: null, title, cover_image: null },
  rent: owner_earns,
  deposit,
  owner_earns,
  units: { in_use, quantity },
  state: "live",
});

// 2092:21288: three items for delivery. `ringMoney` takes the delivery as `you_earn` less every live item's earnings, so
// `you_earn` is all three items plus ₹150 (2,700 + 1,080 + 360 + 150 = 4,290); with Manfrotto unticked it reads ₹3,930.
const basketRing: Ring = {
  ...sonyRing,
  number: "RN-24860",
  product: { name: "sony-a7-iv", title: "Sony A7 IV + 2 more", cover_image: null },
  delivery_mode: "owner_delivery",
  you_earn: "4290",
  ring_ends_at: at("22", "10:40"),
  lines: [
    basketLine(1, "SNY-A7", "Sony A7 IV mirrorless camera", "2700", "15000", 2, 3),
    basketLine(2, "SIG-2470", "Sigma 24-70 mm f/2.8 lens", "1080", "8000", 0, 2),
    basketLine(3, "MFT-190", "Manfrotto tripod", "360", "2000", 0, 1),
  ],
};

// 2092:21395 / 21444: no longer ringing, so the screen reads the booking. Its clock is the design date, so the pay-by
// time is said without a day ("11:10 am").
const answeredBooking = (over: Partial<BookingShop>): BookingShop => ({
  ...base,
  number: "RN-24852",
  server_time: at("22", "09:44"),
  window: null,
  timeline: [booked],
  ...over,
});

const ringScreen = (params: { number: string; ring?: Ring }, responses: Record<string, unknown>): DevFixture => ({
  route: "ShopRing",
  params,
  responses,
  session: { user: mumbaiGearHub },
});

const ringingOne = ringScreen({ number: sonyRing.number, ring: sonyRing }, { "GET /shop/live/": live([sonyRing, canonRing]) });
const ringingBasket = ringScreen({ number: basketRing.number, ring: basketRing }, { "GET /shop/live/": live([basketRing]) });

const ringFixtures: Record<string, DevFixture> = {
  "2092:21207": ringingOne,
  // Tap "Can't do it" (opens the sheet only); 24156 then taps "Other" (a radio). Never the sheet's footer.
  "2094:24052": ringingOne,
  "2094:24156": ringingOne,
  // Tap Manfrotto's tick (opens the untick sheet); 21288 then picks "Rented outside Renit" and "Untick this item"
  // (local state). Never Accept 2 of 3 / Can't do any.
  "2092:21288": ringingBasket,
  "2094:24240": ringingBasket,
  "2092:21395": ringScreen(
    { number: "RN-24852" },
    {
      "GET /shop/live/": live([]),
      "GET /shop/bookings/RN-24852/": answeredBooking({
        stage: "accepted",
        answered: { ...answered, at: at("22", "09:43"), this_device: true },
        money: { ...money("not_due"), rent_due_at: at("22", "11:10") },
      }),
    }
  ),
  "2092:21444": ringScreen(
    { number: "RN-24852" },
    {
      "GET /shop/live/": live([]),
      "GET /shop/bookings/RN-24852/": answeredBooking({ stage: "ringing", exit: "no_answer", is_open: false, answered: null, can: [] }),
    }
  ),
};

export const fixtures: Record<string, DevFixture> = {
  ...shopHomeFixtures,
  ...ringFixtures,
  ...bookingFixtures(mumbaiGearHub),
};
