import { SignUpError, useAuth } from "@/backend/auth";
import { HeaderIndicator } from "@/components/auth/headerIndicator";
import { Button, StaticContainer, Text } from "@/components/core";
import { ScrollContainer } from "@/components/core/scroll-container";
import { useAuthContext } from "@/context/auth-context";
import { useGlobalContext } from "@/context/global-context";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { XCircleIcon } from "react-native-heroicons/outline";
import OTPTextView from "react-native-otp-textinput";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import axiosInstance from "@/lib/networkUtils";
import { colors, ink, radius } from "@/lib/design-tokens";

export default function VerifyEmail() {
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [isIncorrect, setIsIncorrect] = useState(false);
  const [otpVerifyError, setOtpVerifyError] = useState("");
  const [otpResendError, setOtpResendError] = useState("");
  const { theme, setAuthTokens } = useGlobalContext();

  const route = useRoute<RouteProps<"Verify">>();
  const { email, phone, verificationType } = route.params;
  const isCodeVerification = verificationType !== "password";

  const router = useTypedNavigation();

  const { saveUser } = useAuthContext();
  const {
    verifyOTP,
    sendOTP,
    verifyPhoneOTP,
    sendPhoneOTP,
    loading,
    loginUser,
  } = useAuth();

  const handleSubmit = useCallback(async () => {
    setIsIncorrect(false);
    setOtpVerifyError("");
    if (isCodeVerification) {
      if (verificationCode.length === 6) {
        try {
          if (verificationType === "phone") {
            const data = await verifyPhoneOTP(verificationCode);
            if (data.access_token && data.refresh_token) {
              axiosInstance.defaults.headers.Authorization = `Bearer ${data.access_token}`;
              setAuthTokens({
                access_token: data.access_token,
                refresh_token: data.refresh_token,
              });
              router.navigate("MainTabs");
              return;
            }
            if (data.onboarding_required) {
              saveUser({
                email: "",
                phone: data.phone || phone || "",
                phone_verified: true,
              });
              router.navigate("About");
              return;
            }
            setIsIncorrect(true);
            return;
          }

          const data = await verifyOTP(email!, verificationCode);
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
        } catch (error: any) {
          const otpError = error as SignUpError;
          if (otpError.status === 401) {
            setIsIncorrect(true);
          } else {
            setOtpVerifyError(
              otpError.message || "Unable to verify OTP right now. Please try again."
            );
          }
        }
      }
    } else {
      // Handle password verification
      const data = await loginUser(email!, password);
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
    isCodeVerification,
    verifyOTP,
    verifyPhoneOTP,
    email,
    phone,
    setAuthTokens,
    router,
    saveUser,
    loginUser,
  ]);

  const handleResendOTP = useCallback(async () => {
    setOtpResendError("");
    try {
      if (verificationType === "phone") {
        await sendPhoneOTP(phone!);
      } else {
        await sendOTP(email!);
      }
    } catch (error: any) {
      const otpError = error as SignUpError;
      setOtpResendError(
        otpError.message || "Unable to resend OTP right now. Please try again."
      );
    }
  }, [email, phone, sendOTP, sendPhoneOTP, verificationType]);

  const styles = StyleSheet.create({
    textInputContainer: {
      marginHorizontal: -5,
    },
    roundedTextInput: {
      backgroundColor: ink.surface(theme === "dark"),
      borderRadius: radius.input,
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
              {isCodeVerification
                ? "Enter verification code"
                : "Enter password"}
            </Text>
            <Text
              fontSize="text-md"
              className={`${theme === "dark" ? "text-muted-dark" : "text-muted-light"
                }`}
            >
              {isCodeVerification
                ? `We've sent a 6 digit verification code to ${phone || email}`
                : "Enter your password to continue"}
            </Text>

            {isCodeVerification ? (
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
                    // Lets iOS surface the code from Messages above the
                    // keyboard. The library forwards unknown props to its
                    // TextInputs but does not type them.
                    // @ts-ignore
                    textContentType="oneTimeCode"
                    // @ts-ignore
                    autoComplete="sms-otp"
                    containerStyle={styles.textInputContainer}
                    textInputStyle={styles.roundedTextInput}
                    // @ts-ignore
                    placeholder="*"
                    placeholderTextColor={
                      ink.dim(theme === "dark")
                    }
                    inputCount={6}
                    inputCellLength={1}
                    tintColor={colors.dark.brand}
                    offTintColor={theme === "dark" ? ink.line(true) : ink.line(false)}
                    keyboardType="number-pad"
                    autoFocus
                    handleTextChange={(text) => setVerificationCode(text)}
                  />
                </View>

                {isIncorrect && (
                  <View className="flex mt-2 flex-row items-center space-x-2">
                    <XCircleIcon
                      size={14}
                      color={ink.danger(true)}
                    />
                    <Text tone="danger"
                      fontSize="text-sm"
                    >
                      Wrong OTP. Try again
                    </Text>
                  </View>
                )}

                {!!otpVerifyError && (
                  <View className="flex mt-2 flex-row items-center space-x-2">
                    <XCircleIcon
                      size={14}
                      color={ink.danger(true)}
                    />
                    <Text tone="danger"
                      fontSize="text-sm"
                    >
                      {otpVerifyError}
                    </Text>
                  </View>
                )}

                <TouchableOpacity onPress={handleResendOTP}>
                  <Text
                    fontWeight="font-bold"
                    className="text-brand mt-4"
                  >
                    Resend OTP
                  </Text>
                </TouchableOpacity>

                {!!otpResendError && (
                  <View className="flex mt-2 flex-row items-center space-x-2">
                    <XCircleIcon
                      size={14}
                      color={ink.danger(true)}
                    />
                    <Text tone="danger"
                      fontSize="text-sm"
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
                    theme === "dark" ? ink.dim(true) : ink.dim(false)
                  }
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  textContentType="password"
                  autoComplete="password"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Password"
                  className={`border mt-2 rounded-button ${theme === "dark"
                      ? "text-white bg-surface-raised-dark border-input-line-dark"
                      : "text-black bg-surface-light border-input-line-light"
                    } p-2 h-12`}
                />

                {isIncorrect && (
                  <View className="flex mt-2 flex-row items-center space-x-2">
                    <XCircleIcon
                      size={14}
                      color={ink.danger(true)}
                    />
                    <Text tone="danger"
                      fontSize="text-sm"
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
              isCodeVerification
                ? verificationCode.length !== 6
                : !password
            }
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              "Continue"
            )}
          </Button>
        </View>
      </View>
    </StaticContainer>
  );
}
