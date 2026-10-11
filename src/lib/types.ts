import {
  NavigationProp,
  RouteProp,
  useNavigation,
} from "@react-navigation/native";
import { DimensionValue, FlexAlignType, ImageSourcePropType } from "react-native";
import type { SavedAddress } from "@/lib/addresses";
import type { BookItem, DeliveryMode, ProductShop } from "@/lib/booking";
import type { FlagReason, ListingStatus } from "@/lib/listing-status";

export interface OTPResponse {
  access: string | null;
  refresh: string | null;
  is_verified: boolean;
  message: string;
}

export interface PhoneVerificationResponse {
  onboarding_required?: boolean;
  phone?: string;
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
  price: string;
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
  EditCategory: { name: string };
  EditSubCategories: {
    category: string;
    subcategories?: Subcategory[];
    name: string;
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
  ListSubmitted: { productName: string; coverUrl?: string | null };
  OwnersProducts: { products: BackendProduct[]; name: string };
  /** The owner's bank account: add, verify, change (ENG-135). */
  BankAccount: undefined;
  /** The owner's hours, Open switch, notice and delivery (ENG-146). */
  RentalSettings: undefined;
  RentalHours: undefined;
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
  };
  /**
   * One booking at whatever stage the server says it is in. `pay` opens the pay
   * page for the ₹99 on arrival: set only by Book now, a moment after the tap.
   */
  Booking: { number: string; pay?: boolean };
  /** BK-07: picks the first arrival window, or asks to change the one that is set. */
  BookingWindow: { number: string };
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
  business_name?: string;
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
   * Public products only (ENG-172): the shop behind the listing, whether it can
   * be booked now (`live_booking`) or for the next opening (`book_for_morning`),
   * and the ID check a customer needs for it. `booked` on a public product is
   * the runs of days with no unit free.
   */
  shop?: ProductShop | null;
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
