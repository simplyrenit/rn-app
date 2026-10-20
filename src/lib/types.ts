import {
  NavigationProp,
  RouteProp,
  useNavigation,
} from "@react-navigation/native";
import { DimensionValue, FlexAlignType, ImageSourcePropType } from "react-native";
import type { SavedAddress } from "@/lib/addresses";
import type { BookItem, DeliveryMode, ProductShop } from "@/lib/booking";
import type { Moment, Side } from "@/lib/capture";
import type { Plan } from "@/lib/plans";
import type { ListingDelivery } from "@/lib/delivery";
import type { ReportKind } from "@/lib/day-of";
import type { PendingEdit } from "@/lib/listing-edit";
import type { FlagReason, ListingStatus } from "@/lib/listing-status";
import type { Ring } from "@/lib/shop-ring";

export interface OTPResponse {
  access: string | null;
  refresh: string | null;
  is_verified: boolean;
  message: string;
  /** For an account not finished yet: proof that this address was just confirmed, sent on with sign-up or an email change (T-19). */
  proof_token?: string;
}

export interface PhoneVerificationResponse {
  onboarding_required?: boolean;
  phone?: string;
  /** For an account with no name yet: proof that this number was just confirmed, sent on with sign-up (T-19). */
  proof_token?: string;
  access_token?: string;
  refresh_token?: string;
}

export interface CategoryItem {
  name: string;
  /** The taxonomy v2 parent slug this Home tile opens. */
  slug: string;
  image: ImageSourcePropType;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  account_type?: AccountType;
  merchant_approval_status?: MerchantApprovalStatus;
}

export type AccountType = "user" | "merchant";
export type MerchantApprovalStatus = "pending" | "approved" | "rejected" | null;

export interface CarouselItem {
  title: string;
  description: string;
  lightImage: any;
  darkImage: any;
}

export interface ItemCard {
  id: string;
  image: string | null;
  title: string;
  location: string;
  /** The day price (`rate`); with `plans` the card shows the smallest plan instead (ENG-281). */
  price: string;
  plans?: Plan[];
  isFavorite?: boolean;
  isDarkMode?: boolean;
  /** The owner's own shelf only: what state the listing is in (ENG-124). */
  status?: ListingStatus | null;
  flagReasons?: FlagReason[];
  width?: DimensionValue;
  alignItems?: FlexAlignType;
}

export interface ReviewData {
  productName: string;
  productReview: string;
  ownerReview: string;
  productRating: number;
  ownerRating: number;
  condition: string;
}

export interface UnavailabilityFormData {
  category: string;
  subcategory: string;
  coordinates: {
    type: string;
    coordinates: [number, number];
  };
  address: string;
  what_are_you_looking_for: string;
  quantity: string;
  when_do_you_need_it: {
    start_date: string;
    end_date: string;
  };
  how_to_contact: {
    mode: string;
    value: string;
  };
}

interface ProductAvailability {
  startDate: string;
  endDate: string;
}

