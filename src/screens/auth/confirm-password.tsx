import { HeaderIndicator } from "@/components/auth/headerIndicator";
import { Button, StaticContainer, Text } from "@/components/core";
import { ScrollContainer } from "@/components/core/scroll-container";
import { useAuthContext } from "@/context/auth-context";
import { useGlobalContext } from "@/context/global-context";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";

import React, { useCallback, useState } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import {
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon,
} from "react-native-heroicons/outline";

export default function ConfirmPassword() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const { theme } = useGlobalContext();
  const isDarkMode = theme === "dark";

  const router = useTypedNavigation();
  const route = useRoute<RouteProps<"ConfirmPassword">>();

  const { enteredPassword } = route.params;

  const { saveUser } = useAuthContext();

  const validatePassword = useCallback(() => {
    if (!password) {
      setError("Please enter your password.");
      return false;
    }
    if (password !== enteredPassword) {
      setError("The passwords don't match. Please try again.");
      return false;
    }
    return true;
  }, [password, enteredPassword]);

  const onSubmit = useCallback(() => {
    if (validatePassword()) {
      console.log("Password confirmed successfully!");
      setError("");

      saveUser({ password });

      router.navigate("Location");
    }
  }, [validatePassword]);

  const handlePasswordChange = useCallback(
    (text: string) => {
      setPassword(text);
      if (error) setError("");
    },
    [error]
  );

  return (
    <StaticContainer>
      <View className="flex-1">
        <HeaderIndicator percentage={50} />

        <ScrollContainer>
          <View className="flex">
            <Text fontSize="text-2xl" fontWeight="font-bold">
              Re-enter password
            </Text>

            <View
              className={`flex flex-row items-center border mt-6 rounded-lg p-2 h-12 ${
                isDarkMode
                  ? "bg-[#0F0F0F] border-[#292929]"
                  : "bg-white border-[#e6e6e6]"
              } `}
            >
              <TextInput
                placeholder="Enter password"
                placeholderTextColor={
                  theme === "dark" ? "#FFFFFF80" : "#00000080"
                }
                className="flex-1"
                keyboardType="default"
                autoCapitalize="none"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={handlePasswordChange}
                autoCorrect={false}
                style={{ color: isDarkMode ? "#FFF" : "#000" }}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeSlashIcon
                    size={24}
                    color={isDarkMode ? "#FFF" : "#000"}
                  />
                ) : (
                  <EyeIcon size={24} color={isDarkMode ? "#FFF" : "#000"} />
                )}
              </TouchableOpacity>
            </View>

            {error && (
              <View className="flex flex-row items-center mt-4 space-x-3">
                <InformationCircleIcon size={14} color="#ef4444" />
                <Text className="text-red-500 text-sm">{error}</Text>
              </View>
            )}
          </View>
        </ScrollContainer>

        <View className="py-5">
          <Button variant="primary" onPress={onSubmit} disabled={!password}>
            Continue
          </Button>
        </View>
      </View>
    </StaticContainer>
  );
}
