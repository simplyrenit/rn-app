import React, { useEffect } from "react";
import { Alert, LogBox, StyleSheet, View } from "react-native";
import { GlobalProvider } from "@/context/global-context";
import { ProductProvider } from "@/context/product-context";
import Navigation from "@/navigation/nav";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { AutocompleteDropdownContextProvider } from "react-native-autocomplete-dropdown";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { CheckIcon, XMarkIcon } from "react-native-heroicons/outline";
import Toast from "react-native-toast-message";
import { Text } from "@/components/core";
import "react-native-get-random-values";
import {
  setupNotifications,
  registerForPushNotificationsAsync,
} from "@/backend/notifications";
import { AuthProvider } from "@/context/auth-context";
import { QueryClient, QueryClientProvider } from "react-query";
// import firebase from "@react-native-firebase/app";
import { FIREBASE_CONFIG, WEB_CLIENT_ID, IOS_CLIENT_ID } from "@/lib/config";
import { testApiConnection } from "@/lib/apiTest";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

// Initialize Firebase
// if (!firebase.apps.length) {
//   firebase.initializeApp(FIREBASE_CONFIG);
// }

// import { initializeApp, getApps } from "firebase/app";
// import { getAuth } from "firebase/auth";

// const firebaseConfig = {
//   apiKey: "YOUR_API_KEY",
//   authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
//   projectId: "YOUR_PROJECT_ID",
//   storageBucket: "YOUR_PROJECT_ID.appspot.com",
//   messagingSenderId: "YOUR_SENDER_ID",
//   appId: "YOUR_APP_ID",
//   measurementId: "YOUR_MEASUREMENT_ID"
// };

// // Ensure Firebase is not re-initialized multiple times
// const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];


GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID, // client ID of type WEB for your server. Required to get the `idToken` on the user object, and for offline access.
  // scopes: ["https://www.googleapis.com/auth/drive.readonly"], // what API you want to access on behalf of the user, default is email and profile
  offlineAccess: true, // if you want to access Google API on behalf of the user FROM YOUR SERVER
  // forceCodeForRefreshToken: true, // [Android] related to `serverAuthCode`, read the docs link below *.
  iosClientId: IOS_CLIENT_ID, // [iOS] if you want to specify the client ID of type iOS (otherwise, it is taken from GoogleService-Info.plist)
});

SplashScreen.preventAutoHideAsync();

export default function App() {
  <Text>Hi This is Vishwas dummy text</Text>

  const [loaded, error] = useFonts({
    "PlusJakartaSans-Regular": require("./assets/fonts/PlusJakartaSans-Regular.ttf"),
    "PlusJakartaSans-Light": require("./assets/fonts/PlusJakartaSans-Light.ttf"),
    "PlusJakartaSans-Medium": require("./assets/fonts/PlusJakartaSans-Medium.ttf"),
    "PlusJakartaSans-SemiBold": require("./assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "PlusJakartaSans-Bold": require("./assets/fonts/PlusJakartaSans-Bold.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    const initializeNotifications = async () => {
      await setupNotifications();
      await registerForPushNotificationsAsync();
    };

    initializeNotifications();
  }, []);

  useEffect(() => {
    const testApi = async () => {
      const isApiWorking = await testApiConnection();
      console.log("API working:", isApiWorking);
    };

    testApi();
  }, []);

  if (!loaded) {
    return null;
  }

  const qc = new QueryClient();

  return (
    <QueryClientProvider client={qc}>
      <GlobalProvider>
        <AuthProvider>
          <ProductProvider>
            <AutocompleteDropdownContextProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <BottomSheetModalProvider>
                  <Navigation />
                  {/* @ts-ignore */}
                  <Toast config={toastConfig} />
                </BottomSheetModalProvider>
              </GestureHandlerRootView>
            </AutocompleteDropdownContextProvider>
          </ProductProvider>
        </AuthProvider>
      </GlobalProvider>
    </QueryClientProvider>
  );
}

const toastConfig = {
  customToast: ({ text1, text2 }: { text1: string; text2?: string }) => (
    <View style={styles.customToast}>
      <View
        className={`${text2 === "success" ? "bg-brand-blue" : "bg-red-500"
          } rounded-lg p-2`}
      >
        {text2 === "success" ? (
          <CheckIcon
            size={24}
            color="#fff"
          />
        ) : (
          <XMarkIcon
            size={24}
            color="#fff"
          />
        )}
      </View>
      <Text
        fontSize="text-base"
        fontWeight="font-bold"
        className="ml-2 text-black"
      >
        {text1}
      </Text>
    </View>
  ),
};

const styles = StyleSheet.create({
  customToast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDEDFC",
    padding: 10,
    borderRadius: 10,
    borderColor: "#CAC8F7",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    width: "90%",
    marginBottom: 100,
  },
  toastText: {
    fontSize: 16,
    color: "#0073e6",
    fontWeight: "500",
    marginLeft: 8,
  },
});

LogBox.ignoreAllLogs();