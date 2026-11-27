import type { Cart } from "@/lib/cart";
import type { MyDetailsResponse } from "@/lib/my-details";
import type { BackendProduct, BackendReview, ProductSpec } from "@/lib/types";
import { Image } from "react-native";
import type { DevFixture } from "./registry";

// ENG-429 G1: the product page (01 2083:15971 / 16177 / 16201, 04 2089:22279 … 2089:24130). Every fixture has a
// session, so nothing reaches QA. No write is listed: Add to cart, Book now and Edit product are never tapped, and a
// write would get the interceptor's 409 anyway. `params` never carries `add` (it adds to the cart on mount).

// `?.`: jest maps images to a stub that resolveAssetSource cannot resolve.
const photo = (asset: number) => Image.resolveAssetSource(asset)?.uri ?? "";
const COVER = photo(require("@/dev/assets/04-pdp/nineteen-eighty-four-orwell.png"));
const ANIMAL_FARM = photo(require("@/dev/assets/04-pdp/animal-farm-orwell.png"));
const FOUNTAINHEAD = photo(require("@/dev/assets/04-pdp/fountainhead-rand.png"));
const FINAL_INVENTION = photo(require("@/dev/assets/04-pdp/our-final-invention-barrat.png"));
// "1/5": `ProductImage` dedupes URIs, so the other four photos are the cover under four distinct query strings.
const PHOTOS = [2, 3, 4, 5].map((n) => `${COVER}${COVER.includes("?") ? "&" : "?"}photo=${n}`);

const SLUG = "nineteen-eighty-four-orwell";

// Goregaon; the renter is 0.0216° (2.40 km) north of it, so the page prints "2.4 km away" (lib/distance seam).
const PLACE = { lat: 19.1646, long: 72.8493 };

const user = (username: string, first_name: string, last_name: string, coordinates: { lat: number; long: number }): MyDetailsResponse => ({
  username,
  firebase_uid: "",
  email: `${username}@example.com`,
  first_name,
  last_name,
  phone: "+91 98200 12345",
  country: "IN",
  image: null,
  addresses: [],
  business_name: null,
  account_type: "user",
  merchant_approval_status: null,
  coordinates,
  timezone: "Asia/Kolkata",
  email_verified: true,
  phone_verified: true,
  business_verified: false,
  currency: "INR",
  bills_to_business: false,
  billing_as_business: false,
});
const renter = { user: user("aditi_sharma", "Aditi", "Sharma", { lat: PLACE.lat + 0.0216, long: PLACE.long }) };
// `isOwner` compares usernames, so the owner's session is the product's owner.
const owner = { user: user("rohan_mehta", "Rohan", "Mehta", PLACE) };

const spec = (key: string, label: string, value: string, facet: ProductSpec["facet"]): ProductSpec => ({ key, label, value, facet });
const SPECS: ProductSpec[] = [
  spec("author", "Author", "George Orwell", "default"),
  spec("language", "Language", "English", "default"),
  spec("format", "Format", "Hardcover", "default"),
  spec("pages", "Pages", "328", "default"),
  spec("publisher", "Publisher", "Penguin Classics", "expanded"),
  spec("edition", "Edition", "Leather-bound collector’s edition", "expanded"),
  spec("published", "Published", "2021", "expanded"),
  spec("genre", "Genre", "Dystopian fiction", "expanded"),
  spec("size", "Size", "20 × 13 × 3 cm", "expanded"),
  spec("weight", "Weight", "520 g", "expanded"),
];

const DESCRIPTION =
  "First published in the summer of 1949, George Orwell’s 1984 is one of the most definitive texts of modern literature. " +
  "This delectable leather-bound edition, beautifully crafted and elegantly designed, comes with a ribbon bookmark, gilded " +
  "edges, and beautiful endpapers. Set in Oceania, one of the three inter-continental superstate that divided the world " +
  "among themselves after a global war, Orwell’s masterful critique of the political structures of the time works itself " +
  "out through the story of Winston Smith.";

const EVERY_DAY = { open: "10:00", close: "20:00" };
const HOURS = { mon: EVERY_DAY, tue: EVERY_DAY, wed: EVERY_DAY, thu: EVERY_DAY, fri: EVERY_DAY, sat: EVERY_DAY, sun: EVERY_DAY };

