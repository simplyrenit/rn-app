import { HeaderIndicator } from "@/components/auth/headerIndicator";
import { Button, StaticContainer, Text } from "@/components/core";
import { ScrollContainer } from "@/components/core/scroll-container";
import { useAuthContext } from "@/context/auth-context";
import { useGlobalContext } from "@/context/global-context";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";

import React, { useCallback, useState } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import { ink } from "@/lib/design-tokens";
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
      setError("The passwords don’t match. Please try again.");
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
              className={`flex flex-row items-center border mt-6 rounded-button p-2 h-12 ${
                isDarkMode
                  ? "bg-surface-dark border-input-line-dark"
                  : "bg-surface-light border-input-line-light"
              } `}
            >
              <TextInput
                placeholder="Enter password"
                placeholderTextColor={
                  ink.dim(isDarkMode)
                }
                className="flex-1"
                keyboardType="default"
                autoCapitalize="none"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={handlePasswordChange}
                autoCorrect={false}
                textContentType="newPassword"
                autoComplete="new-password"
                accessibilityLabel="Confirm password"
                style={{ color: ink.text(isDarkMode) }}
              />
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Show or hide password" onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeSlashIcon
                    size={24}
                    color={ink.text(isDarkMode)}
                  />
                ) : (
                  <EyeIcon size={24} color={ink.text(isDarkMode)} />
                )}
              </TouchableOpacity>
            </View>

            {error && (
              <View className="flex flex-row items-center mt-4 space-x-3">
                <InformationCircleIcon size={14} color={ink.danger(true)} />
                <Text tone="danger" className="text-sm">{error}</Text>
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
