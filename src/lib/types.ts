import {
  NavigationProp,
  RouteProp,
  useNavigation,
} from "@react-navigation/native";
import { DimensionValue, FlexAlignType, ImageSourcePropType } from "react-native";

export interface OTPResponse {
  access: string | null;
  refresh: string | null;
  is_verified: boolean;
  message: string;
}

export interface CategoryItem {
  name: string;
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
  moderationLabels?: string[];
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
    email: string;
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
    email: string;
    first_name: string;
    last_name: string;
    image: string;
  };
  rating: number;
  reviewer: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    image: string;
  };
  updated_at: string;
}

export interface Product {
  category: CategoryType;
  subcategory: CategoryType;
  name: string;
  brandName: string;
  modelName: string;
  condition: "Excellent" | "Good" | "Bad" | "";
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
  Verify: { email: string; verificationType: "otp" | "password" };
  ProductDetail: { id: string; isFavorite?: boolean };
  ReviewsScreen: {
    reviews: BackendReview[];
    product: BackendProduct;
    owner: {
      username: string;
      email: string;
      first_name: string;
      last_name: string;
    };
  };
  WriteReviews: {
    product: BackendProduct;
    owner: {
      username: string;
      email: string;
      first_name: string;
      last_name: string;
    };
  };
  Welcome: undefined;
  MainTabs: undefined;
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
    range: { startDate: Date | undefined; endDate: Date | undefined };
    address: string;
    coords: { lat: number | undefined; lng: number | undefined };
    products: BackendProduct[];
    category?: string;
  };
  myProducts: undefined;
  editProduct: { id: string };
  PostSubCategories: { category: string; subcategories?: Subcategory[] };
  ChooseCoverImage: { images: string[] };
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
  };
  HangTight: undefined;
  [key: string]: object | undefined;
};

export interface Subcategory {
  dark_icon: string | null;
  light_icon: string | null;
  main_icon: string;
  order_id: number;
  title: string;
}

export interface Category {
  dark_icon: string | null;
  light_icon: string | null;
  main_icon: string;
  order_id: number;
  title: string;
  subcategories: Subcategory[];
}

export interface UserDetails {
  userId: string;
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
  participants: UserDetails[];
  initialParticipants: UserDetails[];
  readStatus: ReadStatus[];
  readCount: ReadCount[];
  blockStatus: BlockStatus;
  startedBy: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

export interface Message {
  id?: string;
  conversationId: string;
  from: string;
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
  password: string;
  date_of_birth?: string;
  coordinates: {
    type: string;
    coordinates: [number, number];
  };
}

export interface BackendProduct {
  name: string;
  title: string;
  description: string;
  security_deposit: string;
  category: {
    parent: {
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
  isOwnerContact?: boolean;
  distance?: string;
  owner?: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    country: string;
    image: {
      image_url: string;
      name: string;
    };
    address: string[];
    business_name: string;
    coordinates: {
      lat: number;
      long: number;
    };
    average_rating: number;
    number_of_products: number;
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
