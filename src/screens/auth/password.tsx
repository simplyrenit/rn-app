import { HeaderIndicator } from "@/components/auth/headerIndicator";
import { Button, StaticContainer, Text } from "@/components/core";
import { ScrollContainer } from "@/components/core/scroll-container";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import React, { useMemo, useState } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
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
            <Text fontSize="text-2xl" fontWeight="font-bold">
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
              className={`flex flex-row items-center border mt-3 rounded-lg p-2 h-12 ${
                isDarkMode
                  ? "bg-[#0F0F0F] border-[#292929]"
                  : "bg-white border-[#e6e6e6]"
              } `}
            >
              <TextInput
                className="flex-1"
                keyboardType="default"
                autoCapitalize="none"
                placeholder="Enter password"
                placeholderTextColor={
                  theme === "dark" ? "#FFFFFF80" : "#00000080"
                }
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
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

            <View className="mt-4 space-y-2">
              <Text
                fontSize="text-md"
                fontWeight="font-semibold"
                className={`${
                  isDarkMode ? "text-[#FFFFFF80]" : "text-[#00000080]"
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
                <View key={index} className="flex flex-row items-center">
                  {item.valid ? (
                    <CheckCircleIcon
                      size={24}
                      color="#078861"
                      strokeWidth={2}
                    />
                  ) : (
                    <InformationCircleIcon
                      size={24}
                      color={theme == "dark" ? "#FFFFFF80" : "#00000080"}
                      strokeWidth={2}
                    />
                  )}
                  <Text
                    className={`ml-2 ${
                      item.valid
                        ? "text-[#078861]"
                        : isDarkMode
                        ? "text-[#FFFFFF80]"
                        : "text-[#00000080]"
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
          <Button variant="primary" onPress={onSubmit} disabled={!allValid}>
            Continue
          </Button>
        </View>
      </View>
    </StaticContainer>
  );
}
