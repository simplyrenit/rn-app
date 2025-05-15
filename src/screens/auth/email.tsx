import { useAuth } from "@/backend/auth";
import { HeaderIndicator } from "@/components/auth/headerIndicator";
import { Button, StaticContainer, Text } from "@/components/core";
import { ScrollContainer } from "@/components/core/scroll-container";
import { useAuthContext } from "@/context/auth-context";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import React, { useCallback, useState } from "react";
import { TextInput, View } from "react-native";
import { InformationCircleIcon } from "react-native-heroicons/outline";

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function LoginWithEmail() {
  const { theme } = useGlobalContext();

  const [email, setEmail] = useState("");
  const [isValid, setIsValid] = useState(true);
  const [isTouched, setIsTouched] = useState(false);

  const { saveUser } = useAuthContext();
  const { sendOTP } = useAuth();

  const router = useTypedNavigation();

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
    setIsValid(validateEmail(text));
    setIsTouched(true);
  }, []);

  const handleSubmit = useCallback(
    async (verificationType: "otp" | "password") => {
      if (validateEmail(email)) {
        saveUser({ email });

        if (verificationType === "otp") {
          await sendOTP(email);
          router.navigate("Verify", { email, verificationType });
        } else {
          router.navigate("Verify", { email, verificationType });
        }
      } else {
        setIsValid(false);
      }
    },
    [email]
  );

  return (
    <StaticContainer>
      <View className="flex-1">
        <HeaderIndicator percentage={0} />

        <ScrollContainer>
          <View className="flex">
            <Text
              fontSize="text-2xl"
              fontWeight="font-bold"
            >
              Welcome to Renit
            </Text>

            <Text
              fontSize="text-sm"
              fontWeight="font-semibold"
              className="mt-6 mb-2"
            >
              Enter your email
            </Text>
            <TextInput
              placeholder="Enter email"
              placeholderTextColor={
                theme === "dark" ? "#FFFFFF80" : "#00000080"
              }
              value={email}
              onChangeText={handleEmailChange}
              className={`border mt-2 rounded-lg ${
                theme === "dark"
                  ? "text-white bg-[#292929] border-[#292929]"
                  : "text-black bg-white border-[#e6e6e6]"
              } p-2 h-12
              `}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {!isValid && isTouched && (
              <View className="flex flex-row items-center mt-4 space-x-3">
                <InformationCircleIcon
                  size={14}
                  color="#ef4444"
                />
                <Text
                  fontSize="text-sm"
                  className="text-red-500"
                >
                  Please enter a valid email address
                </Text>
              </View>
            )}
          </View>
        </ScrollContainer>

        <View className="py-5 space-y-3">
          <Button
            variant="primary"
            onPress={() => handleSubmit("otp")}
            disabled={!isValid || !email}
          >
            Continue with OTP
          </Button>
          {/* <Button
            variant="primary"
            onPress={() => handleSubmit("password")}
            disabled={!isValid || !email}
          >
            Continue with Password
          </Button> */}
         
        </View>
      </View>
    </StaticContainer>
  );
}
