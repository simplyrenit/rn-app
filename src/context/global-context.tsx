import { cancelMyDetailsRequest, fetchMyDetailsRequest } from "@/lib/my-details";
import {
  getAuthTokens,
  getHasSeenWelcome,
  removeAuthTokens,
  setAuthTokens as sA,
  setHasSeenWelcome as sH,
} from "@/lib/auth-fns";
import {
  GET_CATEGORIES,
  MY_DETAILS_ENDPOINT,
} from "@/lib/config";
import { authenticateFirebase, signOutFirebase } from "@/lib/firebase";
import axiosInstance, {
  resetSessionExpiryNotice,
  setSessionExpiredHandler,
} from "@/lib/networkUtils";
import {
  AccountType,
  AuthTokens,
  Category,
  MerchantApprovalStatus,
} from "@/lib/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useColorScheme } from "react-native";

import { toast } from "@/lib/toast";

interface GlobalContextType {
  authTokens: AuthTokens | null;
  setAuthTokens: (tokens: AuthTokens | null) => void;
  loading: boolean;
  isAuthenticated: boolean | undefined;
  hasSeenWelcome: boolean;
  setHasSeenWelcome: (value: boolean) => void;
  logout: () => Promise<void>;
  isReportModalVisible: boolean;
  showReportModal: () => void;
  hideReportModal: () => void;
  theme: string;
  setTheme: (theme: string) => void;
  themePreference: string;
  categories: Category[];
  fetchCategories: () => Promise<void>;
  userData: UserData | null;
  updateUserData: (data: Partial<UserData>) => void;
  saveUserDataToStorage: () => Promise<void>;
  loadUserDataFromStorage: () => Promise<void>;
  userDetails: UserDetails | null;
  fetchUserDetails: () => Promise<void>;
}

interface UserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  latitude?: number;
  longitude?: number;
}

