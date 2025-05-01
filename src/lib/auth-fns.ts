import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthTokens } from "./types";

export const setAuthTokens = async (tokens: AuthTokens) => {
  try {
    await AsyncStorage.setItem("renitTokens", JSON.stringify(tokens));
  } catch (error) {
    console.error("Error setting auth tokens:", error);
  }
};

export const getAuthTokens = async (): Promise<AuthTokens | null> => {
  try {
    const tokens = await AsyncStorage.getItem("renitTokens");
    return tokens ? JSON.parse(tokens) : null;
  } catch (error) {
    console.error("Error getting auth tokens:", error);
    return null;
  }
};

export const removeAuthTokens = async () => {
  try {
    await AsyncStorage.removeItem("renitTokens");
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
