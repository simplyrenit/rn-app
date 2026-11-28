import type { Device } from "@/backend/shop";
import type { MyDetailsResponse } from "@/lib/my-details";
import { istDay, type Hours, type Shop } from "@/lib/shop";
import type { KycStatusResponse } from "@/lib/types";
import type { UnlockState } from "@/lib/unlock";
import type { DevFixture } from "./registry";
import { fixtures as b } from "./12-b";
import { fixtures as c } from "./12-c";

/** Design fixtures for Figma section 12, keyed by frame id (registry.ts). */

// ---- Shared data (plan §1). Step 0's `12-common.ts` did not exist when G1 built this; the integrator lifts these
// into it and points 12-b/12-c at them. Every value is visibly fake. `firebase_uid` is empty so Firestore stays off.

// The approved merchant (2095:26754 …): Profile reads `isMerchant` from `account_type`. A phone, so the bank screen
// does not ask for one.
const mumbaiGearHub: MyDetailsResponse = {
  username: "mumbai_gear_hub",
  firebase_uid: "",
  email: "hello@mumbaigearhub.in",
  first_name: "Mumbai Gear",
  last_name: "Hub",
  phone: "+91 98200 04471",
  country: "IN",
  image: null,
  addresses: [],
  business_name: "Mumbai Gear Hub",
  account_type: "merchant",
  merchant_approval_status: "approved",
  coordinates: { lat: 19.06, long: 72.83 },
  timezone: "Asia/Kolkata",
  email_verified: true,
  phone_verified: true,
  business_verified: false,
  currency: "INR",
  bills_to_business: false,
  billing_as_business: false,
};

/** Not approved (2095:26883): the "Not approved" pill and "Request review again". */
const rejected: MyDetailsResponse = { ...mumbaiGearHub, merchant_approval_status: "rejected" };

/** An individual owner (2095:27019, 2096:26392): not a merchant, so Business billing shows and no dashboard. */
const priyaNair: MyDetailsResponse = {
  ...mumbaiGearHub,
  username: "priya_nair",
  email: "priya.nair@gmail.com",
  first_name: "Priya",
  last_name: "Nair",
  business_name: null,
  account_type: "user",
  merchant_approval_status: null,
};

const kycNone: KycStatusResponse = {
  kyc_status: "none",
  case_ref: null,
  business_verified: false,
  business_verified_at: null,
  reason_code: null,
  next_action: null,
  updated_at: null,
};

// The pencils on Profile reach UnlockSheet, which sends a real Firebase SMS as it opens; answered unlocked it never opens.
const unlocked: UnlockState = {
  unlocked: true,
  unlocked_until: "2099-01-01T00:00:00Z",
  phone_masked: "··· ··· 4471",
  minutes: 30,
};
const UNLOCKED = { "GET /access/unlock/": unlocked };

const TEN_TO_EIGHT = { open: "10:00", close: "20:00" };
const MON_SAT: Hours = {
  mon: TEN_TO_EIGHT,
  tue: TEN_TO_EIGHT,
  wed: TEN_TO_EIGHT,
  thu: TEN_TO_EIGHT,
  fri: TEN_TO_EIGHT,
  sat: TEN_TO_EIGHT,
  sun: null,
};

// The shop 2096:26342 draws: open by its hours, Mon–Sat 10 am – 8 pm, "Up to 5 km · 1 area off · ₹50 + ₹15 a km"
// (Juhu 400049 off), GST registered, the shop address confirmed in Bandra West.
const SHOP: Shop = {
  name: "Mumbai Gear Hub",
  address: "14, Hill Road, Bandra West, Mumbai 400050",
  locality: "Bandra West",
  coordinates: { lat: 19.0544, long: 72.8402 },
  address_confirmed: true,
  hours: MON_SAT,
  closed_until: null,
  min_notice_hours: 3,
  open: { is_open: true, reason: "hours", opens_at: null, closes_at: null },
  delivers: true,
  delivery_base_fee: "50.00",
  delivery_per_km: "15.00",
  delivery_max_km: "5.0",
  excluded_pincodes: ["400049"],
  is_merchant: true,
  can_take_bookings: true,
  gst_registered: true,
  gstin: "27ABCDE1234F1Z5",
};

// ---- Signed-in devices (2096:29570). Times are India time; this phone's is today 9:41 am, computed on load, and the
// past ones print absolutely (`istWhen` names a weekday only ahead).
const device = (id: number, name: string, platform: string, lastSeen: string, thisDevice = false): Device => ({
  id,
  name,
  platform,
  this_device: thisDevice,
  first_seen_at: "2026-10-01T04:30:00Z",
  last_seen_at: lastSeen,
});
const IPHONE = device(1, "iPhone 15", "ios", `${istDay(new Date())}T09:41:00+05:30`, true);
const MACBOOK = device(2, "MacBook Air", "web", "2026-11-20T18:12:00+05:30");
const PIXEL = device(3, "Pixel 7a", "android", "2026-11-18T11:05:00+05:30");
const devices = (...list: Device[]) => ({ "GET /access/devices/": { devices: list } });

