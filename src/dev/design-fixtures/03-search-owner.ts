import type { MyDetailsResponse } from "@/lib/my-details";
import type { OwnerReview, PublicOwner } from "@/lib/types";
import { Image } from "react-native";
import type { DevFixture } from "./registry";

// ENG-427 group C: the search form, the date picker and the owner pages (Figma section 03). Spread into 03.ts.

// The customer who is looking: not the owner, so the owner profile shows a visitor's view. No photo; `firebase_uid`
// empty so chat's Firestore listeners stay off in the design session.
const shopper: MyDetailsResponse = {
  username: "kavya_rao",
  firebase_uid: "",
  email: "kavya.rao@gmail.com",
  first_name: "Kavya",
  last_name: "Rao",
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
const session = { user: shopper };

const uri = (asset: number) => Image.resolveAssetSource(asset)?.uri ?? "";
const COVERS = {
  orwell1984: uri(require("../assets/03c/book-1984.png")),
  animalFarm: uri(require("../assets/03c/book-animal-farm.jpg")),
  fountainhead: uri(require("../assets/03c/book-fountainhead.jpg")),
};

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

// Rohan Mehta, the verified business the owner frames draw (2089:24680, 24740, 36248, 36415).
const rohan: PublicOwner = {
  username: "rohan",
  firebase_uid: "",
  first_name: "Rohan",
  last_name: "Mehta",
  image: null,
  average_rating: 4.5,
  date_joined: "2024-06-10T10:00:00+05:30",
  business_verified: true,
  business_verified_at: "2026-03-12T12:00:00Z",
  business_name: "Mehta Book House",
  account_type: "business",
  business_registration_kind: "udyam",
  shop_url: null,
};

// The owner profile's distance line ("1.2 km away") is measured from the device location the run pins
// (18.9548, 72.8054; plan precondition 5): 0.0108° of latitude is about 1.2 km. Owners-products prints no distance,
// so its copies carry no coordinates.
const PINNED = { lat: 18.9548, long: 72.8054 };
const book = (name: string, title: string, rate: string, cover: string, withCoordinates: boolean) => ({
  name,
  title,
  rate,
  location: "Goregaon, Mumbai",
  cover_image: cover,
  coordinates: withCoordinates ? { lat: PINNED.lat + 0.0108, long: PINNED.long } : null,
  // The trust card's email and phone lines read the listing's owner (users-screen.tsx).
  owner: { username: "rohan", first_name: "Rohan", last_name: "Mehta", email_verified: true, phone_verified: true },
});
const books = (withCoordinates: boolean) => [
  book("fx-1984-orwell", "1984 – George Orwell", "19", COVERS.orwell1984, withCoordinates),
  book("fx-animal-farm", "Animal Farm by George Orwell", "19", COVERS.animalFarm, withCoordinates),
  book("fx-fountainhead", "The Fountainhead by Ayn Rand", "25", COVERS.fountainhead, withCoordinates),
];

// The frames draw four reviews (24740) and two in the rail (36248); all six go in so "6 reviews" counts true.
// moment's fromNow() prints "21 days ago" / "a month ago" where the frames have "3 weeks ago" / "1 month ago"
// (plan Decision 8).
const REVIEWS: [string, string, string, number][] = [
  ["Ananya", "Iyer", "Beautiful edition and in perfect condition. Pickup took two minutes and the owner was right on time.", 21],
  ["Tanvi", "Hegde", "Well looked after, exactly as described. I would rent from this owner again.", 30],
  ["Kabir", "Arora", "Had the book ready at the gate and explained the return in one line. Easy.", 60],
  ["Meera", "Joshi", "Clean copy, no notes in the margins. I returned it a day late and he was kind about it.", 90],
  ["Dev", "Malhotra", "Quick replies and a fair deposit. The book was wrapped for the rain.", 120],
  ["Sara", "Khan", "Exactly the edition I wanted for my book club. Smooth return.", 150],
];
const reviews = (): OwnerReview[] =>
  REVIEWS.map(([first, last, comment, days], index) => ({
    id: 7100 + index,
    comment,
    created_at: daysAgo(days),
    updated_at: daysAgo(days),
    moderation_labels: [],
    name: "fx-1984-orwell",
    rating: 5,
    owner: { username: "rohan", first_name: "Rohan", last_name: "Mehta", image: "" },
    reviewer: { username: `${first.toLowerCase()}_${last.toLowerCase()}`, first_name: first, last_name: last, image: null },
  }));

const verifiedOwnerProfile: DevFixture = {
  route: "UserDetail",
  params: { id: "rohan" },
  responses: {
    "GET /owner-details/": rohan,
    "GET /products/by-owner/*/": books(true),
    "GET /owner-ratings/reviews/*/": reviews(),
    "GET /favorites/": [],
  },
  session,
};

// Aarav Shah, a new host: unrated, no business, nothing listed, no reviews, joined this month (2089:36523).
const aarav: PublicOwner = {
  username: "aarav",
  firebase_uid: "",
  first_name: "Aarav",
  last_name: "Shah",
  image: null,
  average_rating: 0,
  date_joined: "2026-11-05T10:00:00+05:30",
  business_verified: false,
  business_verified_at: null,
  business_name: null,
  account_type: "user",
  shop_url: null,
};

/** Design fixtures for ENG-427 group C, keyed by frame id (registry.ts). */
export const fixtures: Record<string, DevFixture> = {
  // search · Empty. Hide the simulator keyboard before diffing: What? autofocuses (plan precondition 6).
  "2089:29597": { route: "Search", responses: {}, session },
  // search · Filled. The range has no route param: tap When → 28 → 30 → Confirm (until ENG-428's design-state seed).
  "2089:29654": {
    route: "Search",
    params: { what: "Bluetooth speaker", where: "Andheri West, Mumbai", coords: { lat: 19.1364, lng: 72.8296 } },
    responses: {},
    session,
  },
  // search-suggestions · Matches: type "spea" into What?.
  "2089:29719": {
    route: "Search",
    responses: {
      "GET /product-title/": {
        products: [
          "JBL Flip 6 Bluetooth speaker",
          "Marshall Emberton II speaker",
          "Party speaker with 2 mics",
          "Sony SRS-XB13 speaker",
        ],
      },
    },
    session,
  },
  // search-where-sheet · Nearby places: tap Where. The rows are Google nearbysearch (bare axios), not servable here.
  "2089:29793": { route: "Search", responses: {}, session },
  // date-range-picker · Range picked: tap When → 28 → 30.
  "2089:29905": { route: "Search", responses: {}, session },
  // owners-products · Grid. The app passes the owner's first name (plan Decision 9).
  "2089:24680": {
    route: "OwnersProducts",
    params: { products: books(false), name: "Rohan", shopUrl: null },
    responses: { "GET /favorites/": [] },
    session,
  },
  // owners-reviews · List.
  "2089:24740": {
    route: "OwnersReviewScreen",
    params: { owner: rohan, reviews: reviews() },
    responses: {},
    session,
  },
  "2089:36248": verifiedOwnerProfile,
  "2089:36415": verifiedOwnerProfile,
  "2089:36523": {
    route: "UserDetail",
    params: { id: "aarav" },
    responses: {
      "GET /owner-details/": aarav,
      "GET /products/by-owner/*/": [],
      "GET /owner-ratings/reviews/*/": [],
      "GET /favorites/": [],
    },
    session,
  },
};
