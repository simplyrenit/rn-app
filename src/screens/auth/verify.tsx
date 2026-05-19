import { SignUpError, useAuth } from "@/backend/auth";
import { HeaderIndicator } from "@/components/auth/headerIndicator";
import { Button, StaticContainer, Text } from "@/components/core";
import { ScrollContainer } from "@/components/core/scroll-container";
import { useAuthContext } from "@/context/auth-context";
import { useGlobalContext } from "@/context/global-context";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { XCircleIcon } from "react-native-heroicons/outline";
import OTPTextView from "react-native-otp-textinput";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import * as Progress from "react-native-progress";
import axiosInstance from "@/lib/networkUtils";

export default function VerifyEmail() {
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [isIncorrect, setIsIncorrect] = useState(false);
  const [otpResendError, setOtpResendError] = useState("");
  const { theme, setAuthTokens } = useGlobalContext();

  const route = useRoute<RouteProps<"Verify">>();
  const { email, verificationType } = route.params;

  const router = useTypedNavigation();

  const { saveUser } = useAuthContext();
  const { verifyOTP, sendOTP, loading, loginUser } = useAuth();

  const handleSubmit = useCallback(async () => {
    setIsIncorrect(false);
    if (verificationType === "otp") {
      if (verificationCode.length === 6) {
        const data = await verifyOTP(email, verificationCode);
        if (data?.access !== null && data?.refresh !== null) {
          axiosInstance.defaults.headers.Authorization = `Bearer ${data.access}`;
          setAuthTokens({
            access_token: data.access,
            refresh_token: data.refresh,
          });
          router.navigate("MainTabs");
          return;
        }
        if (data?.is_verified) {
          saveUser({ email_verified: true });
          router.navigate("About");
        } else {
          setIsIncorrect(true);
        }
      }
    } else {
      // Handle password verification
      const data = await loginUser(email, password);
      if (
        data?.access_token !== null &&
        data?.refresh_token !== null &&
        data !== null
      ) {
        axiosInstance.defaults.headers.Authorization = `Bearer ${data.access_token}`;
        setAuthTokens({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        router.navigate("MainTabs");
        return;
      } else {
        setIsIncorrect(true);
      }
    }
  }, [
    verificationCode,
    password,
    verificationType,
    verifyOTP,
    email,
    setAuthTokens,
    router,
    saveUser,
    loginUser,
  ]);

  const handleResendOTP = useCallback(async () => {
    setOtpResendError("");
    try {
      await sendOTP(email);
    } catch (error: any) {
      const otpError = error as SignUpError;
      setOtpResendError(
        otpError.message || "Unable to resend OTP right now. Please try again."
      );
    }
  }, [email, sendOTP]);

  const styles = StyleSheet.create({
    textInputContainer: {
      marginHorizontal: -5,
    },
    roundedTextInput: {
      backgroundColor: theme === "dark" ? "#0F0F0F" : "#FFF",
      borderRadius: 10,
      borderWidth: 3,
      color: theme === "dark" ? "white" : "black",
      width: wp(12.5),
    },
  });

  return (
    <StaticContainer>
      <View className="flex-1">
        <HeaderIndicator percentage={20} />

        <ScrollContainer>
          <View className="flex">
            <Text
              fontSize="text-2xl"
              fontWeight="font-bold"
            >
              {verificationType === "otp"
                ? "Enter verification code"
                : "Enter password"}
            </Text>
            <Text
              fontSize="text-md"
              className={`${theme === "dark" ? "text-[#FFFFFFB2]" : "text-[#000000B2]"
                }`}
            >
              {verificationType === "otp"
                ? `We've sent a 6 digit verification code to ${email}`
                : "Enter your password to continue"}
            </Text>

            {verificationType === "otp" ? (
              <>
                <Text
                  fontSize="text-sm"
                  fontWeight="font-semibold"
                  className="mt-8 mb-2"
                >
                  Verification Code
                </Text>

                <View className="w-[70%]">
                  <OTPTextView
                    containerStyle={styles.textInputContainer}
                    textInputStyle={styles.roundedTextInput}
                    // @ts-ignore
                    placeholder="*"
                    placeholderTextColor={
                      theme === "dark" ? "#ffffff80" : "#00000080"
                    }
                    inputCount={6}
                    inputCellLength={1}
                    tintColor="#635BE8"
                    offTintColor={theme === "dark" ? "#292929" : "#e6e6e6"}
                    keyboardType="number-pad"
                    autoFocus
                    handleTextChange={(text) => setVerificationCode(text)}
                  />
                </View>

                {isIncorrect && (
                  <View className="flex mt-2 flex-row items-center space-x-2">
                    <XCircleIcon
                      size={14}
                      color="#ef4444"
                    />
                    <Text
                      fontSize="text-sm"
                      className="text-red-500"
                    >
                      Wrong OTP. Try again
                    </Text>
                  </View>
                )}

                <TouchableOpacity onPress={handleResendOTP}>
                  <Text
                    fontWeight="font-bold"
                    className="text-brand-blue mt-4"
                  >
                    Resend OTP
                  </Text>
                </TouchableOpacity>

                {!!otpResendError && (
                  <View className="flex mt-2 flex-row items-center space-x-2">
                    <XCircleIcon
                      size={14}
                      color="#ef4444"
                    />
                    <Text
                      fontSize="text-sm"
                      className="text-red-500"
                    >
                      {otpResendError}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text
                  fontSize="text-sm"
                  fontWeight="font-semibold"
                  className="mt-8 mb-2"
                >
                  Password
                </Text>
                <TextInput
                  placeholder="Enter password"
                  placeholderTextColor={
                    theme === "dark" ? "#FFFFFF80" : "#00000080"
                  }
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  className={`border mt-2 rounded-lg ${theme === "dark"
                      ? "text-white bg-[#292929] border-[#292929]"
                      : "text-black bg-white border-[#e6e6e6]"
                    } p-2 h-12`}
                />

                {isIncorrect && (
                  <View className="flex mt-2 flex-row items-center space-x-2">
                    <XCircleIcon
                      size={14}
                      color="#ef4444"
                    />
                    <Text
                      fontSize="text-sm"
                      className="text-red-500"
                    >
                      Wrong password. Try again
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollContainer>

        <View className="py-5">
          <Button
            variant="primary"
            className="flex-row items-center justify-center"
            onPress={handleSubmit}
            disabled={
              verificationType === "otp"
                ? verificationCode.length !== 6
                : !password
            }
          >
            {loading ? (
              <Progress.CircleSnail
                size={22}
                color="white"
              />
            ) : (
              "Continue"
            )}
          </Button>
        </View>
      </View>
    </StaticContainer>
  );
}
