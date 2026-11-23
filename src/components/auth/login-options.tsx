import { SignInOptions } from "@/components/auth/sign-in-options";
import { Text } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
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
    // 02 Welcome (2089:15349): the providers, then the link 16 below them.
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