/** Tomorrow 10:00 in India, at module load, so the closed notice reads "at 10:00 am tomorrow". */
function tomorrowTenIst(): string {
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
  ist.setUTCDate(ist.getUTCDate() + 1);
  return `${ist.toISOString().slice(0, 10)}T10:00:00+05:30`;
}

const PRODUCT: BackendProduct = {
  name: SLUG,
  title: "1984 – George Orwell",
  description: DESCRIPTION,
  security_deposit: "1000.00",
  category: { title: "Fiction", parent: { title: "Books" } },
  moderation_labels: [],
  specs: SPECS,
  not_delivered: false,
  plans: [
    { unit: "day", price: "19.00", min: 2 },
    { unit: "week", price: "99.00", min: 1 },
    { unit: "month", price: "299.00", min: 1 },
  ],
  min_days: 2,
  monthly_billing: false,
  shop: {
    name: "Rohan Mehta",
    locality: "Goregaon",
    hours: HOURS,
    is_open: true,
    opens_at: null,
    min_notice_hours: 0,
    delivers: true,
    delivery_base_fee: "50.00",
    delivery_per_km: "10.00",
    delivery_max_km: "10",
  },
  delivery: null,
  delivery_from: "50.00",
  live_booking: true,
  book_for_morning: false,
  can_add_to_cart: false,
  requested: null,
  condition: "excellent",
  rate: "19.00",
  currency: "INR",
  coordinates: PLACE,
  average_rating: 4,
  review_count: 24,
  images: [COVER, ...PHOTOS],
  location: "Goregaon, Mumbai",
  cover_image: COVER,
  brand_name: "",
  model_name: "",
  usage_description: "",
  contact_name: "Rohan Mehta",
  products_listed: 3,
  avg_rating: 4.5,
  owner: {
    username: "rohan_mehta",
    firebase_uid: "",
    first_name: "Rohan",
    last_name: "Mehta",
    image: null as unknown as NonNullable<BackendProduct["owner"]>["image"],
    business_name: "",
    business_verified: false,
  },
};

// The rail's first two are the frame's, each with a second paragraph so the card offers "Show more" under the frame's
// three lines without an ellipsis on the third. "See all 24 reviews" counts the list, so it has 24 with unique usernames
// (the rail's React key). `fromNow()` prints 21 days as "21 days ago" (the frame's "3 weeks ago" is a text heat note).
const THREE_WEEKS_AGO = new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString();
const review = (username: string, first_name: string, last_name: string, comment: string): BackendReview => ({
  rating: "4",
  comment,
  created_at: THREE_WEEKS_AGO,
  moderation_labels: [],
  user: { username, first_name, last_name, image: null as unknown as BackendReview["user"]["image"] },
});
const OTHERS = [
  "Ishaan Gupta", "Kavya Reddy", "Arjun Menon", "Diya Shah", "Vivaan Joshi", "Ananya Das", "Kabir Singh", "Myra Pillai",
  "Reyansh Bose", "Saanvi Patel", "Aditya Rao", "Tara Kapoor", "Neel Bhat", "Riya Verma", "Dev Malhotra", "Aisha Khan",
  "Yash Jain", "Pooja Nair", "Rahul Sen", "Nisha Agarwal", "Om Chawla", "Zoya Mirza",
];
const REVIEWS: BackendReview[] = [
  review("ananya_iyer", "Ananya", "Iyer",
    "Beautiful edition and in perfect condition. Pickup took two minutes and the owner was right on time.\nWould happily rent from Rohan again."),
  review("tejas_hinduja", "Tejas", "Hinduja",
    "Well looked after, exactly as described. I would rent from this owner again.\nThe ribbon bookmark is a lovely touch."),
  ...OTHERS.map((name) => {
    const [first, last] = name.split(" ");
    return review(`${first}_${last}`.toLowerCase(), first, last, "Good copy, easy handover.");
  }),
];

