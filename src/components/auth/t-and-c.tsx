import { Text } from "@/components/core/text";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { TouchableOpacity, View } from "react-native";

export function TermsAndPolicy(): JSX.Element {
  const router = useTypedNavigation();
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";

  return (
    <View className="flex w-[70%] self-center items-center">
      <Text
        fontSize="text-xs"
        className={`text-center ${
          isDark ? "text-subtle-dark" : "text-subtle-light"
        }`}
      >
        By continuing you agree to Renit’s
      </Text>
      <View className="flex flex-row space-x-1">
        <TouchableOpacity onPress={() => router.navigate("Terms")}>
          <Text
            fontSize="text-sm"
            fontWeight="font-semibold"
            className={`text-center underline ${
              isDark ? "text-subtle-dark" : "text-subtle-light"
            } mb-4`}
          >
            Terms & Conditions
          </Text>
        </TouchableOpacity>
        <Text tone="body" className="text-center text-sm mb-4">&</Text>
        <TouchableOpacity onPress={() => router.navigate("Privacy")}>
          <Text
            fontSize="text-sm"
            fontWeight="font-semibold"
            className={`text-center underline ${
              isDark ? "text-subtle-dark" : "text-subtle-light"
            } mb-4`}
          >
            Privacy Policy
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
