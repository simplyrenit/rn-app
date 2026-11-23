import type { MyDetailsResponse } from "@/lib/my-details";
import type { Category } from "@/lib/types";
import { Image } from "react-native";
import { fixtures as results } from "./03-results";
import { fixtures as searchOwner } from "./03-search-owner";
import type { DevFixture } from "./registry";

// all-categories · Loaded (2089:24546): the frame's 15 parents, in its order, under the taxonomy v2 slugs the API
// sends (as in HOME_NAMES in lib/home-categories.ts and the v2 keys in lib/category-icons.tsx). No uploaded pictures.
const ALL_CATEGORIES: [string, string][] = [
  ["Electronics & Computing", "electronics-computing"],
  ["Photo & Video Production", "photo-video-production"],
  ["Audio, Music & DJ", "audio-music-dj"],
  ["Fashion & Accessories", "fashion-accessories"],
  ["Gaming, VR & Emerging Tech", "gaming-vr-emerging-tech"],
  ["Machines, Tools & Equipment", "machines-tools-equipment"],
  ["Travel, Outdoor & Office", "travel-outdoor-office"],
  ["Fitness & Sports", "fitness-sports"],
  ["Automobiles & Mobility", "automobiles-mobility"],
  ["Appliances", "appliances"],
  ["Furniture", "furniture"],
  ["Art, Decor & Hobby", "art-decor-hobby"],
  ["Events & Celebrations", "events-celebrations"],
  ["Baby & Kids", "baby-kids"],
  ["Health & Medical", "health-medical"],
];

const categories: Category[] = ALL_CATEGORIES.map(([title, slug], index) => ({
  id: 9000 + index,
  slug,
  // Home shows seven (ENG-76); the first seven here, so Home stays filled while the fixture is on.
  homepage_order_id: index < 7 ? index + 1 : 0,
  dark_icon: null,
  light_icon: null,
  main_icon: "",
  order_id: index + 1,
  title,
  subcategories: [],
}));

// ENG-427 group A: Home (section 01's three Home frames, which have no fixture file of their own), All categories,
// the Category landing and Saved.

// A customer for the signed-in frames; the frames never show who. No photo, `firebase_uid` empty so chat's Firestore
// listeners stay off in the design session.
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
  coordinates: { lat: 18.9548, long: 72.8054 },
  timezone: "Asia/Kolkata",
  email_verified: true,
  phone_verified: true,
  business_verified: false,
  currency: "INR",
  bills_to_business: false,
  billing_as_business: false,
};
const session = { user: customer };

// The listing photos, exported from the frames with Figwright save_image_fills (src/dev/assets/03a).
// Under jest an image require is a stub that resolves to nothing, and the fixture test loads every section.
const uri = (asset: number) => Image.resolveAssetSource(asset)?.uri ?? "";
const photo = {
  tennisCourt: uri(require("../assets/03a/pdp-tennis-court.jpg")),
  turf: uri(require("../assets/03a/equifit-turf.jpg")),
  studio: uri(require("../assets/03a/photo-studio.jpg")),
  ps5: uri(require("../assets/03a/ps5-with-fifa.jpg")),
  carvaan: uri(require("../assets/03a/saregama-carvaan-radio.jpg")),
  vr: uri(require("../assets/03a/meta-vr-glasses.jpg")),
  racket: uri(require("../assets/03a/wilson-pro-staff-97-tennis-racket.jpg")),
  boxingBag: uri(require("../assets/03a/boxing-bag.jpg")),
  necklace: uri(require("../assets/03a/gold-necklace-set.jpg")),
  animalFarm: uri(require("../assets/03a/animal-farm-by-george-orwell.jpg")),
  fountainhead: uri(require("../assets/03a/the-fountainhead-by-ayn-rand.jpg")),
};

// The point the landing's distance lines are measured from (plan precondition 5: the device location is pinned
// here). 0.0108° of latitude is about 1.2 km, so each listing sits that far north of it.
const PINNED = { lat: 18.9548, long: 72.8054 };
const away = (km: number) => ({ lat: PINNED.lat + km / 111.19, long: PINNED.long });

/** One listing card as the rails, the search and the favourites return it: only what the card reads. */
const listing = (
  name: string,
  title: string,
  rate: string,
  location: string,
  cover_image: string,
  km = 0
) => ({ name, title, rate, location, cover_image, moderation_labels: [], coordinates: away(km) });

// Every name is distinct across the three Home rails: RailDedupeProvider hides a repeat.
const home = {
  experiences: [
    listing("design-pdp-tennis-court", "PDP Tennis Court", "600", "Malabar Hill, Mumbai", photo.tennisCourt),
    listing("design-equifit-turf", "Equifit Turf", "6500", "BKC, Mumbai", photo.turf),
    listing("design-photo-studio", "Photo Studio", "3450", "Bandra, Mumbai", photo.studio),
  ],
  topPicks: [
    listing("design-ps5-fifa", "PS5 with FIFA", "750", "Goregaon, Mumbai", photo.ps5),
    listing("design-carvaan", "Saregama Carvaan radio", "150", "Goregaon, Mumbai", photo.carvaan),
    listing("design-meta-vr", "Meta VR Glasses", "900", "Andheri West, Mumbai", photo.vr),
  ],
  popular: [
    listing("design-wilson-racket", "Wilson Pro Staff 97 tennis racket", "190", "Matunga, Mumbai", photo.racket),
    listing("design-boxing-bag", "Boxing Bag", "250", "Powai, Mumbai", photo.boxingBag),
    listing("design-gold-necklace", "Gold necklace set", "1450", "Goregaon, Mumbai", photo.necklace),
  ],
};