// No `coordinates`: the frame's cards print the place, not a distance.
const similar = (name: string, title: string, rate: string, location: string, cover_image: string) => ({
  ...PRODUCT,
  name,
  title,
  rate,
  plans: [{ unit: "day", price: rate, min: 1 }],
  location,
  cover_image,
  images: [cover_image],
  coordinates: undefined,
});
const SIMILAR = {
  results: [
    similar("animal-farm-orwell", "Animal Farm by George Orwell", "19.00", "Goregaon, Mumbai", ANIMAL_FARM),
    similar("fountainhead-rand", "The Fountainhead by Ayn Rand", "25.00", "Malad West, Mumbai", FOUNTAINHEAD),
    similar("final-invention-barrat", "Our Final Invention by James Barrat", "19.00", "Goregaon, Mumbai", FINAL_INVENTION),
  ],
};

const EMPTY: Cart = { count: 0, cards: [] };
const IN_CART: Cart = {
  count: 1,
  cards: [
    {
      shop: { key: "rohan_mehta", name: "Rohan Mehta", locality: "Goregaon", delivers: true, verified: false },
      warning: null,
      lines: [
        {
          product: { name: SLUG, title: PRODUCT.title, cover_image: COVER, rate: "19.00", deposit: "1000.00" },
          warning: null,
          booking: null,
          added_at: null,
        },
      ],
    },
  ],
} as unknown as Cart;

/** One PDP fixture: the product as `changes` has it, the page's reads, and the session. */
function pdp(
  changes: Partial<BackendProduct>,
  options: { design?: object; cart?: Cart; session?: { user: MyDetailsResponse }; mine?: object } = {}
): DevFixture {
  const product = { ...PRODUCT, ...changes };
  return {
    route: "ProductDetail",
    // Any design seed (even `{}`) draws the neutral map instead of live tiles.
    params: { id: SLUG, design: options.design ?? {} },
    session: options.session ?? renter,
    responses: {
      // The owner's endpoint first: the public key is a suffix of it (`matchesKey`, first key wins).
      ...(options.mine ? { [`GET /my/products/${SLUG}/`]: { ...product, ...options.mine } } : {}),
      [`GET /api/products/${SLUG}/`]: product,
      "GET /product-review/": { results: REVIEWS },
      "GET /similar-products/": SIMILAR,
      "GET /cart/": options.cart ?? EMPTY,
      "GET /favorites/": [],
      "GET /my/addresses/": [],
    },
  };
}

const MORNING = {
  live_booking: false,
  book_for_morning: true,
  shop: { ...PRODUCT.shop!, is_open: false, opens_at: tomorrowTenIst() },
};
const NO_BOOKING = { live_booking: false, book_for_morning: false };

// The 16177 crops (plan "F+crops"): each scrolled by 628, the strip between the band and the bar; the last is the end.
const CROP = (scrollY: number) => pdp({}, { design: { scrollY } });

export const fixtures: Record<string, DevFixture> = {
  "2083:15971": pdp({}),
  "2083:16177": pdp({}),
  "2083:16177.s628": CROP(628),
  "2083:16177.s1256": CROP(1256),
  "2083:16177.s1884": CROP(1884),
  "2083:16177.s2247": CROP(2247),
  "2083:16201": pdp({}, { design: { open: "specs" } }),
  "2089:22279": pdp({}, { design: { open: "photo" } }),
  "2089:22295": pdp(MORNING, { design: { scrollY: 330 } }),
  "2089:22597": pdp(NO_BOOKING, { design: { scrollY: 330 } }),
  "2089:22896": pdp({ can_add_to_cart: true }),
  "2089:23201": pdp({ ...MORNING, can_add_to_cart: true }, { design: { scrollY: 330 }, cart: IN_CART }),
  "2089:23523": pdp({ ...NO_BOOKING, can_add_to_cart: true }, { design: { scrollY: 330 } }),
  "2089:23841": pdp({}, { session: owner, mine: { status: "live", flag_reasons: [] } }),
  // The banner shows only with a label, and says it after its first sentence (computed copy, heat note).
  "2089:24130": pdp(
    { moderation_labels: ["Photo check"] },
    { session: owner, mine: { status: "flagged", flag_reasons: [] }, design: { scrollY: 240 } }
  ),
};
