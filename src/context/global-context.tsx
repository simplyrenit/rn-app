// import { MyDetails } from "@/backend/profile";
// import {
//   getAuthTokens,
//   getHasSeenWelcome,
//   removeAuthTokens,
//   setAuthTokens as sA,
//   setHasSeenWelcome as sH,
// } from "@/lib/auth-fns";
// import {
//   ACCESS_TOKEN,
//   GET_CATEGORIES,
//   MY_DETAILS_ENDPOINT,
// } from "@/lib/config";
// import axiosInstance from "@/lib/networkUtils";
// import { AuthTokens, Category } from "@/lib/types";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import axios from "axios";
// import React, {
//   createContext,
//   useCallback,
//   useContext,
//   useEffect,
//   useState,
// } from "react";
// import { useColorScheme } from "react-native";
//
// interface GlobalContextType {
//   authTokens: AuthTokens | null;
//   setAuthTokens: (tokens: AuthTokens | null) => void;
//   loading: boolean;
//   isAuthenticated: boolean | undefined;
//   hasSeenWelcome: boolean;
//   setHasSeenWelcome: (value: boolean) => void;
//   logout: () => Promise<void>;
//   isReportModalVisible: boolean;
//   showReportModal: () => void;
//   hideReportModal: () => void;
//   theme: string;
//   setTheme: (theme: string) => void;
//   themePreference: string;
//   categories: Category[];
//   fetchCategories: () => Promise<void>;
//   userData: UserData | null;
//   updateUserData: (data: Partial<UserData>) => void;
//   saveUserDataToStorage: () => Promise<void>;
//   loadUserDataFromStorage: () => Promise<void>;
//   userDetails: UserDetails | null;
//   fetchUserDetails: () => Promise<void>;
// }
//
// interface UserData {
//   email?: string;
//   firstName?: string;
//   lastName?: string;
//   latitude?: number;
//   longitude?: number;
// }
//
// interface UserDetails {
//   username: string;
//   name: string;
//   email: string;
//   phone: string;
//   image: string;
// }
//
// const GlobalContext = createContext<GlobalContextType | undefined>(undefined);
//
// export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({
//   children,
// }) => {
//   const [authTokens, setAuthTokensState] = useState<AuthTokens | null>(null);
//   const [loading, setLoading] = useState(true);
// //   const [isAuthenticated, setIsAuthenticated] = useState<undefined | boolean>(undefined);
//     const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
//
//   const [hasSeenWelcome, setHasSeenWelcomeState] = useState(false);
//   const [isReportModalVisible, setIsReportModalVisible] = useState(false);
//   const systemColorScheme = useColorScheme();
//   const [theme, setTheme] = useState<string>("device");
//   const [categories, setCategories] = useState<Category[]>([]);
//   const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
//
//   const [userData, setUserData] = useState<UserData | null>(null);
//
//   useEffect(() => {
//     fetchUserDetails();
//   }, [isAuthenticated]);
//
//   const fetchUserDetails = async () => {
//     if (isAuthenticated) {
//       try {
//         const details = await getMyDetails();
//         setUserDetails({
//           username: details.username,
//           name: `${details.first_name} ${details.last_name}`,
//           email: details.email,
//           phone: details.phone || "",
//           image: details.image?.image_url || "",
//         });
//       } catch (error) {
//         console.error("Failed to fetch user details:", error);
//       }
//     }
//   };
//
//   async function getMyDetails() {
//     try {
//       const response = await axiosInstance.get<MyDetails>(MY_DETAILS_ENDPOINT);
//
//       return response.data;
//     } catch (error) {
//       console.error("Error getting user details:", error);
//       throw error;
//     }
//   }
//
//   useEffect(() => {
//     const initialize = async () => {
//       try {
//         const tokens = await getAuthTokens();
//         if (tokens) {
//           setAuthTokensState(tokens);
//           axiosInstance.defaults.headers.Authorization = `Bearer ${tokens.access_token}`;
//           setIsAuthenticated(true);
//         } else {
//           setIsAuthenticated(false);
//         }
//       } catch (error) {
//         console.error("Error fetching auth tokens:", error);
//         setIsAuthenticated(false); // Ensure app doesn't hang
//       } finally {
//         setLoading(false); // Set loading to false once check is done
//       }
//     };
//     initialize();
//   }, []);
//
//
//   const updateUserData = (data: Partial<UserData>) => {
//     setUserData((prevData) => ({ ...prevData, ...data }));
//   };
//
//   const saveUserDataToStorage = async () => {
//     try {
//       await AsyncStorage.setItem("authToken", JSON.stringify(userData));
//     } catch (error) {
//       console.error("Failed to save data", error);
//     }
//   };
//
//   useEffect(() => {
//     const getStoredTheme = async () => {
//       const storedTheme = await AsyncStorage.getItem("themePreference");
//       if (storedTheme) {
//         setTheme(storedTheme);
//       }
//     };
//     getStoredTheme();
//   }, []);
//
//   const appliedTheme = theme === "device" ? systemColorScheme : theme;
//   const updateTheme = async (newTheme: string) => {
//     setTheme(newTheme);
//     await AsyncStorage.setItem("themePreference", newTheme);
//   };
//
//   const fetchCategories = useCallback(async () => {
//     try {
//       const response = await axiosInstance.get(GET_CATEGORIES, {
//         headers: {
//           Authorization: `Bearer ${ACCESS_TOKEN}`,
//           "Content-Type": "application/json",
//         },
//       });
//       setCategories(response.data);
//     } catch (error) {
//       console.error("Failed to fetch categories:", error);
//     }
//   }, []);
//
//   useEffect(() => {
//     const initialize = async () => {
//       try {
//         const [tokens, seenWelcome] = await Promise.all([
//           getAuthTokens(),
//           getHasSeenWelcome(),
//         ]);
//
//         if (tokens) {
//           console.log('### here tokens', tokens);
//           setAuthTokensState(tokens);
//           axiosInstance.defaults.headers.Authorization = `Bearer ${tokens.access_token}`;
//           setIsAuthenticated(true);
//         } else {
//           setIsAuthenticated(false);
//         }
//         setHasSeenWelcomeState(seenWelcome);
//       } catch (error) {
//         console.error("Error initializing app:", error);
//       } finally {
//         setLoading(false);
//       }
//     };
//
//     initialize();
//     fetchCategories();
//   }, [fetchCategories]);
//
//   const setAuthTokens = useCallback(async (tokens: AuthTokens | null) => {
//     if (tokens) {
//       await sA(tokens);
//
//       setAuthTokensState(tokens);
//       setIsAuthenticated(true);
//     } else {
//       await removeAuthTokens();
//       setAuthTokensState(null);
//       setIsAuthenticated(false);
//     }
//   }, []);
//
//   const setHasSeenWelcome = useCallback(async (value: boolean) => {
//     await sH(value);
//     setHasSeenWelcomeState(value);
//   }, []);
//
//   const logout = useCallback(async () => {
//     await removeAuthTokens();
//     setAuthTokensState(null);
//     setIsAuthenticated(false);
//     setHasSeenWelcome(false);
//     await AsyncStorage.removeItem("userData");
//     setUserData(null);
//     setUserDetails(null);
//   }, []);
//
//   const showReportModal = () => setIsReportModalVisible(true);
//   const hideReportModal = () => setIsReportModalVisible(false);
//
//   const loadUserDataFromStorage = async () => {
//     try {
//       const data = await AsyncStorage.getItem("authToken");
//       if (data) {
//         setUserData(JSON.parse(data));
//       }
//     } catch (error) {
//       console.error("Failed to load data", error);
//     }
//   };
//
//   useEffect(() => {
//     loadUserDataFromStorage();
//   }, []);
//
//   const value: GlobalContextType = {
//     authTokens,
//     setAuthTokens,
//     loading,
//     isAuthenticated,
//     hasSeenWelcome,
//     setHasSeenWelcome,
//     logout,
//     showReportModal,
//     hideReportModal,
//     isReportModalVisible,
//     theme: appliedTheme!,
//     setTheme: updateTheme,
//     categories,
//     fetchCategories,
//     userData,
//     updateUserData,
//     saveUserDataToStorage,
//     loadUserDataFromStorage,
//     userDetails,
//     fetchUserDetails,
//     themePreference: theme,
//   };
//
//   return (
//     <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>
//   );
// };
//
// export const useGlobalContext = () => {
//   const context = useContext(GlobalContext);
//   if (context === undefined) {
//     throw new Error("useGlobalContext must be used within a GlobalProvider");
//   }
//   return context;
// };

