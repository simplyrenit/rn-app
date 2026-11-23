import type { SpecFilterPanel } from "@/backend/search";
import type { SavedAddress } from "@/lib/addresses";
import type { MyDetailsResponse } from "@/lib/my-details";
import type { Category } from "@/lib/types";
import { Image } from "react-native";
import type { DevFixture } from "./registry";

/**
 * Design fixtures for ENG-427 group B (section 03): search results, the filter sheet and the address picker. Every
 * frame opens the same `SearchResults` route; the sheet and tap states (Delivers to me, the sheet's tabs, Change) are
 * reached by tapping from the base fixture, so several frames share one entry (see the keys at the bottom).
 */

const uri = (asset: number) => Image.resolveAssetSource(asset)?.uri ?? "";
const PHOTOS = {
  court: uri(require("../assets/03b/tennis-court.png")),
  racket: uri(require("../assets/03b/wilson-racket.png")),
  turf: uri(require("../assets/03b/equifit-turf.jpg")),
  bag: uri(require("../assets/03b/boxing-bag.jpg")),
};

// The customer the results frames are signed in as. Not drawn; `firebase_uid` empty keeps chat's Firestore off.
const customer: MyDetailsResponse = {
  username: "aarav_mehta",
  firebase_uid: "",
  email: "aarav.mehta@gmail.com",
  first_name: "Aarav",
  last_name: "Mehta",
  phone: "",
  country: "IN",
  image: null,
  addresses: [],
  business_name: null,
  account_type: "user",
  merchant_approval_status: null,
  coordinates: { lat: 19.1364, long: 72.8296 },
  timezone: "Asia/Kolkata",
  email_verified: true,
  phone_verified: true,
  business_verified: false,
  currency: "INR",
  bills_to_business: false,
  billing_as_business: false,
};

// 2089:32313: Home (the default, so the row reads "Delivering to Home · Andheri West"), Work and Parents.
const addresses: SavedAddress[] = [
  {
    id: 4271,
    address: "Flat 302, Sea Breeze CHS, Lokhandwala, Andheri West, Mumbai",
    address_line_1: "Flat 302, Sea Breeze CHS",
    address_line_2: "Lokhandwala",
    locality: "Andheri West, Mumbai",
    address_type: "home",
    label: "",
    coordinates: { lat: 19.1364, long: 72.8296 },
    is_default: true,
    postal_code: "400053",
  },
  {
    id: 4272,
    address: "WeWork Vijay Diamond, Andheri East, Mumbai",
    address_line_1: "WeWork Vijay Diamond",
    address_line_2: "",
    locality: "Andheri East, Mumbai",
    address_type: "work",
    label: "",
    coordinates: { lat: 19.1197, long: 72.8697 },
    is_default: false,
    postal_code: "400093",
  },
  {
    id: 4273,
    address: "Hill Road, Bandra West, Mumbai",
    address_line_1: "Hill Road",
    address_line_2: "",
    locality: "Bandra West, Mumbai",
    address_type: "other",
    label: "Parents",
    coordinates: { lat: 19.0544, long: 72.8296 },
    is_default: false,
    postal_code: "400050",
  },
];

// Fitness & Sports and the sub-categories the rail (2089:32064) and the Category tab (2089:34929) draw, in order.
const SUBCATEGORIES = ["Tennis", "Badminton", "Cricket", "Football", "Gym", "Cycle", "Boxing & martial arts"];
const categories: Category[] = [
  {
    id: 9007,
    slug: "fitness-sports",
    homepage_order_id: 0,
    dark_icon: null,
    light_icon: null,
    main_icon: "",
    order_id: 8,
    title: "Fitness & Sports",
    subcategories: SUBCATEGORIES.map((title, index) => ({
      id: 9700 + index,
      slug: title.toLowerCase().replace(/[^a-z]+/g, "-"),
      dark_icon: null,
      light_icon: null,
      main_icon: "",
      order_id: index + 1,
      title,
    })),
  },
];

/** The Specs tab for Tennis (2089:34679): three default specs, and six more behind "All specifications (6)". */
const tennisSpecs: SpecFilterPanel = {
  subcategory: { id: 9700, slug: "tennis", title: "Tennis", parent: "Fitness & Sports" },
  total: 3,
  filters: [
    { key: "brand", label: "Brand", type: "enum", facet: "default", options: [
      { value: "Wilson", count: 4 }, { value: "Babolat", count: 3 }, { value: "Yonex", count: 2 }, { value: "Head", count: 1 },
    ] },
    { key: "grip_size", label: "Grip size", type: "enum", facet: "default", options: [
      { value: "G2", count: 3 }, { value: "G3", count: 5 }, { value: "G4", count: 2 },
    ] },
    { key: "weight", label: "Weight", type: "enum", facet: "default", options: [
      { value: "Under 280 g", count: 2 }, { value: "280–300 g", count: 6 }, { value: "Over 300 g", count: 2 },
    ] },
    ...["Head size", "String pattern", "Balance", "Length", "Material", "Colour"].map((label) => ({
      key: label.toLowerCase().replace(/ /g, "_"),
      label,
      type: "enum" as const,
      facet: "expanded" as const,
      options: [{ value: "Any", count: 3 }],
    })),
  ],
};

type Delivery = { to_me: boolean; fee: string | null; km: string | null } | null;

