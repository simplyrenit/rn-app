import type { Terms } from "@/backend/terms";
import type { MyDetailsResponse } from "@/lib/my-details";
import type { Category } from "@/lib/types";
import { Image } from "react-native";

/**
 * What every section-10 fixture shares (ENG-435): the users, the category list, the common reads and the cover.
 *
 * Every user's username starts with `design_` (plan §0.1): the root draft-photo and capture queues in nav.tsx run
 * under a design session and read `…:<username>` keys, so a name no QA account can have keeps them off real jobs.
 * `firebase_uid` is empty so chat's Firestore listeners stay off.
 */
export const kapoorBooks: MyDetailsResponse = {
  username: "design_kapoor_books",
  firebase_uid: "",
  email: "hello@kapoorbooks.in",
  first_name: "Kapoor",
  last_name: "Books",
  phone: "+91 98765 43210",
  country: "IN",
  image: null,
  addresses: [],
  business_name: "Kapoor Books",
  account_type: "merchant",
  merchant_approval_status: "approved",
  coordinates: { lat: 19.1972, long: 72.9722 },
  timezone: "Asia/Kolkata",
  email_verified: true,
  phone_verified: true,
  business_verified: false,
  currency: "INR",
  bills_to_business: false,
  billing_as_business: false,
};

export const merchantPending: MyDetailsResponse = {
  ...kapoorBooks,
  username: "design_merchant_pending",
  merchant_approval_status: "pending",
};

export const merchantRejected: MyDetailsResponse = {
  ...kapoorBooks,
  username: "design_merchant_rejected",
  merchant_approval_status: "rejected",
};

/**
 * The 1984 cover the listing-flow frames show (cropped from 2094:25067 photo 2 at 3x). Jest resolves no asset source,
 * and the registry loads this module in tests, so a missing one reads as "".
 */
export const COVER_1984: string = Image.resolveAssetSource(require("../assets/design-1984-cover.png"))?.uri ?? "";

// The category sheet's parents (2096:24835), in its order, under the taxonomy v2 slugs, so `categoryDisplayName`
// gives the frame's sentence-case names. Books' children are 2096:25059's.
const PARENTS: [string, string][] = [
  ["Furniture", "furniture"],
  ["Electronics & Computing", "electronics-computing"],
  ["Photo & Video Production", "photo-video-production"],
  ["Audio, Music & DJ", "audio-music-dj"],
  ["Automobiles & Mobility", "automobiles-mobility"],
  ["Fitness & Sports", "fitness-sports"],
  ["Gaming, VR & Emerging Tech", "gaming-vr-emerging-tech"],
  ["Machines, Tools & Equipment", "machines-tools-equipment"],
  ["Fashion & Accessories", "fashion-accessories"],
  ["Art, Decor & Hobby", "art-decor-hobby"],
  ["Books", "books"],
];
const BOOKS = ["Biography", "Fiction", "Kids", "Non-fiction", "Self-help", "Textbook & exam prep", "Other"];
const icon = { dark_icon: null, light_icon: null, main_icon: "" };

export const CATEGORIES: Category[] = PARENTS.map(([title, slug], index) => ({
  ...icon,
  id: 9100 + index,
  slug,
  homepage_order_id: 0,
  order_id: index + 1,
  title,
  subcategories:
    slug === "books"
      ? BOOKS.map((child, i) => ({
          ...icon,
          id: 9200 + i,
          slug: child.toLowerCase().replace(/[^a-z]+/g, "-"),
          order_id: i + 1,
          title: child,
        }))
      : [],
}));

/** Fiction, the 1984 draft's sub-category. */
export const FICTION_ID = 9201;

export const terms = (ownerAccepted: boolean): Terms => ({
  owner: { version: "2026-01", url: "https://simplyrenit.com/terms/owner", accepted: ownerAccepted },
  customer: { version: "2026-01", url: "https://simplyrenit.com/terms/rental", accepted: true },
});

/** The reads every list-flow screen makes; owner terms accepted unless a frame shows the tick. */
export const LIST_FLOW_READS = {
  "GET /category/": CATEGORIES,
  "GET /terms/": terms(true),
  "GET /deposit-rules/": [],
  "GET /my/addresses/": [],
  "GET /my/products/": { results: [] },
};