// ---- Fixtures ----------------------------------------------------------------------------------------------------

const profile = (user: MyDetailsResponse): DevFixture => ({
  route: "MainTabs",
  params: { screen: "Profile" },
  responses: { ...UNLOCKED, "GET /kyc/merchant/status/": kycNone },
  session: { user },
});

/**
 * Rental settings. Every one passes a `design` seed, even an empty one: under it the ring permission is the
 * fixture's ("unavailable" unless set), so the card's ask-once never raises the OS prompt over a screenshot.
 */
const settings = (
  responses: Record<string, unknown>,
  design: object = {},
  user: MyDetailsResponse = mumbaiGearHub
): DevFixture => ({
  route: "RentalSettings",
  params: { design },
  responses: { ...UNLOCKED, ...responses },
  session: { user },
});

const hours = (shop: Shop, design: object = {}): DevFixture => ({
  route: "RentalHours",
  params: { design },
  responses: { ...UNLOCKED, "GET /shop/": shop },
  session: { user: mumbaiGearHub },
});

export const fixtures: Record<string, DevFixture> = {
  // Groups 2 and 3 (delivery and GST; shop address and bank) own their keys in 12-b.ts and 12-c.ts (plan §1).
  ...b,
  ...c,

  // §2.1 Profile entry: ENG-438's screens, diffed only (differences go to ENG-438).
  "2095:26754": profile(mumbaiGearHub),
  "2095:26883": profile(rejected),
  "2095:27019": profile(priyaNair),

  // §2.2 Rental settings.
  "2096:26342": settings({ "GET /shop/": SHOP, ...devices(IPHONE, MACBOOK) }),
  "2096:26244": settings({ "GET /shop/": SHOP, ...devices(IPHONE, MACBOOK) }, { scrollToEnd: true }),
  "2096:26392": settings(
    {
      "GET /shop/": {
        ...SHOP,
        is_merchant: false,
        hours: {},
        open: { is_open: false, reason: "no_hours", opens_at: null, closes_at: null },
        delivers: false,
        excluded_pincodes: [],
        gst_registered: false,
        gstin: "",
        can_take_bookings: false,
      },
      ...devices(IPHONE),
    },
    {},
    priyaNair
  ),
  // The ring card's `layout="inline"` (ENG-433, Notice Tone=Warning look).
  "2096:26472": settings(
    {
      "GET /shop/": { ...SHOP, open: { is_open: false, reason: "manual", opens_at: null, closes_at: null } },
      ...devices(IPHONE, MACBOOK),
    },
    { ringPermission: "ask" }
  ),
  // 2096:26578 (not an owner, a 403) is a jest render: src/components/shop/__tests__/states.test.tsx.
  // Could not load: the shop read is left out, so the design session answers it 404.
  "2096:26620": settings({}),
  // The picker opens on December with the 24th picked. Date-bound: `minDate` is tomorrow, so after 2026-12-23 move
  // the date. The row behind the scrim reads "24 Dec" where the frame says "Pick a date".
  "2096:26658": settings(
    { "GET /shop/": { ...SHOP, closed_until: "2026-12-24" }, ...devices(IPHONE, MACBOOK) },
    { dayPicker: true }
  ),
  "2096:29485": settings({ "GET /shop/": SHOP, ...devices(IPHONE, MACBOOK) }, { sheet: "notice" }),
  "2096:29570": settings({ "GET /shop/": SHOP, ...devices(IPHONE, MACBOOK, PIXEL) }, { sheet: "devices" }),
  // The devices read is left out (404).
  "2096:29658": settings({ "GET /shop/": SHOP }, { sheet: "devices" }),
  "2096:29735": settings({ "GET /shop/": SHOP, ...devices() }, { sheet: "devices" }),

  // §2.3 Handover hours.
  "2096:29910": hours(SHOP),
  "2096:29799": hours(SHOP, { scrollToEnd: true }),
  // Saturday 9 pm – 8 pm from the server: the form starts from it, so the error shows at once (Save stays disabled).
  "2096:30017": hours({ ...SHOP, hours: { ...MON_SAT, sat: { open: "21:00", close: "20:00" } } }, { scrollToEnd: true }),
  "2096:30129": hours(SHOP, { timeSheet: { day: "mon", edge: "open" } }),
};
