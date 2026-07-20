import AsyncStorage from "@react-native-async-storage/async-storage";
import { SERVERURL } from "./config";
import { AuthTokens } from "./types";

const AUTH_TOKENS_KEY = `renitTokens:${SERVERURL}`;

export const setAuthTokens = async (tokens: AuthTokens) => {
  try {
    await AsyncStorage.setItem(AUTH_TOKENS_KEY, JSON.stringify(tokens));
  } catch (error) {
    console.error("Error setting auth tokens:", error);
  }
};

export const getAuthTokens = async (): Promise<AuthTokens | null> => {
  try {
    const tokens = await AsyncStorage.getItem(AUTH_TOKENS_KEY);
    return tokens ? JSON.parse(tokens) : null;
  } catch (error) {
    console.error("Error getting auth tokens:", error);
    return null;
  }
};

export const removeAuthTokens = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_TOKENS_KEY);
  } catch (error) {
    console.error("Error removing auth tokens:", error);
  }
};

export const setHasSeenWelcome = async (value: boolean) => {
  try {
    await AsyncStorage.setItem("hasSeenWelcome", JSON.stringify(value));
  } catch (error) {
    console.error("Error setting hasSeenWelcome:", error);
  }
};

export const getHasSeenWelcome = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem("hasSeenWelcome");
    return value ? JSON.parse(value) : false;
  } catch (error) {
    console.error("Error getting hasSeenWelcome:", error);
    return false;
  }
};
