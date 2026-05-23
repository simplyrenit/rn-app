import { getApp } from "@react-native-firebase/app";
import { getFirestore } from "@react-native-firebase/firestore";
import { getStorage } from "@react-native-firebase/storage";

export const GOOGLE_MAP_API_KEY = "AIzaSyC6iyQ9FoahX6rfZhXUvMQGTtXxEH_zgGA";

export const WEB_CLIENT_ID =
  "899825999056-rir4k4ci4jaeaikdftuah8l55u3mio89.apps.googleusercontent.com";

export const ANDROID_CLIENT_ID =
  "899825999056-1fbjdig0hm74912abpkaba6gcv5d4788.apps.googleusercontent.com";

export const IOS_CLIENT_ID =
  "899825999056-e571k4p5f0tni5n0cv542otq9n274l80.apps.googleusercontent.com";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAtrkbSaWrU4w4rTTSunaj25opQO8sDD_c",
  authDomain: "rn-api-35b38.firebaseapp.com",
  projectId: "rn-api-35b38",
  storageBucket: "rn-api-35b38.appspot.com",
  messagingSenderId: "639298619246",
  appId: "1:639298619246:web:bebe42342d569785c7237f",
  measurementId: "G-P7DWR065WK",
};

type AppEnv = "DEV" | "QA" | "PROD";
type RuntimeConfig = {
  apiBaseUrl: string;
  wsBaseUrl: string;
};

const RUNTIME_CONFIGS: Record<AppEnv, RuntimeConfig> = {
  DEV: {
    apiBaseUrl: "http://10.0.2.2:8000/api/",
    wsBaseUrl: "ws://10.0.2.2:8000/ws/chat/",
  },
  QA: {
    apiBaseUrl: "https://rennit.toratora.site/api/",
    wsBaseUrl: "wss://rennit.toratora.site/ws/chat/",
  },
  PROD: {
    apiBaseUrl: "https://api.simplyrenit.com/api/",
    wsBaseUrl: "wss://api.simplyrenit.com/ws/chat/",
  },
};

// Release builds should never default to a local LAN URL.
const FALLBACK_ENV: AppEnv = __DEV__ ? "QA" : "PROD";
const APP_ENV_FROM_ENV = (
  ((process.env as Record<string, string | undefined>)["EXPO_PUBLIC_APP_ENV"] || "")
).toUpperCase();
export const DEV_MODE: AppEnv =
  APP_ENV_FROM_ENV === "DEV" || APP_ENV_FROM_ENV === "QA" || APP_ENV_FROM_ENV === "PROD"
    ? (APP_ENV_FROM_ENV as AppEnv)
    : FALLBACK_ENV;

const runtimeConfig = RUNTIME_CONFIGS[DEV_MODE];
export const SERVERURL = runtimeConfig.apiBaseUrl;
export const SOCKET_URL = runtimeConfig.wsBaseUrl;

export const GET_TOP_EXPERIENCE = SERVERURL + "top-experiences/";

export const GET_TOP_PICKS = SERVERURL + "top-rated-experiences/";

export const GET_POPULAR_PRODUCTS_NEAR_YOU =
  SERVERURL + "popular-products-in-area/";

export const GET_FAVORITES = SERVERURL + "favorites/";

export const GET_CATEGORIES = SERVERURL + "category/";

export const OTP = SERVERURL + "otp/";

export const SIGN_UP = SERVERURL + "signup/";

export const LOGIN = SERVERURL + "login/";

export const POST_MY_PRODUCTS = SERVERURL + "my/products/";

export const GENERATE_SIGNED_URLS = SERVERURL + "generate-presigned-urls/";

export const GOOGLE_SIGN_IN_ENDPOINT = SERVERURL + "google-login/";

export const APPLE_SIGN_IN_ENDPOINT = SERVERURL + "apple-login/";

export const MY_PRODUCTS_ENDPOINT = SERVERURL + "my/products/";

export const REPORT_PROBLEM_ENDPOINT = SERVERURL + "platform-feedback/";

export const MY_PRODUCT_DETAILS_ENDPOINT = SERVERURL + "my/products/";

export const MY_DETAILS_ENDPOINT = SERVERURL + "users/me/";
export const REQUEST_MERCHANT_REVIEW_ENDPOINT =
  SERVERURL + "users/me/request-merchant-review/";

export const UPDATE_MY_DETAILS_ENDPOINT = SERVERURL + "users/";

export const DELETE_MY_ACCOUNT_ENDPOINT = SERVERURL + "users/";

export const NOTIFICATIONS_ENDPOINT = SERVERURL + "notification/";

export const ALL_PRODUCTS = SERVERURL + "product-title/";

export const SEARCH_PRODUCTS = SERVERURL + "search/";

export const GET_PRODUCT_DETAILS = SERVERURL + "products/";

export const OWNER_DETAILS = SERVERURL + "users/";

export const REVIEW_STATS = SERVERURL + "product-review-stats/";

export const GET_REVIEWS = SERVERURL + "product-review/";

export const SIMILAR_PRODUCTS = SERVERURL + "similar-products/";

export const PRODUCTS_BY_OWNER = SERVERURL + "products/by-owner/";

export const OWNER_REVIEWS = SERVERURL + "owner-ratings/reviews/";

export const AVAILABILITY = SERVERURL + "availability/";

export const WRITE_REVIEW = SERVERURL + "write-review/";

export const GET_REFRESH_TOKEN = SERVERURL + 'token/refresh/';

let app, firestore, storage;

try {
  app = getApp();
  firestore = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.error("Error initializing Firebase services:", error);
}

export { app, firestore, storage };