const homeResponses = (cartCount: number) => ({
  "GET /category/": categories,
  "GET /top-experiences/": { results: home.experiences },
  "GET /top-rated-experiences/": { results: home.topPicks },
  "GET /popular-products-in-area/": { results: home.popular },
  // Home reads only the count; the cart's cards are the cart screen's.
  "GET /cart/": { count: cartCount, cards: [] },
  "GET /notification/": { results: [] },
  "GET /favorites/": [],
});

// home · Signed in (2083:15120); the full scroll (2083:15347) is the same screen scrolled.
const homeSignedIn: DevFixture = {
  route: "MainTabs",
  params: { screen: "Home" },
  responses: homeResponses(0),
  session,
};

// category-landing (2089:27555): Fitness & Sports with the frame's eight sub-categories, and the four listings near
// the pinned point, nearest first, at the distances the frame prints.
const FITNESS_SUBS = ["Tennis", "Badminton", "Cricket", "Football", "Gym", "Cycle", "Boxing & martial arts", "Board games"];
const landingCategories: Category[] = categories.map((category) =>
  category.slug === "fitness-sports"
    ? {
        ...category,
        subcategories: FITNESS_SUBS.map((title, index) => ({
          id: 9100 + index,
          slug: `fitness-sports-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`,
          dark_icon: null,
          light_icon: null,
          main_icon: "",
          order_id: index + 1,
          title,
        })),
      }
    : category
);
const nearYou = [
  listing("design-pdp-tennis-court", "PDP Tennis Court", "600", "Malabar Hill, Mumbai", photo.tennisCourt, 1.2),
  listing("design-equifit-turf", "Equifit Turf", "6500", "BKC, Mumbai", photo.turf, 2.4),
  listing("design-wilson-racket", "Wilson Pro Staff 97 tennis racket", "190", "Matunga, Mumbai", photo.racket, 3.1),
  listing("design-boxing-bag", "Boxing Bag", "250", "Powai, Mumbai", photo.boxingBag, 4.8),
];
const landing = (results: unknown[]): DevFixture => ({
  route: "CategoryLanding",
  params: { slug: "fitness-sports", title: "Fitness & Sports" },
  responses: { "GET /category/": landingCategories, "GET /search/": results, "GET /favorites/": [] },
  session,
});

// saved · Signed in (2089:27772): the six saved listings, in the frame's order.
const saved = [
  listing("design-ps5-fifa", "PS5 with FIFA", "750", "Goregaon, Mumbai", photo.ps5),
  listing("design-meta-vr", "Meta VR Glasses", "900", "Goregaon, Mumbai", photo.vr),
  listing("design-wilson-racket", "Wilson Pro Staff 97 tennis racket", "190", "Matunga, Mumbai", photo.racket),
  listing("design-boxing-bag", "Boxing Bag", "250", "Powai, Mumbai", photo.boxingBag),
  listing("design-animal-farm", "Animal Farm by George Orwell", "19", "Goregaon, Mumbai", photo.animalFarm),
  listing("design-fountainhead", "The Fountainhead by Ayn Rand", "25", "Goregaon, Mumbai", photo.fountainhead),
];
const savedTab = (favorites: unknown[]): DevFixture => ({
  route: "MainTabs",
  params: { screen: "Saved" },
  responses: { "GET /category/": categories, "GET /favorites/": favorites },
  session,
});

/** Design fixtures for Figma section 03 (Home and browse), keyed by frame id (registry.ts). */
export const fixtures: Record<string, DevFixture> = {
  ...results,
  ...searchOwner,
  "2083:15120": homeSignedIn,
  "2083:15347": homeSignedIn,
  // home · Cart has items: the cart button and its badge of 2 beside a narrower field.
  "2083:15579": { ...homeSignedIn, responses: homeResponses(2) },
  "2089:24546": { route: "AllCategories", responses: { "GET /category/": categories }, session },
  // all-categories · Error: the list stays empty after the screen's own refetch, so it shows its error state.
  "2089:24644": { route: "AllCategories", responses: { "GET /category/": [] }, session },
  "2089:27555": landing(nearYou),
  "2089:27679": landing([]),
  "2089:27772": savedTab(saved),
  "2089:27893": savedTab([]),
  // saved · Signed out: no session, so run it on a signed-out device. Signed out, Saved reads no favourites; the
  // fixture still lists every read the fixture switch and the tabs make, so nothing live from QA is drawn.
  "2089:27951": {
    route: "MainTabs",
    params: { screen: "Saved" },
    responses: { "GET /category/": categories, "GET /favorites/": [] },
  },
};