/** A results card: what the kit Listing card reads (title, day price, photo, where, delivery, Verified). */
function product(
  name: string,
  title: string,
  rate: string,
  cover_image: string,
  owner: string,
  options: { delivery?: Delivery; location?: string; lat?: number; long?: number; verified?: boolean } = {}
) {
  return {
    name,
    title,
    description: "",
    security_deposit: "0",
    category: { title: "Tennis", parent: { title: "Fitness & Sports", slug: "fitness-sports" }, slug: "tennis" },
    moderation_labels: [],
    condition: "excellent",
    rate,
    rate_unit: "day",
    currency: "INR",
    coordinates: { lat: options.lat ?? 19.1364, long: options.long ?? 72.8296 },
    images: [cover_image],
    cover_image,
    location: options.location ?? "Andheri West, Mumbai",
    brand_name: "",
    model_name: "",
    usage_description: "",
    owner: { username: owner, business_verified: options.verified ?? false },
    delivery: options.delivery ?? null,
  };
}

const pickup = (km: string): Delivery => ({ to_me: false, fee: null, km });

// 2089:31917: one shop delivers (Wilson, ₹110), two are self pickup; so 2089:32001 is the same list with the chip on.
const results = [
  product("design-pdp-tennis-court", "PDP Tennis Court", "600", PHOTOS.court, "pdp_sports", { delivery: pickup("0.9") }),
  product("design-wilson-pro-staff-97", "Wilson Pro Staff 97 tennis racket", "190", PHOTOS.racket, "racket_room", {
    delivery: { to_me: true, fee: "110.00", km: "1.2" },
    verified: true,
  }),
  product("design-equifit-turf", "Equifit Turf", "6500", PHOTOS.turf, "equifit", { delivery: pickup("2.4") }),
];

// 2089:32240: the same three, none delivering, from three shops, the closest 0.9 km away.
const nobodyDelivers = results.map((p) => ({ ...p, delivery: pickup(p.delivery?.km ?? "0.9") }));

// 2089:32064, signed out, no address: each card's own "{distance} away · {locality}" line, so no `delivery` and no
// `shop.delivers`. Placed due north of the pinned simulator location (18.9548, 72.8054; ENG-427 plan, precondition
// 5) by 0.009° of latitude a kilometre.
const PIN = { lat: 18.9548, long: 72.8054 };
const north = (km: number) => ({ lat: PIN.lat + km * 0.009, long: PIN.long });
const browse = [
  product("design-pdp-tennis-court", "PDP Tennis Court", "600", PHOTOS.court, "pdp_sports", { location: "Malabar Hill, Mumbai", ...north(1.2) }),
  product("design-equifit-turf", "Equifit Turf", "6500", PHOTOS.turf, "equifit", { location: "BKC, Mumbai", ...north(2.4) }),
  product("design-wilson-pro-staff-97", "Wilson Pro Staff 97 tennis racket", "190", PHOTOS.racket, "racket_room", {
    location: "Matunga, Mumbai",
    ...north(3.1),
  }),
  product("design-boxing-bag", "Boxing Bag", "250", PHOTOS.bag, "punch_house", { location: "Powai, Mumbai", ...north(4.8) }),
];

// Nov 28 – Nov 30 2026 at local midnight, as `confirmDates` sends a range, so the header reads "Nov 28 - Nov 30" in
// any timezone.
const base = {
  selectedItem: "Tennis",
  range: { startDate: new Date(2026, 10, 28).toISOString(), endDate: new Date(2026, 10, 30).toISOString() },
  address: "Andheri West, Mumbai",
  coords: { lat: 19.1364, lng: 72.8296 },
  products: [],
};

const signedIn = (responses: Record<string, unknown>, params: object = base): DevFixture => ({
  route: "SearchResults",
  params,
  responses: {
    "GET /category/": categories,
    "GET /my/addresses/": addresses,
    "GET /favorites/": [],
    "GET /search/filters/": tennisSpecs,
    ...responses,
  },
  session: { user: customer },
});

const resultsFixture = signedIn({ "GET /search/": results });
// The sheet frames: browsing Tennis under Fitness & Sports by its title (`selectedCategoryData` matches titles), so the
// Category tab opens on the sub-category list and the Specs tab has Tennis's panel.
const sheetFixture = signedIn({ "GET /search/": results }, { ...base, category: "Fitness & Sports", subCategory: "Tennis" });

export const fixtures: Record<string, DevFixture> = {
  "2089:31917": resultsFixture,
  // Tap "Delivers to me".
  "2089:32001": resultsFixture,
  // Signed out (no session): every read the screen makes is listed, so nothing live reaches the grid. An empty spec
  // panel, not QA's, so no quick chips join the Filters bar (it is an object: an empty array would break the sheet).
  "2089:32064": {
    route: "SearchResults",
    params: { selectedItem: "Fitness & Sports", category: "fitness-sports", range: {}, address: "", coords: {}, products: [] },
    responses: {
      "GET /search/": browse,
      "GET /category/": categories,
      "GET /search/filters/": { subcategory: null, total: 0, filters: [] },
      "GET /favorites/": [],
      // The Home tab under the stack reads its rails; listed empty so they don't reach QA (Metro log, 2026-11-23).
      "GET /top-experiences/": { results: [] },
      "GET /top-rated-experiences/": { results: [] },
      "GET /popular-products-in-area/": { results: [] },
    },
  },
  // Tap Filters → Condition → Excellent → Show results.
  "2089:32165": signedIn({ "GET /search/": [] }, { ...base, selectedItem: "Tennis ball machine" }),
  // Tap "Delivers to me".
  "2089:32240": signedIn({ "GET /search/": nobodyDelivers }),
  // Tap "Change".
  "2089:32313": resultsFixture,
  // Tap Filters, then the frame's tab (Sort → Nearest first, Specs → Wilson as drawn).
  "2089:34679": sheetFixture,
  "2089:34809": sheetFixture,
  "2089:34929": sheetFixture,
  "2089:35060": sheetFixture,
  "2089:35166": sheetFixture,
  "2089:35291": sheetFixture,
  "2089:35398": sheetFixture,
};
