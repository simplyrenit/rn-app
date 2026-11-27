import type { MyDetailsResponse } from "@/lib/my-details";
import type { AreasResponse, Shop } from "@/lib/shop";
import type { DevFixture } from "./registry";

/**
 * Section 12, group 2 (ENG-437): Delivery, All areas and GST. Every value is the frames' or visibly fake.
 *
 * ponytail: the merchant and the shop are local copies of plan §1's shared data; swap them for the `12-common.ts` imports
 * once Step 0 writes that file.
 */

// A merchant (Profile reads `isMerchant` from `account_type`), with a phone so nothing asks for one. `firebase_uid` is
// empty so chat's Firestore listeners stay off in the design session.
const mumbaiGearHub: MyDetailsResponse = {
  username: "mumbai_gear_hub",
  firebase_uid: "",
  email: "hello@mumbaigearhub.in",
  first_name: "Mumbai Gear",
  last_name: "Hub",
  phone: "+91 98765 04471",
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

const day = { open: "10:00", close: "20:00" };

/** The shop 2096:26342 draws: open on its hours, delivers up to 5 km with Juhu off, GST registered. */
const SHOP: Shop = {
  name: "Mumbai Gear Hub",
  address: "14, Hill Road, Bandra West, Mumbai 400050",
  locality: "Bandra West",
  coordinates: { lat: 19.06, long: 72.83 },
  address_confirmed: true,
  hours: { mon: day, tue: day, wed: day, thu: day, fri: day, sat: day, sun: null },
  closed_until: null,
  min_notice_hours: 3,
  open: { is_open: true, reason: "hours", opens_at: null, closes_at: null },
  delivers: true,
  delivery_base_fee: "50",
  delivery_per_km: "15",
  delivery_max_km: "5",
  excluded_pincodes: ["400049"],
  is_merchant: true,
  can_take_bookings: true,
  gst_registered: true,
  gstin: "27ABCDE1234F1Z5",
};

/** Nothing off yet: the delivery drafts (29301, 29393, 29504) turn areas off from here. */
const SHOP_NO_OFF: Shop = { ...SHOP, excluded_pincodes: [] };

/**
 * The 14 areas, nearest first. The first seven are the frames' (2097:29740); the rest only need to be past 5.2 km. All
 * `inside`, because 29504's "every area is off" and "14 off" count the inside ones.
 */
const AREAS: AreasResponse = {
  km: "6",
  areas: (
    [
      ["400050", "Bandra West", "1.2"],
      ["400052", "Khar West", "2.0"],
      ["400051", "Bandra East", "2.4"],
      ["400016", "Mahim", "3.1"],
      ["400054", "Santacruz West", "3.6"],
      ["400049", "Juhu", "4.4"],
      ["400056", "Vile Parle West", "5.2"],
      ["400057", "Vile Parle East", "5.3"],
      ["400070", "Kurla West", "5.4"],
      ["400028", "Dadar West", "5.5"],
      ["400022", "Sion", "5.6"],
      ["400019", "Matunga", "5.7"],
      ["400058", "Andheri West", "5.8"],
      ["400069", "Andheri East", "5.9"],
    ] as const
  ).map(([pin, name, km]) => ({ pin, name, km, inside: true, excluded: false })),
};

const session = { user: mumbaiGearHub };

/** "Farthest trip: ₹140 for the customer": no worked sum, as the frames draw none. */
const delivery = (shop: Shop) => ({
  "GET /shop/": shop,
  "GET /shop/pincodes/": AREAS,
  "GET /shop/delivery-example/": { status: "ok", fee: "140", sum: null },
});

const unsaved = { draft: { maxKm: "6", excluded: ["400049"] }, map: "placeholder" } as const;

export const fixtures: Record<string, DevFixture> = {
  // rental-delivery · delivers, unsaved changes ("Unsaved: up to 6 km, Juhu turned off").
  "2097:29301": { route: "RentalDelivery", params: { design: unsaved }, responses: delivery(SHOP_NO_OFF), session },
  // … (full scroll): the same screen; its lower part is diffed after a scroll.
  "2097:29184": { route: "RentalDelivery", params: { design: unsaved }, responses: delivery(SHOP_NO_OFF), session },
  // rental-delivery · delivery off.
  "2097:29393": {
    route: "RentalDelivery",
    params: { design: { draft: { delivers: false }, map: "placeholder" } },
    responses: delivery(SHOP_NO_OFF),
    session,
  },
  // rental-delivery · no shop address: no pin, so no areas read; no worked example, as the frame draws no "Farthest trip".
  // The seed has no draft, so one an earlier fixture left is cleared.
  "2097:29434": {
    route: "RentalDelivery",
    params: { design: { map: "placeholder" } },
    responses: { "GET /shop/": { ...SHOP, coordinates: null, address_confirmed: false } },
    session,
  },
  // rental-delivery · every area off ("Unsaved: 14 areas turned off"), scrolled as the frame is (content y −786).
  "2097:29504": {
    route: "RentalDelivery",
    params: {
      design: { draft: { excluded: AREAS.areas.map((a) => a.pin) }, scrollY: 786, map: "placeholder" },
    },
    responses: delivery(SHOP_NO_OFF),
    session,
  },
  // rental-delivery · discard changes sheet: 29301 with the Discard sheet up.
  "2097:29629": {
    route: "RentalDelivery",
    params: { design: { ...unsaved, discard: true } },
    responses: delivery(SHOP_NO_OFF),
    session,
  },
  // delivery-areas · list: no draft, so it is built from the shop (6 km, Juhu off).
  "2097:29740": { route: "DeliveryAreas", responses: delivery({ ...SHOP, delivery_max_km: "6" }), session },
  // delivery-areas · could not load: the areas read is left out (404); the title reads the shop's 6 km.
  "2097:29872": { route: "DeliveryAreas", responses: { "GET /shop/": { ...SHOP, delivery_max_km: "6" } }, session },
  // rental-gst · registered (Save disabled: nothing changed).
  "2097:30015": { route: "RentalGst", responses: { "GET /shop/": SHOP }, session },
  // rental-gst · not registered.
  "2097:30055": {
    route: "RentalGst",
    responses: { "GET /shop/": { ...SHOP, gst_registered: false, gstin: "" } },
    session,
  },
  // rental-gst · GSTIN not valid: a short GSTIN typed and the blur error showing (Save enabled: the text changed).
  "2097:30090": {
    route: "RentalGst",
    params: { design: { gstin: "27ABCDE1234", showError: true } },
    responses: { "GET /shop/": SHOP },
    session,
  },
};