import { MyDetails } from "@/backend/profile";
import {
  getAuthTokens,
  getHasSeenWelcome,
  removeAuthTokens,
  setAuthTokens as sA,
  setHasSeenWelcome as sH,
} from "@/lib/auth-fns";
import {
  ACCESS_TOKEN,
  GET_CATEGORIES,
  MY_DETAILS_ENDPOINT,
} from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { AuthTokens, Category } from "@/lib/types";
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

interface GlobalContextType {
  authTokens: AuthTokens | null;
  setAuthTokens: (tokens: AuthTokens | null) => void;
  loading: boolean;
  isAuthenticated: boolean;
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
  name: string;
  email: string;
  phone: string;
  image: string;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [authTokens, setAuthTokensState] = useState<AuthTokens | null>(null);
  const [loading, setLoading] = useState(true);
  // Initialize isAuthenticated as false instead of undefined
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [hasSeenWelcome, setHasSeenWelcomeState] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<string>("device");
  const [categories, setCategories] = useState<Category[]>([]);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  // Fetch user details whenever authentication changes
  useEffect(() => {
    fetchUserDetails();
  }, [authTokens]);

  const fetchUserDetails = async () => {
    if (isAuthenticated) {
      try {
        const details = await getMyDetails();
        setUserDetails({
          username: details.username,
          name: `${details.first_name} ${details.last_name}`,
          email: details.email,
          phone: details.phone || "",
          image: details.image?.image_url || "",
          //dob: details.dob
        });
      } catch (error) {
        console.error("Failed to fetch user details:", error);
      }
    }
  };

