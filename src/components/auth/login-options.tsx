import { SignInOptions } from "@/components/auth/sign-in-options";
import { Text } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import { MIN_TOUCH_TARGET } from "@/lib/design-tokens";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { TouchableOpacity, View } from "react-native";

interface LoginOptionsProps {
  isDarkMode: boolean;
}

export function LoginOptions({ isDarkMode }: LoginOptionsProps): JSX.Element {
  const router = useTypedNavigation();
  const { setHasSeenWelcome } = useGlobalContext();

  const onSkip = () => {
    setHasSeenWelcome(true);
    // @ts-ignore
    router.replace("MainTabs");
  };

  return (
    <View style={{ marginBottom: 32, gap: 16 }}>
      {/* Full-width labelled buttons, not three unlabelled 25%-wide icon tiles.
          A provider choice is the one place a customer must be certain what
          they are tapping. */}
      <SignInOptions />

      <TouchableOpacity
        onPress={onSkip}
        accessibilityRole="button"
        accessibilityLabel="Skip sign in and browse"
        style={{
          minHeight: MIN_TOUCH_TARGET,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text fontSize="text-md" fontWeight="font-bold" tone="brand">
          Browse without an account
        </Text>
      </TouchableOpacity>
    </View>
  );
}
