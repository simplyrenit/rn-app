import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
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

SplashScreen.preventAutoHideAsync();

export default function App() {
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
        className={`${
          text2 === "success" ? "bg-brand-blue" : "bg-red-500"
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
