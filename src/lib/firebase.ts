import { getAuthTokens } from "./auth-fns";
import { DEV_MODE, FIREBASE_TOKEN_ENDPOINT } from "./config";
import axiosInstance from "./networkUtils";
import appCheck from "@react-native-firebase/app-check";

let cachedApp: any | null | undefined;
let cachedFirestore: any | null | undefined;
let cachedStorage: any | null | undefined;
let firebaseSignIn: Promise<void> | null = null;
let firebaseAccessToken: string | null = null;
let appCheckInitialization: Promise<void> | null = null;

const initializeAppCheck = () => {
  if (!appCheckInitialization) {
    const provider = appCheck().newReactNativeFirebaseAppCheckProvider();
    provider.configure({
      android: {
        provider: __DEV__ || DEV_MODE === "QA" ? "debug" : "playIntegrity",
      },
    });
    appCheckInitialization = appCheck().initializeAppCheck({
      provider,
      isTokenAutoRefreshEnabled: true,
    });
  }

  return appCheckInitialization;
};

export const getFirebaseApp = () => {
  if (cachedApp !== undefined) {
    return cachedApp;
  }

  try {
    const { getApp } = require("@react-native-firebase/app");
    cachedApp = getApp();
  } catch (error) {
    console.error("Error initializing Firebase app:", error);
    cachedApp = null;
  }

  return cachedApp;
};

export const getFirestoreDb = () => {
  if (cachedFirestore !== undefined) {
    return cachedFirestore;
  }

  const app = getFirebaseApp();
  if (!app) {
    cachedFirestore = null;
    return cachedFirestore;
  }

  try {
    const { getFirestore } = require("@react-native-firebase/firestore");
    cachedFirestore = getFirestore(app);
  } catch (error) {
    console.error("Error initializing Firestore:", error);
    cachedFirestore = null;
  }

  return cachedFirestore;
};

export const getStorageService = () => {
  if (cachedStorage !== undefined) {
    return cachedStorage;
  }

  const app = getFirebaseApp();
  if (!app) {
    cachedStorage = null;
    return cachedStorage;
  }

  try {
    const { getStorage } = require("@react-native-firebase/storage");
    cachedStorage = getStorage(app);
  } catch (error) {
    console.error("Error initializing Firebase storage:", error);
    cachedStorage = null;
  }

  return cachedStorage;
};

export const getFirestoreModule = () =>
  require("@react-native-firebase/firestore");

const getFirebaseAuth = () => {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  const { getAuth } = require("@react-native-firebase/auth");
  return getAuth(app);
};

export const authenticateFirebase = async (accessToken: string) => {
  await initializeAppCheck();
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error("Firebase authentication is unavailable.");
  }

  if (firebaseAccessToken === accessToken && auth.currentUser) {
    return;
  }

  if (!firebaseSignIn) {
    firebaseSignIn = (async () => {
      const response = await axiosInstance.post(
        FIREBASE_TOKEN_ENDPOINT,
        undefined,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const { signInWithCustomToken } = require("@react-native-firebase/auth");
      await signInWithCustomToken(auth, response.data.token);
      firebaseAccessToken = (await getAuthTokens())?.access_token ?? accessToken;
    })().finally(() => {
      firebaseSignIn = null;
    });
  }

  return firebaseSignIn;
};

export const signOutFirebase = async () => {
  const auth = getFirebaseAuth();
  firebaseAccessToken = null;
  if (!auth?.currentUser) {
    return;
  }

  const { signOut } = require("@react-native-firebase/auth");
  await signOut(auth);
};
