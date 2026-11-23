import type { SavedAddress } from "@/lib/addresses";
import type { MyDetailsResponse } from "@/lib/my-details";
import type { BackendReview, NearbyPlace } from "@/lib/types";
import { Image } from "react-native";
import type { DevFixture } from "./registry";

// ENG-429 G3: reviews, write review, the location picker and address details (plan "Reviews and write review",
// "Location and address details"). Every fixture has a session, so nothing reaches QA. No write is listed: Submit,
// Confirm, Save and Delete get the interceptor's 409.

// `firebase_uid` empty so chat's Firestore listeners stay off. These screens print no distance.
const meera: MyDetailsResponse = {
  username: "meera_nair",
  firebase_uid: "",
  email: "meera.nair@example.com",
  first_name: "Meera",
  last_name: "Nair",
  phone: "+91 98450 12345",
  country: "IN",
  image: null,
  addresses: [],
  business_name: null,
  account_type: "user",
  merchant_approval_status: null,
  coordinates: { lat: 12.9784, long: 77.6408 },
  timezone: "Asia/Kolkata",
  email_verified: true,
  phone_verified: true,
  business_verified: false,
  currency: "INR",
  bills_to_business: false,
  billing_as_business: false,
};
const session = { user: meera };

const owner = { username: "karan_rao", first_name: "Karan", last_name: "Rao" };

// ---------------------------------------------------------------------------------------------------------------
// Reviews (2089:24972, 2089:25040). Only `product.name` is read; the stats and the list come from the API.

const product = { name: "bluetooth-speaker-indiranagar", title: "Bluetooth speaker" };

// Rating 1–5 → count; 14/6/2/1/1 is 4.3 from 24.
const STATS = { "1": 1, "2": 1, "3": 2, "4": 6, "5": 14 };
const NO_STATS = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };

const review = (username: string, first_name: string, last_name: string, created_at: string, comment: string): BackendReview => ({
  rating: "5",
  comment,
  created_at,
  moderation_labels: [],
  user: { username, first_name, last_name, image: null as unknown as BackendReview["user"]["image"] },
});

// The card clamps to two lines and offers "Show more" only when the text runs on, so each comment carries a second
// paragraph under the frame's two lines. Dates are the frame's; the card prints them relative (text heat note).
const FIRST_THREE = [
  review("aarav_mehta", "Aarav", "Mehta", "2026-10-12T10:00:00+05:30",
    "Exactly as described. Clean copy, no torn pages, and the owner had it ready at the door.\nWould rent again."),
  review("sneha_iyer", "Sneha", "Iyer", "2026-10-02T10:00:00+05:30",
    "Good condition and an easy pickup. I kept it a day longer and extending was simple.\nRecommended."),
  review("rohan_kulkarni", "Rohan", "Kulkarni", "2026-09-18T10:00:00+05:30",
    "Handover was quick. The cover has light wear, which the listing already said.\nAll good otherwise."),
];
const MORE_NAMES = [
  "Ishaan Gupta", "Kavya Reddy", "Arjun Menon", "Diya Shah", "Vivaan Joshi", "Ananya Das", "Kabir Singh",
  "Myra Pillai", "Reyansh Bose", "Saanvi Patel", "Aditya Rao", "Tara Kapoor", "Neel Bhat", "Riya Verma",
  "Dev Malhotra", "Aisha Khan", "Yash Jain", "Pooja Nair", "Rahul Sen", "Nisha Agarwal", "Om Chawla",
];
const REVIEWS: BackendReview[] = [
  ...FIRST_THREE,
  ...MORE_NAMES.map((name, i) => {
    const [first, last] = name.split(" ");
    return review(`${first}_${last}`.toLowerCase(), first, last, `2026-08-${String(28 - i).padStart(2, "0")}T10:00:00+05:30`,
      "Worked well for the weekend. Pickup and return were on time.");
  }),
];

