import { SignUpError, useAuth } from "@/backend/auth";
import { HeaderIndicator } from "@/components/auth/headerIndicator";
import { Button, StaticContainer, Text } from "@/components/core";
import { ScrollContainer } from "@/components/core/scroll-container";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import React, { useCallback, useState } from "react";
import { TextInput, View } from "react-native";
import { InformationCircleIcon } from "react-native-heroicons/outline";
import { ink } from "@/lib/design-tokens";

const isE164Phone = (phone: string) => /^\+[1-9]\d{7,14}$/.test(phone);

export default function LoginWithPhone() {
  const { theme } = useGlobalContext();
  const router = useTypedNavigation();
  const { sendPhoneOTP, loading } = useAuth();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = useCallback(async () => {
    if (!isE164Phone(phone)) {
      setError("Enter a valid mobile number with country code, for example +919876543210.");
      return;
    }

    setError("");
    try {
      await sendPhoneOTP(phone);
      router.navigate("Verify", { phone, verificationType: "phone" });
    } catch (requestError: any) {
      setError(
        (requestError as SignUpError).message ||
          "Unable to send a verification code right now. Please try again."
      );
    }
  }, [phone, router, sendPhoneOTP]);

  return (
    <StaticContainer>
      <View className="flex-1">
        <HeaderIndicator percentage={0} />
        <ScrollContainer>
          <View className="flex">
            <Text fontSize="text-2xl" fontWeight="font-bold">
              Continue with your mobile number
            </Text>
            <Text fontSize="text-sm" fontWeight="font-semibold" className="mt-6 mb-2">
              Mobile number
            </Text>
            <TextInput
              placeholder="+919876543210"
              placeholderTextColor={theme === "dark" ? ink.dim(true) : ink.dim(false)}
              value={phone}
              onChangeText={(value) => {
                setPhone(value.replace(/[\s-]/g, ""));
                setError("");
              }}
              className={`border mt-2 rounded-button ${
                theme === "dark"
                  ? "text-white bg-surface-raised-dark border-input-line-dark"
                  : "text-black bg-surface-light border-input-line-light"
              } p-2 h-12`}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              accessibilityLabel="Phone number"
            />
            {!!error && (
              <View className="flex flex-row items-center mt-4 space-x-3">
                <InformationCircleIcon size={14} color={ink.danger(true)} />
                <Text tone="danger" fontSize="text-sm">
                  {error}
                </Text>
              </View>
            )}
          </View>
        </ScrollContainer>
        <View className="py-5">
          <Button variant="primary" onPress={handleSubmit} disabled={loading || !phone}>
            {loading ? "Sending code..." : "Continue with Mobile OTP"}
          </Button>
        </View>
      </View>
    </StaticContainer>
  );
}