  async function getMyDetails() {
    try {
      const response = await axiosInstance.get<MyDetails>(MY_DETAILS_ENDPOINT);
      return response.data;
    } catch (error) {
      console.error("Error getting user details:", error);
      console.log(isAuthenticated);
      setIsAuthenticated(false);
      console.log(isAuthenticated);
      throw error;
    }
  }

//     useEffect(() => {
//       if (!authTokens) {
//         console.log("Waiting for authTokens to be set...");
//         return;
//       }
//       getMyDetails(access_token);
//     }, [authTokens]); // Runs when authTokens change

  // Initialization: fetch auth tokens and welcome flag in one effect
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        const [tokens, seenWelcome] = await Promise.all([
          getAuthTokens(),
          getHasSeenWelcome(),
        ]);

        if (tokens) {
          console.log("### here tokens", tokens);
          setAuthTokensState(tokens);
          axiosInstance.defaults.headers.Authorization = `Bearer ${tokens.access_token}`;
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
        setHasSeenWelcomeState(seenWelcome);
      } catch (error) {
        console.error("Error initializing app:", error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);

      }
    };
    //fetchUserDetails();
    initialize();
  }, []);

  // Separate effect for fetching categories
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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
      const response = await axiosInstance.get(GET_CATEGORIES, {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      });
      setCategories(response.data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  }, []);

  const setAuthTokens = useCallback(async (tokens: AuthTokens | null) => {
    if (tokens) {
      await sA(tokens);
      setAuthTokensState(tokens);
      setIsAuthenticated(true);
    } else {
      await removeAuthTokens();
      setAuthTokensState(null);
      setIsAuthenticated(false);
    }
  }, []);

  const setHasSeenWelcome = useCallback(async (value: boolean) => {
    await sH(value);
    setHasSeenWelcomeState(value);
  }, []);

  const logout = useCallback(async () => {
    await removeAuthTokens();
    setAuthTokensState(null);
    setIsAuthenticated(false);
    setHasSeenWelcome(false);
    await AsyncStorage.removeItem("userData");
    setUserData(null);
    setUserDetails(null);
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
