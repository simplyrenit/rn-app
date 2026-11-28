import { SignUpError, useAuth } from "@/backend/auth";
import { formatPhone } from "@/components/auth/phone-field";
import { activeCell, codeCells, codeDigits, CODE_LENGTH } from "@/components/capture/code";
import { BottomBar, NonScrollableContainer, ScrollContainer, SubpageHeader, Text } from "@/components/core";
import { useAuthContext } from "@/context/auth-context";
import { useGlobalContext } from "@/context/global-context";
import { SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { emailProof, phoneProof } from "@/lib/sign-in-proof";
import { useTheme } from "@/lib/theme";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { goAfterSignIn } from "@/lib/return-to";
import { useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import { InformationCircleIcon } from "react-native-heroicons/outline";
import axiosInstance from "@/lib/networkUtils";

/** Dev-only design seed (ENG-428 plan §1): only DevFixture passes it. `resendIn` holds the countdown still. */
type VerifyDesign = { code?: string; wrong?: boolean; resendIn?: number };

/** How long before another code can be asked for: Firebase and rn-api both limit sends, so a tap-happy Resend only burns them. */
const RESEND_AFTER = 30;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

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

export default function VerifyCode() {
  const route = useRoute<RouteProps<"Verify">>();
  const design = __DEV__ ? (route.params as { design?: VerifyDesign }).design : undefined;
  const { email, phone, verificationType } = route.params;
  const isPhone = verificationType === "phone";

  const [verificationCode, setVerificationCode] = useState(codeDigits(design?.code ?? ""));
  const [isIncorrect, setIsIncorrect] = useState(design?.wrong ?? false);
  const [otpVerifyError, setOtpVerifyError] = useState("");
  const [otpResendError, setOtpResendError] = useState("");
  const [resendIn, setResendIn] = useState(design?.resendIn ?? RESEND_AFTER);
  const { setAuthTokens } = useGlobalContext();
  const { color } = useTheme();

  const router = useTypedNavigation();

  const { saveUser } = useAuthContext();
  const { verifyOTP, sendOTP, verifyPhoneOTP, sendPhoneOTP, loading } = useAuth();

  // One tick a second until Resend opens; a design seed holds its number still.
  useEffect(() => {
    if (design || resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [design, resendIn]);

  const handleSubmit = useCallback(async () => {
    // A design seed never checks a code.
    if (design) return;
    if (verificationCode.length !== CODE_LENGTH) return;
    setIsIncorrect(false);
    setOtpVerifyError("");
    try {
      if (isPhone) {
        const data = await verifyPhoneOTP(verificationCode);
        if (data.access_token && data.refresh_token) {
          axiosInstance.defaults.headers.Authorization = `Bearer ${data.access_token}`;
          setAuthTokens({ access_token: data.access_token, refresh_token: data.refresh_token });
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
          router.navigate("YourName");
          return;
        }
        setIsIncorrect(true);
        return;
      }

      const data = await verifyOTP(email!, verificationCode);
      if (data?.access && data?.refresh) {
        axiosInstance.defaults.headers.Authorization = `Bearer ${data.access}`;
        setAuthTokens({ access_token: data.access, refresh_token: data.refresh });
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
        router.navigate("YourName");
      } else {
        setIsIncorrect(true);
      }
    } catch (error: any) {
      const otpError = error as SignUpError;
      if (otpError.status === 401) {
        setIsIncorrect(true);
      } else {
        setOtpVerifyError(otpError.message || "We couldn't check the code. Try again.");
      }
    }
  }, [design, verificationCode, isPhone, verifyOTP, verifyPhoneOTP, email, phone, setAuthTokens, router, saveUser]);

  const handleResendOTP = useCallback(async () => {
    // A design seed never sends a code.
    if (design || resendIn > 0) return;
    setOtpResendError("");
    setIsIncorrect(false);
    try {
      if (isPhone) {
        await sendPhoneOTP(phone!);
      } else {
        await sendOTP(email!);
      }
      setVerificationCode("");
      setResendIn(RESEND_AFTER);
    } catch (error: any) {
      setOtpResendError((error as SignUpError).message || "We couldn't send a new code. Try again.");
    }
  }, [design, resendIn, email, phone, sendOTP, sendPhoneOTP, isPhone]);

  const cells = codeCells(verificationCode);
  // The box the next digit goes in, only while the code is incomplete: a whole code (31931) has none.
  const active = verificationCode.length < CODE_LENGTH ? activeCell(verificationCode) : -1;

  return (
    <NonScrollableContainer>
      <SubpageHeader variant="back-only" />

      <ScrollContainer containerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 24 }}>
        {/* 02b code (2179:31931): one screen for the SMS and the emailed code. "Change" goes back to where the
            number or the address was typed. */}
        <View style={{ gap: 4 }}>
          <Text role="screenTitle">Enter the 6-digit code</Text>
          <Text fontSize="text-sm" lineHeight={20} tone="body">
            {isPhone ? "Sent by SMS to " : "Sent to "}
            <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20}>
              {isPhone && phone ? formatPhone(phone) : email}
            </Text>
            {"  ·  "}
            <Text
              fontSize="text-sm"
              fontWeight="font-semibold"
              lineHeight={20}
              tone="brand"
              accessibilityRole="link"
              onPress={() => router.goBack()}
            >
              Change
            </Text>
          </Text>
        </View>

        <View style={{ marginTop: 24, gap: 8 }}>
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
              onChangeText={(text) => {
                setVerificationCode(codeDigits(text));
                setIsIncorrect(false);
              }}
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

          {isIncorrect && <MessageRow>That code didn't work. Check it and try again.</MessageRow>}
          {!!otpVerifyError && <MessageRow>{otpVerifyError}</MessageRow>}
        </View>

        {resendIn > 0 ? (
          <Text fontSize="text-sm" lineHeight={20} tone="dim" style={{ marginTop: 24 }}>
            {`Resend code in ${mmss(resendIn)}`}
          </Text>
        ) : (
          <TouchableOpacity
            onPress={handleResendOTP}
            disabled={loading}
            accessibilityRole="button"
            hitSlop={12}
            style={{ marginTop: 24, alignSelf: "flex-start" }}
          >
            <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} tone="brand">
              Resend code
            </Text>
          </TouchableOpacity>
        )}

        {!!otpResendError && (
          <View style={{ marginTop: 8 }}>
            <MessageRow>{otpResendError}</MessageRow>
          </View>
        )}
      </ScrollContainer>

      <BottomBar
        primary={{
          label: "Continue",
          onPress: handleSubmit,
          loading,
          disabled: verificationCode.length !== CODE_LENGTH,
        }}
      />
    </NonScrollableContainer>
  );
}
