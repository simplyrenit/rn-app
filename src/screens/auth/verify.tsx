import { SignUpError, useAuth } from "@/backend/auth";
import { HeaderIndicator } from "@/components/auth/headerIndicator";
import { activeCell, codeCells, codeDigits, CODE_LENGTH } from "@/components/capture/code";
import { BottomBar, NonScrollableContainer, ScrollContainer, Text, TextField } from "@/components/core";
import { useAuthContext } from "@/context/auth-context";
import { useGlobalContext } from "@/context/global-context";
import { SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { emailProof, phoneProof } from "@/lib/sign-in-proof";
import { useTheme } from "@/lib/theme";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { goAfterSignIn } from "@/lib/return-to";
import { useRoute } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import { InformationCircleIcon } from "react-native-heroicons/outline";
import axiosInstance from "@/lib/networkUtils";

/** Dev-only design seed (ENG-428 plan §1): only DevFixture passes it. */
type VerifyDesign = { code?: string; wrong?: boolean; password?: string };

/** The non-field message row (21903): an information-circle 16 in `text`, then 12/16 Medium in `dangerStrong`. */
function MessageRow({ children }: { children: string }) {
  const { color } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }} accessibilityLiveRegion="polite">
      <InformationCircleIcon size={16} color={color.text} />
      <Text fontSize="text-xs" fontWeight="font-medium" lineHeight={16} style={{ flexShrink: 1, color: color.dangerStrong }}>
        {children}
      </Text>
    </View>
  );
}

export default function VerifyEmail() {
  const route = useRoute<RouteProps<"Verify">>();
  const design = __DEV__ ? (route.params as { design?: VerifyDesign }).design : undefined;
  const { email, phone, verificationType } = route.params;
  const isCodeVerification = verificationType !== "password";

  const [verificationCode, setVerificationCode] = useState(codeDigits(design?.code ?? ""));
  const [password, setPassword] = useState(design?.password ?? "");
  const [isIncorrect, setIsIncorrect] = useState(design?.wrong ?? false);
  const [otpVerifyError, setOtpVerifyError] = useState("");
  const [otpResendError, setOtpResendError] = useState("");
  const { setAuthTokens } = useGlobalContext();
  const { color } = useTheme();

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
    // A design seed never checks a code or a password.
    if (design) return;
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
              goAfterSignIn(router);
              return;
            }
            if (data.onboarding_required) {
              saveUser({
                email: "",
                phone: data.phone || phone || "",
                phone_verified: true,
                // The proof that this number was just confirmed: sign-up sends it (T-19).
                proof_token: phoneProof(data) ?? "",
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
            goAfterSignIn(router);
            return;
          }
          if (data?.is_verified) {
            const proof = emailProof(data);
            saveUser({
              email_verified: true,
              // The proof that this address was just confirmed: sign-up sends it (T-19). A number left over from
              // an earlier try by phone is cleared, so the token and what sign-up names are the same thing.
              proof_token: proof.kind === "proof" ? proof.token : "",
              phone: "",
              phone_verified: false,
            });
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
        goAfterSignIn(router);
        return;
      } else {
        setIsIncorrect(true);
      }
    }
  }, [
    design,
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
    // A design seed never sends a code.
    if (design) return;
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
  }, [design, email, phone, sendOTP, sendPhoneOTP, verificationType]);

  const cells = codeCells(verificationCode);
  // The box the next digit goes in, only while the code is incomplete: a whole code (21853) has none.
  const active = verificationCode.length < CODE_LENGTH ? activeCell(verificationCode) : -1;

  return (
    <NonScrollableContainer>
      <HeaderIndicator percentage={20} />

      <ScrollContainer containerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 24 }}>
        <View style={{ gap: 4 }}>
          <Text role="screenTitle">
            {isCodeVerification ? "Enter verification code" : "Enter password"}
          </Text>
          {isCodeVerification ? (
            // The address is its own line, as the frames draw it, not a SemiBold span in the sentence: on Android a
            // line holding only that span lost its 20pt line height (RN's line-height span keeps the SemiBold face's
            // natural 17.67pt when its padded box is taller than the line), lifting everything below by 2.33pt.
            <View>
              <Text fontSize="text-sm" lineHeight={20} tone="body">
                We've sent a 6 digit verification code to
              </Text>
              <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20}>
                {phone || email}
              </Text>
            </View>
          ) : (
            <Text fontSize="text-sm" lineHeight={20} tone="body">
              Enter your password to continue
            </Text>
          )}
        </View>

        {isCodeVerification ? (
          <>
            <View style={{ marginTop: 24, gap: 8 }}>
              <Text role="fieldLabel">Verification code</Text>

              {/* Six cells drawn from one value (21800): one invisible input lies over them, as in CodeInput, so
                  digits that arrive together (pasted, or filled in from a message) are never dropped. */}
              <View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {cells.map((digit, index) => {
                    const edge = isIncorrect ? color.dangerStrong : index === active ? color.brand : undefined;
                    return (
                      <View
                        key={index}
                        style={{
                          flex: 1,
                          maxWidth: 48,
                          height: 52,
                          borderRadius: radius.input,
                          borderWidth: edge ? 1.5 : 1,
                          borderColor: edge ?? color.line,
                          backgroundColor: color.surface,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {digit ? (
                          <Text fontSize="text-lg" fontWeight="font-semibold" lineHeight={28} maxFontSizeMultiplier={1.4}>
                            {digit}
                          </Text>
                        ) : (
                          <Text fontSize="text-md" lineHeight={24} tone="dim" maxFontSizeMultiplier={1.4}>
                            *
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
                <TextInput
                  value={verificationCode}
                  onChangeText={(text) => setVerificationCode(codeDigits(text))}
                  autoFocus={!design}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  // Lets iOS surface the code from Messages above the keyboard; Android's matching hint.
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  autoCorrect={false}
                  caretHidden
                  selectionColor="transparent"
                  accessibilityLabel={`Verification code, ${CODE_LENGTH} digits`}
                  accessibilityValue={{ text: cells.filter(Boolean).join(" ") || "empty" }}
                  style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0 }}
                />
              </View>

              {isIncorrect && <MessageRow>Wrong OTP. Try again</MessageRow>}
              {!!otpVerifyError && <MessageRow>{otpVerifyError}</MessageRow>}
            </View>

            <TouchableOpacity
              onPress={handleResendOTP}
              disabled={loading}
              accessibilityRole="button"
              hitSlop={12}
              style={{ marginTop: 24, alignSelf: "flex-start" }}
            >
              <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} tone="brand">
                Resend OTP
              </Text>
            </TouchableOpacity>

            {!!otpResendError && (
              <View style={{ marginTop: 8 }}>
                <MessageRow>{otpResendError}</MessageRow>
              </View>
            )}
          </>
        ) : (
          <View style={{ marginTop: 24 }}>
            <TextField
              label="Password"
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              error={isIncorrect ? "Wrong password. Try again" : undefined}
              secureTextEntry
              textContentType="password"
              autoComplete="password"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Password"
              maxFontSizeMultiplier={1.4}
            />
          </View>
        )}
      </ScrollContainer>

      <BottomBar
        primary={{
          label: "Continue",
          onPress: handleSubmit,
          loading,
          disabled: isCodeVerification ? verificationCode.length !== 6 : !password,
        }}
      />
    </NonScrollableContainer>
  );
}
