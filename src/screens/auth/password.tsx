import { HeaderIndicator } from "@/components/auth/headerIndicator";
import { Button, StaticContainer, Text } from "@/components/core";
import { ScrollContainer } from "@/components/core/scroll-container";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import React, { useMemo, useState } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import { ink } from "@/lib/design-tokens";
import {
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon,
} from "react-native-heroicons/outline";

export default function SetPassword() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useTypedNavigation();

  const { theme } = useGlobalContext();
  const isDarkMode = theme === "dark";

  const passwordValidations = useMemo(
    () => ({
      hasMinChars: password.length >= 8,
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      hasNumber: /\d/.test(password),
    }),
    [password]
  );

  const onSubmit = () => {
    router.navigate("ConfirmPassword", {
      enteredPassword: password,
    });
  };

  const allValid = Object.values(passwordValidations).every(Boolean);

  return (
    <StaticContainer>
      <View className="flex-1">
        <HeaderIndicator percentage={50} />

        <ScrollContainer>
          <View className="flex">
            <Text
              fontSize="text-2xl"
              fontWeight="font-bold"
            >
              Set a password for your new account
            </Text>

            <Text
              fontSize="text-sm"
              fontWeight="font-semibold"
              className="mt-6"
            >
              Create Password
            </Text>
            <View
              className={`flex flex-row items-center border mt-3 rounded-button p-2 h-12 ${
                isDarkMode
                  ? "bg-surface-dark border-input-line-dark"
                  : "bg-surface-light border-input-line-light"
              } `}
            >
              <TextInput
                className="flex-1"
                keyboardType="default"
                autoCapitalize="none"
                placeholder="Enter password"
                placeholderTextColor={
                  ink.dim(isDarkMode)
                }
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCorrect={false}
                textContentType="newPassword"
                autoComplete="new-password"
                accessibilityLabel="Password"
                style={{ color: ink.text(isDarkMode) }}
              />
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Show or hide password" onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeSlashIcon
                    size={24}
                    color={ink.text(isDarkMode)}
                  />
                ) : (
                  <EyeIcon
                    size={24}
                    color={ink.text(isDarkMode)}
                  />
                )}
              </TouchableOpacity>
            </View>

            <View className="mt-4 space-y-2">
              <Text
                fontSize="text-md"
                fontWeight="font-semibold"
                className={`${
                  isDarkMode ? "text-subtle-dark" : "text-subtle-light"
                }`}
              >
                Your password must include:
              </Text>

              {[
                {
                  label: "Minimum 8 characters",
                  valid: passwordValidations.hasMinChars,
                },
                {
                  label: "At least 1 special character",
                  valid: passwordValidations.hasSpecialChar,
                },
                {
                  label: "At least 1 number",
                  valid: passwordValidations.hasNumber,
                },
              ].map((item, index) => (
                <View
                  key={index}
                  className="flex flex-row items-center"
                >
                  {item.valid ? (
                    <CheckCircleIcon
                      size={24}
                      color={ink.success(false)}
                      strokeWidth={2}
                    />
                  ) : (
                    <InformationCircleIcon
                      size={24}
                      color={theme == "dark" ? ink.dim(true) : ink.dim(false)}
                      strokeWidth={2}
                    />
                  )}
                  <Text
                    className={`ml-2 ${
                      item.valid
                        ? "text-success-light"
                        : isDarkMode
                        ? "text-subtle-dark"
                        : "text-subtle-light"
                    }`}
                  >
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollContainer>

        <View className="py-5">
          <Button
            variant="primary"
            onPress={onSubmit}
            disabled={!allValid}
          >
            Continue
          </Button>
        </View>
      </View>
    </StaticContainer>
  );
}