const reviewsRoute = (reviews: BackendReview[]) => ({
  route: "ReviewsScreen" as const,
  params: { reviews, product, owner },
  session,
});

// ---------------------------------------------------------------------------------------------------------------
// Write a review (2089:25101 empty; 2089:25181 is the same fixture, then typed and tapped by hand, never Submit).

const speakerUri = Image.resolveAssetSource(require("../assets/04-reviews-address/bluetooth-speaker.png")).uri;
const writeReview: DevFixture = {
  route: "WriteReviews",
  params: {
    product: { ...product, cover_image: speakerUri, location: "Indiranagar, Bengaluru", rate: 550 },
    owner,
  },
  responses: {},
  session,
};

// ---------------------------------------------------------------------------------------------------------------
// Location picker (2089:31103): the design seed draws the pin, its address and the nearby places on the kit map tile.

const nearby = (place_id: string, name: string, lat: number, lng: number): NearbyPlace => ({
  place_id,
  name,
  vicinity: "Indiranagar, Bengaluru",
  geometry: { location: { lat, lng } },
});
const PIN = { latitude: 12.9719, longitude: 77.6412 };

// ---------------------------------------------------------------------------------------------------------------
// Address details (2089:31157 add, 2089:31227 edit). The seed names the pin instead of the geocoder.

const LINE = "HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038";
const place = { locality: "Indiranagar", postalCode: "560038" };
const coordinates = { lat: PIN.latitude, long: PIN.longitude };
const HOME: SavedAddress = {
  id: 1,
  address: "4th Cross, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038",
  address_line_1: "Flat 4B, Lakeview Apartments",
  address_line_2: "",
  locality: "Indiranagar",
  address_type: "home",
  label: "",
  coordinates,
  is_default: true,
  postal_code: "560038",
};
const WORK: SavedAddress = {
  id: 2,
  address: LINE,
  address_line_1: "Floor 3, Indiqube Orion",
  address_line_2: "Near Indiranagar Club",
  locality: "Indiranagar",
  address_type: "work",
  label: "",
  coordinates,
  is_default: false,
  postal_code: "560038",
};

/** Design fixtures for ENG-429 G3, keyed by frame id; spread into 04.ts. */
export const fixtures: Record<string, DevFixture> = {
  "2089:24972": {
    ...reviewsRoute(REVIEWS),
    responses: { "GET /product-review-stats/": STATS, "GET /product-review/": { results: REVIEWS } },
  },
  "2089:25040": {
    ...reviewsRoute([]),
    responses: { "GET /product-review-stats/": NO_STATS, "GET /product-review/": { results: [] } },
  },
  "2089:25101": writeReview,
  "2089:25181": writeReview,
  "2089:31103": {
    route: "LocationModal",
    params: {
      requestId: "design-31103",
      design: {
        pin: PIN,
        selectedAddress: "12, 4th Cross, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038",
        nearby: [
          nearby("design-31103-1", "Indiranagar Metro Station", 12.9783, 77.6408),
          nearby("design-31103-2", "100 Feet Road, HAL 2nd Stage", 12.9719, 77.6412),
          nearby("design-31103-3", "CMH Road, Indiranagar", 12.9784, 77.6386),
        ],
      },
    },
    responses: {},
    session,
  },
  // The first address, so the default is forced; the geocoder's PIN is 560038.
  "2089:31157": {
    route: "AddressDetails",
    params: { pin: { ...coordinates, address: LINE }, design: { place } },
    responses: { "GET /my/addresses/": [] },
    session,
  },
  // Editing Work with Home saved, so Home is taken ("Already saved"). Then by hand: PIN → "40005", Save; clear
  // line 1, Save. `save()` returns at a check both times, before any request.
  "2089:31227": {
    route: "AddressDetails",
    params: { address: WORK, design: { place } },
    responses: { "GET /my/addresses/": [HOME, WORK] },
    session,
  },
};
