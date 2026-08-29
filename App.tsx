import "react-native-gesture-handler";
import "react-native-reanimated";
import React, { useEffect } from "react";
import { View } from "react-native";
import { GlobalProvider } from "@/context/global-context";
import { ProductProvider } from "@/context/product-context";
import Navigation from "@/navigation/nav";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { AutocompleteDropdownContextProvider } from "react-native-autocomplete-dropdown";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { ToastBody } from "@/components/core/toast";
import "react-native-get-random-values";
import { AuthProvider } from "@/context/auth-context";
import { QueryClient, QueryClientProvider } from "react-query";
import { IOS_CLIENT_ID, WEB_CLIENT_ID } from "@/lib/config";
import { GoogleSignin } from "@react-native-google-signin/google-signin";


GoogleSignin.configure({
  iosClientId: IOS_CLIENT_ID,
  ...(WEB_CLIENT_ID && {
    webClientId: WEB_CLIENT_ID,
    offlineAccess: true,
  }),
  // scopes: ["https://www.googleapis.com/auth/drive.readonly"], // what API you want to access on behalf of the user, default is email and profile
  // forceCodeForRefreshToken: true, // [Android] related to `serverAuthCode`, read the docs link below *.
  // iosClientId: IOS_CLIENT_ID, // [iOS] if you want to specify the client ID of type iOS (otherwise, it is taken from GoogleService-Info.plist)
});

// Rejects when no native splash is registered for the current view controller,
// which happens routinely in the dev client. There is nothing to prevent in that
// case, so swallow it rather than leaving an unhandled rejection at module scope.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Created once, at module scope. This used to be built in the render body, which
// handed QueryClientProvider a brand new client on every re-render of App and
// discarded the entire query cache with it.
const queryClient = new QueryClient();

export default function App() {
  const [loaded, error] = useFonts({
    "PlusJakartaSans-Regular": require("./assets/fonts/PlusJakartaSans-Regular.ttf"),
    "PlusJakartaSans-Light": require("./assets/fonts/PlusJakartaSans-Light.ttf"),
    "PlusJakartaSans-Medium": require("./assets/fonts/PlusJakartaSans-Medium.ttf"),
    "PlusJakartaSans-SemiBold": require("./assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "PlusJakartaSans-Bold": require("./assets/fonts/PlusJakartaSans-Bold.ttf"),
  });

  // A font that fails to load must not take the whole app down. This used to
  // `throw error` from an effect, which no error boundary above it can catch, so
  // a font fetch failure was an unrecoverable crash. Returning null instead is no
  // better: `loaded` stays false forever on error, leaving a blank screen with
  // the splash still up. Treat an error as "ready" and fall back to system fonts.
  const ready = loaded || !!error;

  useEffect(() => {
    if (error) {
      console.warn(
        "Custom fonts failed to load; falling back to system fonts",
        error
      );
    }
  }, [error]);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GlobalProvider>
        <AuthProvider>
          <ProductProvider>
            <AutocompleteDropdownContextProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaProvider>
                  <BottomSheetModalProvider>
                    <Navigation />
                    {/* @ts-ignore */}
                    <Toast config={toastConfig} />
                  </BottomSheetModalProvider>
                </SafeAreaProvider>
              </GestureHandlerRootView>
            </AutocompleteDropdownContextProvider>
          </ProductProvider>
        </AuthProvider>
      </GlobalProvider>
    </QueryClientProvider>
  );
}

const toastConfig = {
  // Rendered inside the provider tree so it can read the theme. The bottom
  // offset clears the tab bar without hardcoding its height.
  customToast: (props: any) => (
    <View style={{ width: "100%", alignItems: "center", marginBottom: 24 }}>
      <ToastBody {...props} />
    </View>
  ),
};
