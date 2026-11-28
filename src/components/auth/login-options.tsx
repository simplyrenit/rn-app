import { SignInOptions } from "@/components/auth/sign-in-options";
import { Text } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { TouchableOpacity, View } from "react-native";

export function LoginOptions(): JSX.Element {
  const router = useTypedNavigation();
  const { setHasSeenWelcome } = useGlobalContext();

  const onSkip = () => {
    setHasSeenWelcome(true);
    // Opened over the tabs (a listing, search, or the tab panel's mobile number): go back to them rather than
    // stacking a second MainTabs. Opened as the first screen: there is nothing behind, so the tabs replace it.
    if (router.canGoBack()) router.goBack();
    // @ts-ignore
    else router.replace("MainTabs");
  };

  return (
    // 02b sign-in (2179:31785): the providers, then the link 16 below them.
    <View style={{ gap: 16 }}>
      {/* Full-width labelled buttons, not three unlabelled 25%-wide icon tiles.
          A provider choice is the one place a customer must be certain what
          they are tapping. */}
      <SignInOptions />

      <TouchableOpacity
        onPress={onSkip}
        accessibilityRole="button"
        accessibilityLabel="Skip sign in and browse"
        // The link draws 24 high in the frame; the slop keeps a 44 target.
        hitSlop={{ top: 10, bottom: 10 }}
        style={{ alignItems: "center", justifyContent: "center" }}
      >
        <Text fontSize="text-md" fontWeight="font-semibold" lineHeight={24} tone="brand">
          Browse without an account
        </Text>
      </TouchableOpacity>
    </View>
  );
}