export interface NearbyPlace {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface BackendReview {
  rating: string;
  comment: string;
  created_at: string;
  moderation_labels: string[];
  user: {
    username: string;
    image: {
      name: string;
      image_url: string;
    };
    first_name: string;
    last_name: string;
  };
}

export interface OwnerReview {
  comment: string;
  created_at: string;
  id: number;
  moderation_labels: string[];
  name: string;
  owner: {
    username: string;
    first_name: string;
    last_name: string;
    image: string;
  };
  rating: number;
  reviewer: {
    username: string;
    first_name: string;
    last_name: string;
    /**
     * A URL in older payloads, an `{ image_url, name }` object in current ones
     * (the same shape every other user object carries). Read it through
     * `imageUrlOf`; passing it straight to `Avatar` crashed the owner profile.
     */
    image: string | { image_url?: string | null } | null;
  };
  updated_at: string;
}

export interface Product {
  category: CategoryType;
  subcategory: CategoryType;
  name: string;
  brandName: string;
  modelName: string;
  /** The values the create/edit API accepts; the form always sends lower case. */
  condition: "excellent" | "good" | "fair";
  productDescription: string;
  usageDescription: string;
  location: {
    lat: number;
    long: number;
  };
  blockedDates: string[];
  pricePerDay: string;
  securityDeposit: string;
  personOfContact: {
    name: string;
    phoneNumber?: string;
  };
  images: ProductImage[];
  coverImage: ProductImage;
  productAvailability: ProductAvailability[];
  address: string;
}

export interface CategoryType {
  name: string;
  title: string;
  darkIcon: string;
  lightIcon: string;
}

export interface ProductImage {
  image: string;
  file_type: string;
}

export type RootStackParamList = {
  Home: undefined;

  Settings: undefined;
  ConfirmPassword: { enteredPassword: string };
  UserDetail: { id: string };
  ChatDetails: { id: string };
  Verify: {
    email?: string;
    phone?: string;
    verificationType: "otp" | "password" | "phone";
  };
  Phone: undefined;
  ProductDetail: {
    id: string;
    isFavorite?: boolean;
    /**
     * The spec filters of the search the renter came from (ENG-35), as the
     * search sent them: options per spec key. The page marks the values that
     * match. Absent from every other entry point.
     */
    specFilters?: Record<string, string[]>;
    /**
     * The dates of the search the renter came from, as India days (ENG-172).
     * Book now starts on them. Absent from every other entry point.
     */
    dates?: { first_day: string; last_day: string };
  };
  ReviewsScreen: {
    reviews: BackendReview[];
    product: BackendProduct;
    owner: {
      username: string;
      first_name: string;
      last_name: string;
    };
  };
  WriteReviews: {
    product: BackendProduct;
    owner: {
      username: string;
      first_name: string;
      last_name: string;
    };
  };
  Welcome: undefined;
  MainTabs: {
    screen?: "Home" | "Saved" | "Post" | "Rentals" | "Chat" | "Profile";
  } | undefined;
  Email: undefined;
  About: undefined;
  Password: undefined;
  Location: undefined;
  Privacy: undefined;
  Terms: undefined;
  Search:
    | {
        what?: string;
        where?: string;
        coords?: { lat?: number; lng?: number };
      }
    | undefined;
  SearchResults: {
    selectedItem: string;
    /**
     * ISO 8601 timestamps, never `Date`. React Navigation serialises the whole
     * param tree for state persistence and deep links; a Date instance made it
     * warn on every search and left a restored session unable to rebuild the
     * query. Producers call `toISOString()`, consumers parse.
     */
    range: { startDate: string | undefined; endDate: string | undefined };
    address: string;
    coords: { lat: number | undefined; lng: number | undefined };
    products: BackendProduct[];
    category?: string;
    /**
     * A sub-category title of `category`, chosen before the screen opens — the
     * product page's breadcrumb (ENG-35). Needs `category` alongside it.
     */
    subCategory?: string;
  };
  /** Every active category, as tiles (ENG-76). */
  AllCategories: undefined;
  /**
   * One category's sub-categories plus listings near the user (ENG-77).
   * `slug` is the v2 parent's; `title` is shown while the list loads.
   */
  CategoryLanding: { slug: string; title: string };
  myProducts: undefined;
  editProduct: { id: string };
  unavailabilityForm: undefined;
  UnavailabilityFormInputs: {
    category: string;
    subcategory: string;
  };
  unavailabilityFormCategories: undefined;
  NetworkDiagnostics: undefined;
  UnavailabilitySubCat: { category: string; subcategories?: Subcategory[] };
  EditProductAvailability: { dates_blocked: BlockedDates[]; name: string };
  /** `categoryId`: the sub-category the listing has now, so choosing it again can say nothing was changed. */
  EditCategory: { name: string; categoryId?: number | null; pending?: PendingEdit | null };
  EditSubCategories: {
    category: string;
    subcategories?: Subcategory[];
    name: string;
    categoryId?: number | null;
    pending?: PendingEdit | null;
  };
  EditAboutProduct: { data: BackendProduct };
  EditProductImages: { images: string[]; name: string, coverImage: string; };
  EditCoverImage: { images: string[]; name: string, coverImage: string, };
  OwnersReviewScreen: {
    owner: PublicOwner;
    reviews: OwnerReview[];
  };
  LocationModal: {
    requestId: string;
    /** A pin to open on — Address details' "Change". */
    initial?: { latitude: number; longitude: number };
  };
  SavedAddresses: undefined;
  /**
   * `address` edits it; `pin` (fresh from the map) adds one. `requestId` is a
   * `location-request` the saved address is handed back through, for a caller
   * that is waiting on the add flow.
   */
  AddressDetails: {
    address?: SavedAddress;
    pin?: { lat: number; long: number; address: string | null };
    requestId?: string;
  };
  // The photo-first listing flow (ENG-10, IMPLEMENTATION.md §8.1).
  /**
   * `termsNeeded`: the server refused a submit for the owner terms (ENG-122), so
   * this first step holds Continue until the terms have been read and ticked.
   */
  ListAddPhotos: { focusPhoto?: number; termsNeeded?: boolean } | undefined;
  ListReading: undefined;
  ListReview: { manual?: boolean } | undefined;
  ListPreview: undefined;
  // `coverUrl` is additive to §8.1: the draft is cleared before L-17 opens.
  ListSubmitted: { productName: string; coverUrl?: string | null; status?: string | null; reasons?: FlagReason[]; waitsText?: string | null };
  // Merchant verification (ENG-12). Params are flags only: a PAN or GSTIN never goes in one.
  KycIntro: { source?: "profile" | "post_listing" | "push"; supersede?: boolean } | undefined;
  KycDetails: { supersede?: boolean } | undefined;
  KycStatus: { justReturned?: boolean } | undefined;
  OwnersProducts: { products: BackendProduct[]; name: string };
  /** The owner's bank account: add, verify, change (ENG-135). */
  BankAccount: undefined;
  /** The owner's hours, Open switch, notice and delivery (ENG-146). */
  RentalSettings: undefined;
  RentalHours: undefined;
  /** The shop's address and pin, on the same map picker (ENG-265). */
  ShopAddress: undefined;
  RentalDelivery: undefined;
  /**
   * Live booking, the customer's side (ENG-99). `BookingDates` is BK-02: the
   * dates and how the item changes hands. `moved_from` is the customer's refused
   * or unanswered booking whose ₹99 moves to the new one.
   */
  BookingDates: { product: string; first_day?: string; last_day?: string; moved_from?: string };
  /** BK-03 and BK-11: the whole price, then Book now. */
  ReviewAndBook: {
    item: BookItem;
    first_day: string;
    last_day: string;
    delivery_mode: DeliveryMode;
    address_id?: number | null;
    /** "Home": the saved address the item is delivered to. */
    address_name?: string;
    moved_from?: string;
    /** An extension (ENG-220): the booking these days follow. The request then goes to `extend`. */
    extends?: string;
  };
  /**
   * One booking at whatever stage the server says it is in. `pay` opens the pay
   * page for the ₹99 on arrival: set only by Book now, a moment after the tap.
   */
  Booking: { number: string; pay?: boolean };
  /** BK-07: picks the first arrival window, or asks to change the one that is set. */
  BookingWindow: { number: string };
  /** BK-13: pay the deposit. Opened from the booking and from the deposit pushes (ENG-222). */
  BookingDeposit: { number: string };
  /** BK-08 for a booking whose own screen is the day of the handover or the rental: the timeline, the payments, cancelling. */
  BookingDetails: { number: string };
  /** BK-18: both sets side by side, "All good · show my code", "Not as described". */
  BookingCheck: { number: string };
  /** BK-19: refusing at the door, with what is different and photos. */
  BookingRefuse: { number: string };
  /** BK-21: the return, where the customer types the shop's code. */
  BookingReturn: { number: string };
  /** Picks how many more days; the price screen then asks with `extends`. */
  BookingExtend: { number: string };
  /** BK-20's "Something doesn't work?": the customer's fault report, with photos, within 24 hours of the handover (ENG-252). */
  BookingFault: { number: string };
  /**
   * One claim, for either side (ENG-252, ENG-253): who raised it, the amount, the deadline, the reply
   * (the customer's one reply is sent here), what was decided and what it did to the money. Which side of the
   * booking the person is on comes from the claim's own `my_side` (P5-4).
   */
  Claim: { id: number };
  /**
   * "They did not come" (either side, `no_show`) and the customer's "Owner did not
   * come" at the return (`owner_absent`), with a photo taken on the spot. `name` and
   * `mode` are for the shop's words: the customer's first name and how the item changes hands.
   */
  BookingReport: { number: string; kind: ReportKind; role: Side; name?: string; mode?: DeliveryMode };
  /**
   * The shop's ring (ENG-209). `ring` is the request a push carried or Today
   * holds: drawn at once, then checked against the live answer, which decides.
   */
  ShopRing: { number: string; ring?: Ring };
  /** The shop's Today and Bookings for an owner who has no Rentals tab view of them (ENG-210). */
  ShopToday: undefined;
  /** One booking as its shop sees it (SH-07). */
  ShopBooking: { number: string };
  /** SH-08 and SH-09: the shop's handover, up to typing the customer's code (ENG-223). */
  ShopHandover: { number: string };
  /** SH-10: the shop's return, with the handover set beside the return set and the code to show. */
  ShopReturn: { number: string };
  /** SH-11: the shop reports a problem once the item is back: what happened, how much, photos (ENG-253). */
  ShopReportProblem: { number: string };
  /** The photo walk-through for drafts that need photos (ENG-192, SH-12). */
  DraftPhotos: undefined;
  /**
   * The capture (ENG-221, BK-15 to BK-17): one person's photos, video and ticks at
   * the handover or the return. `role` is who holds the phone. `forOther`: the
   * other person's phone failed and this one records their set too. `title` and
   * `other` are the item and the other person, for the words on screen; `skew_ms`
   * is how far the server's clock is ahead of this phone's, for the time on each shot.
   */
  Capture: {
    number: string;
    moment: Moment;
    role: Side;
    forOther?: boolean;
    title?: string;
    other?: string;
    skew_ms?: number;
    /** The booking asks the owner to check the customer's ID: for the general list, when the booking's own cannot be read. */
    id_match?: boolean;
    /** The customer's full name from the shop's booking (T-44), for the ID tick's words; null or absent when it is not shown. */
    id_match_name?: string | null;
  };
  [key: string]: object | undefined;
};

/**
 * `id` and `slug` arrive with taxonomy v2 (ENG-28). QA servers built before it
 * omit both, so every reader has to work without them.
 */
export interface Subcategory {
  id?: number;
  slug?: string;
  dark_icon: string | null;
  light_icon: string | null;
  main_icon: string;
  order_id: number;
  title: string;
}

export interface Category {
  id?: number;
  slug?: string;
  /** 0 keeps a category off Home; otherwise Home's tile order (ENG-76). */
  homepage_order_id?: number;
  dark_icon: string | null;
  light_icon: string | null;
  main_icon: string;
  order_id: number;
  title: string;
  subcategories: Subcategory[];
}

export interface UserDetails {
  userId: string;
  firebaseUid: string;
  username: string;
  profilePicture: string;
}

export interface ReadStatus {
  userId: string;
  isRead: boolean;
}

export interface ReadCount {
  userId: string;
  count: number;
}

export interface BlockStatus {
  reason: string;
  initiatedBy: string;
  isBlocked: boolean;
}

export interface Owner {
  addresses: string[];
  average_rating?: number;
  business_name: string;
  coordinates: {
    lat: number;
    long: number;
  };
  country: string;
  email: string;
  first_name: string;
  last_name: string;
  image: {
    image_url: string;
    name: string;
  };
  phone: string;
  username: string;
  date_joined: string;
}

export interface PublicOwner {
  username: string;
  firebase_uid: string;
  first_name: string;
  last_name: string;
  image: {
    image_url: string;
    name: string;
  } | null;
  average_rating?: number;
  date_joined: string;
  /** The "Verified business" badge (D-26). Absent on an older API. */
  business_verified?: boolean;
  /** When the business was verified (ENG-73), RFC 3339; null when it is not. */
  business_verified_at?: string | null;
  /** ENG-73: so an owner with no listings still shows the business name. */
  business_name?: string | null;
  account_type?: string;
}

export interface Conversation {
  id?: string;
  participantIds: string[];
  participants: UserDetails[];
  initialParticipants: UserDetails[];
  readStatus: ReadStatus[];
  readCount: ReadCount[];
  blockStatus: BlockStatus;
  startedBy: string;
  lastMessage?: string;
  lastMessageTime?: string;
  hiddenBy?: Record<string, boolean>;
}

export interface Message {
  id?: string;
  conversationId: string;
  from: string;
  senderUid: string;
  type:
    | "make_offer"
    | "text"
    | "product_post"
    | "reject_offer"
    | "accept_offer";
  timestamp: Date;
  message: {
    text?: string;
    name?: string;
    item?: {
      name: string;
      image: string;
      price: string;
      duration?: number;
      startDate?: string;
      endDate?: string;
      location: string;
      securityDeposit?: string;
      offerStatus?: "accepted" | "rejected" | "pending";
      id?: string;
    };
  };
}

export interface AuthUser {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  country?: string;
  email_verified: boolean;
  phone_verified?: boolean;
  image?: string;
  business_name?: string | null;
  account_type?: AccountType;
  merchant_approval_status?: MerchantApprovalStatus;
  /**
   * A merchant ticked the owner terms at sign-up (ENG-122). Not part of the
   * sign-up payload: it is sent to the terms endpoint once the account exists.
   */
  owner_terms_accepted?: boolean;
  /** The version of the owner terms the person was shown when they ticked (ENG-122). */
  owner_terms_version?: string;
  password: string;
  /**
   * Proof that the address or number being signed up was just confirmed: the token of the emailed-code check or of
   * the phone check. Kept with the rest of the sign-up and sent with `POST /api/signup/` (T-19).
   */
  proof_token?: string;
  date_of_birth?: string;
  coordinates: {
    type: string;
    coordinates: [number, number];
  };
}

/** One of a listing's specs on the product page (ENG-35). */
export interface ProductSpec {
  key: string;
  /** Already display-cased by the server: "AC type", "BEE star rating". */
  label: string;
  /** As stored; a range stays a range. Multi-value specs are a list. */
  value: string | string[];
  /** "default" specs are the main ones; "expanded" only in the full list. */
  facet: "default" | "expanded";
}

export interface BackendProduct {
  name: string;
  title: string;
  description: string;
  security_deposit: string;
  category: {
    // Optional for the same reason as on `Category`: older servers omit them.
    id?: number;
    slug?: string;
    parent: {
      id?: number;
      slug?: string;
      title: string;
      parent?: string | null;
      main_icon?: string | null;
      light_icon?: string | null;
      dark_icon?: string | null;
    };
    title: string;
    main_icon?: string | null;
    light_icon?: string | null;
    dark_icon?: string | null;
  };
  moderation_labels: string[];
  /**
   * Only the specs the listing has, in display order (ENG-35). Product page
   * only, and absent from servers built before it — read as `?? []`.
   */
  specs?: ProductSpec[];
  // Only returned on the owner-facing endpoint; public catalogue responses omit it.
  admin_approved?: boolean | null;
  /**
   * One of the six statuses (ENG-124), and why it is Flagged. Owner-facing
   * endpoint only (`/api/my/products/`): a public one never carries them,
   * because it only ever returns Live listings.
   */
  status?: ListingStatus;
  flag_reasons?: FlagReason[];
  /**
   * What the listing waits for (T-45): `first_look` while a shop's first publish is held for Renit's staff, `renit_fill` on a draft
   * whose category and details Renit has not filled yet; and the sentence to show. Null or absent: nothing, and the status's own words.
   */
  waits_for?: "first_look" | "renit_fill" | null;
  waits_for_text?: string | null;
  /**
   * A change to a live listing that waits over the version customers still see (decisions T-34, T-35): which fields,
   * and why. Owner endpoint only; null or absent when nothing waits (`readPendingEdit`).
   */
  pending_edit?: PendingEdit | null;
  /**
   * ENG-155. Units the owner has to rent out, what the item costs to replace
   * (rupees as a string, null until set), the owner's own code, and the one
   * per-product exception to the shop's delivery. Owner endpoint only for
   * `worth`, `shop_code`, `rate_needs_confirming` and `needs_worth`; `quantity`,
   * `not_delivered` and `rate_unit` are on public products too.
   */
  quantity?: number;
  worth?: string | null;
  shop_code?: string;
  not_delivered?: boolean;
  rate_unit?: "day";
  /**
   * ENG-281: the listing's prices, sorted day, week, month, and the shortest
   * booking they allow, in days. `rate` stays the day price, or else the
   * lowest price a day; absent from an older server (`plansOf` reads `rate`).
   */
  plans?: Plan[];
  min_days?: number;
  /**
   * Public products only (ENG-172): the shop behind the listing, whether it can
   * be booked now (`live_booking`) or for the next opening (`book_for_morning`),
   * and the ID check a customer needs for it. `booked` on a public product is
   * the runs of days with no unit free.
   */
  shop?: ProductShop | null;
  /**
   * ENG-284: whether the shop delivers to the address sent as
   * `?deliver_address=` (search and product detail only); null without one.
   */
  delivery?: ListingDelivery | null;
  live_booking?: boolean;
  book_for_morning?: boolean;
  id_check_needed?: "none" | "id" | "id_and_match";
  /** A moved listing's price is treated as per day until the owner saves `rate`. */
  rate_needs_confirming?: boolean;
  /** True while `worth` is null. */
  needs_worth?: boolean;
  condition: string;
  rate: string;
  currency: string;
  coordinates: {
    lat: number;
    long: number;
  };
  total_rating?: string;
  booked?: BlockedDates[];
  average_rating?: number;
  review_count?: number;
  images: string[];
  location: string;
  /** Flat/building/landmark. Owner-facing endpoints only (ENG-10 §5.2). */
  full_address?: string;
  cover_image: string;
  brand_name: string;
  model_name: string;
  usage_description: string;
  contact_number?: string;
  contact_name: string;
  blocked_dates?: {
    start_date: string;
    end_date: string;
  }[];
  products_listed?: number;
  avg_rating?: number;
  isOwnerContact?: boolean;
  distance?: string;
  owner?: {
    username: string;
    firebase_uid: string;
    first_name: string;
    last_name: string;
    image: {
      image_url: string;
      name: string;
    };
    business_name: string;
    average_rating?: number;
    number_of_products?: number;
    /** The "Verified business" badge (D-26). Search results carry only this and `username`. */
    business_verified?: boolean;
  };
}

interface BlockedDates {
  start_date: string;
  end_date: string;
}

export type NavigationUseType = NavigationProp<RootStackParamList>;

export type RouteProps<T extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  T
>;

export function useTypedNavigation() {
  return useNavigation<NavigationUseType>();
}

// Merchant verification (ENG-12). Names, enums and codes are rn-api's contract.

export type KycStatus =
  | "none"
  | "pending"
  | "action_required"
  | "in_review"
  | "verified"
  | "rejected";

export type KycReasonCode =
  // set by a reviewer on `rejected`
  | "pan_invalid"
  | "pan_name_mismatch"
  | "gstin_inactive"
  | "gstin_name_mismatch"
  | "aadhaar_signature_invalid"
  | "aadhaar_name_mismatch"
  | "duplicate_identity"
  | "business_name_unverifiable"
  | "other"
  // set by the system, and kept when the status falls back to `none`
  | "case_expired";

export type KycNextAction =
  // only `start/` and `resume/` answer with a link; it is never stored
  | { type: "digilocker"; url: string; expires_at: string }
  | { type: "resume" }
  | { type: "start" }
  | { type: "wait" };

/** Returned by all four KYC endpoints. */
export interface KycStatusResponse {
  kyc_status: KycStatus;
  case_ref: string | null;
  business_verified: boolean;
  business_verified_at: string | null;
  reason_code: KycReasonCode | null;
  /** null when verified */
  next_action: KycNextAction | null;
  updated_at: string | null;
  /** Present, as true, only when the server could not refresh and served its cached fields. */
  stale?: boolean;
}

export interface StartKycBody {
  pan: string;
  gst_declared: boolean;
  gstin?: string | null;
  consent_version: string;
  supersede?: boolean;
}

export type KycErrorCode =
  | "validation_error"
  | "pan_unverifiable"
  | "gstin_unverifiable"
  | "consent_outdated"
  | "profile_incomplete"
  | "not_merchant"
  | "case_in_progress"
  | "already_verified"
  | "erasure_pending"
  | "invalid_state"
  | "retry_limit"
  | "rate_limited"
  | "provider_unavailable"
  | "kyc_unavailable";