interface UserDetails {
  username: string;
  firebase_uid: string;
  name: string;
  email: string;
  phone: string;
  image: string;
  business_name: string | null;
  account_type: AccountType;
  merchant_approval_status: MerchantApprovalStatus;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [authTokens, setAuthTokensState] = useState<AuthTokens | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<undefined | boolean>(undefined);
  const [hasSeenWelcome, setHasSeenWelcomeState] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<string>("device");
  const [categories, setCategories] = useState<Category[]>([]);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);

  const [userData, setUserData] = useState<UserData | null>(null);

  const logout = useCallback(async () => {
    cancelMyDetailsRequest();
    try {
      await signOutFirebase();
    } catch (error) {
      console.warn("Unable to sign out of Firebase:", error);
    }
    await removeAuthTokens();
    delete axiosInstance.defaults.headers.Authorization;
    setAuthTokensState(null);
    setIsAuthenticated(false);
    setHasSeenWelcome(false);
    await AsyncStorage.removeItem("userData");
    setUserData(null);
    setUserDetails(null);
  }, []);

  // The axios interceptor cannot reach this context, so hand it the logout it
  // should run when the server rejects a refresh token. Without this the stale
  // tokens stayed in storage: the app still looked signed in while every
  // authenticated request failed, with no way back to the sign-in screen.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      toast.error("Your session expired. Please sign in again.");
      void logout();
    });

    return () => setSessionExpiredHandler(null);
  }, [logout]);

  useEffect(() => {
    fetchUserDetails();
  }, [authTokens?.access_token, isAuthenticated]);

  const fetchUserDetails = async () => {
    if (!isAuthenticated || !authTokens?.access_token) {
      setUserDetails(null);
      return;
    }

    try {
      const details = await getMyDetails();
      setUserDetails({
        username: details.username,
        firebase_uid: details.firebase_uid,
        name: `${details.first_name} ${details.last_name}`,
        email: details.email,
        phone: details.phone || "",
        image: details.image?.image_url || "",
        business_name: details.business_name,
        account_type: details.account_type,
        merchant_approval_status: details.merchant_approval_status,
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await logout();
        return;
      }
      if (!(axios.isAxiosError(error) && !error.response)) {
        console.error("Failed to fetch user details:", error);
      }
    }
  };

  async function getMyDetails() {
    try {
      return await fetchMyDetailsRequest();
    } catch (error) {
      if (
        !(axios.isAxiosError(error) &&
          (error.response?.status === 401 || !error.response))
      ) {
        console.error("Error getting user details:", error);
      }
      throw error;
    }
  }

  const updateUserData = (data: Partial<UserData>) => {
    setUserData((prevData) => ({ ...prevData, ...data }));
  };

  const saveUserDataToStorage = async () => {
    try {
      await AsyncStorage.setItem("authToken", JSON.stringify(userData));
    } catch (error) {
      console.error("Failed to save data", error);
    }
  };

  useEffect(() => {
    const getStoredTheme = async () => {
      const storedTheme = await AsyncStorage.getItem("themePreference");
      if (storedTheme) {
        setTheme(storedTheme);
      }
    };
    getStoredTheme();
  }, []);

  const appliedTheme = theme === "device" ? systemColorScheme : theme;
  const updateTheme = async (newTheme: string) => {
    setTheme(newTheme);
    await AsyncStorage.setItem("themePreference", newTheme);
  };

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axiosInstance.get(GET_CATEGORIES);
      setCategories(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        console.log("Categories unavailable while offline");
        return;
      }
      console.error("Failed to fetch categories:", error);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        const [tokens, seenWelcome] = await Promise.all([
          getAuthTokens(),
          getHasSeenWelcome(),
        ]);

        if (tokens) {
          axiosInstance.defaults.headers.Authorization = `Bearer ${tokens.access_token}`;
          try {
            const details = await getMyDetails();
            const currentTokens = (await getAuthTokens()) ?? tokens;
            setAuthTokensState(currentTokens);
            axiosInstance.defaults.headers.Authorization = `Bearer ${currentTokens.access_token}`;
            setUserDetails({
              username: details.username,
              firebase_uid: details.firebase_uid,
              name: `${details.first_name} ${details.last_name}`,
              email: details.email,
              phone: details.phone || "",
              image: details.image?.image_url || "",
              business_name: details.business_name,
              account_type: details.account_type,
              merchant_approval_status: details.merchant_approval_status,
            });
            setIsAuthenticated(true);
            authenticateFirebase(currentTokens.access_token).catch((error) =>
              console.warn("Unable to authenticate Firebase:", error)
            );
          } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 401) {
              await logout();
            } else {
              setAuthTokensState(tokens);
              setIsAuthenticated(true);
            }
          }
        } else {
          delete axiosInstance.defaults.headers.Authorization;
          setIsAuthenticated(false);
        }
        setHasSeenWelcomeState(seenWelcome);
      } catch (error) {
        console.error("Error initializing app:", error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
    fetchCategories();
  }, [fetchCategories]);

  const setAuthTokens = useCallback(async (tokens: AuthTokens | null) => {
    if (tokens) {
      await sA(tokens);
      resetSessionExpiryNotice();

      setAuthTokensState(tokens);
      axiosInstance.defaults.headers.Authorization = `Bearer ${tokens.access_token}`;
      setIsAuthenticated(true);
      authenticateFirebase(tokens.access_token).catch((error) =>
        console.warn("Unable to authenticate Firebase:", error)
      );
    } else {
      cancelMyDetailsRequest();
      try {
        await signOutFirebase();
      } catch (error) {
        console.warn("Unable to sign out of Firebase:", error);
      }
      await removeAuthTokens();
      delete axiosInstance.defaults.headers.Authorization;
      setAuthTokensState(null);
      setIsAuthenticated(false);
    }
  }, []);

  const setHasSeenWelcome = useCallback(async (value: boolean) => {
    await sH(value);
    setHasSeenWelcomeState(value);
  }, []);

  const showReportModal = () => setIsReportModalVisible(true);
  const hideReportModal = () => setIsReportModalVisible(false);

  const loadUserDataFromStorage = async () => {
    try {
      const data = await AsyncStorage.getItem("authToken");
      if (data) {
        setUserData(JSON.parse(data));
      }
    } catch (error) {
      console.error("Failed to load data", error);
    }
  };

  useEffect(() => {
    loadUserDataFromStorage();
  }, []);

  const value: GlobalContextType = {
    authTokens,
    setAuthTokens,
    loading,
    isAuthenticated,
    hasSeenWelcome,
    setHasSeenWelcome,
    logout,
    showReportModal,
    hideReportModal,
    isReportModalVisible,
    theme: appliedTheme!,
    setTheme: updateTheme,
    categories,
    fetchCategories,
    userData,
    updateUserData,
    saveUserDataToStorage,
    loadUserDataFromStorage,
    userDetails,
    fetchUserDetails,
    themePreference: theme,
  };

  return (
    <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>
  );
};

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
};
