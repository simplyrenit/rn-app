let cachedApp: any | null | undefined;
let cachedFirestore: any | null | undefined;
let cachedStorage: any | null | undefined;

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
