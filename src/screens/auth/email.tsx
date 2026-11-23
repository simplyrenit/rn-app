import { SignUpError, useAuth } from "@/backend/auth";
import { HeaderIndicator } from "@/components/auth/headerIndicator";
import { BottomBar, NonScrollableContainer, ScrollContainer, Text, TextField } from "@/components/core";
import { useAuthContext } from "@/context/auth-context";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { InformationCircleIcon } from "react-native-heroicons/outline";

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/** Dev-only design seed (ENG-428 plan §1): only DevFixture passes it. */
type EmailDesign = { email: string; touched?: boolean };

export default function LoginWithEmail() {
  const { color } = useTheme();
  const route = useRoute();
  const design = __DEV__ ? (route.params as { design?: EmailDesign } | undefined)?.design : undefined;

  const [email, setEmail] = useState(design?.email ?? "");
  const [isValid, setIsValid] = useState(design ? validateEmail(design.email) : true);
  const [isTouched, setIsTouched] = useState(design?.touched ?? false);
  const [otpSendError, setOtpSendError] = useState("");

  const { saveUser } = useAuthContext();
  const { sendOTP } = useAuth();

  const router = useTypedNavigation();

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
    setIsValid(validateEmail(text));
    setIsTouched(true);
    setOtpSendError("");
  }, []);

  const handleSubmit = useCallback(
    async (verificationType: "otp" | "password") => {
      // A design seed never sends a code or opens the next step.
      if (design) return;
      if (validateEmail(email)) {
        setOtpSendError("");
        saveUser({ email });

        if (verificationType === "otp") {
          try {
            await sendOTP(email);
          } catch (error: any) {
            const otpError = error as SignUpError;
            setOtpSendError(
              otpError.message || "Unable to send OTP right now. Please try again."
            );
            return;
          }
          router.navigate("Verify", { email, verificationType });
        } else {
          router.navigate("Verify", { email, verificationType });
        }
      } else {
        setIsValid(false);
      }
    },
    [design, email, router, saveUser, sendOTP]
  );

  const passwordDisabled = !isValid || !email;

  return (
    <NonScrollableContainer>
      <HeaderIndicator percentage={0} />

      <ScrollContainer containerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 24 }}>
        <Text role="screenTitle">Welcome to Renit</Text>

        <View style={{ marginTop: 24 }}>
          <TextField
            label="Enter your email"
            placeholder="Enter email"
            value={email}
            onChangeText={handleEmailChange}
            error={!isValid && isTouched ? "Please enter a valid email address" : undefined}
            maxFontSizeMultiplier={1.4}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            // Without textContentType/autoComplete, iCloud Keychain will not
            // offer to fill or save this credential at all.
            textContentType="emailAddress"
            autoComplete="email"
            accessibilityLabel="Email address"
            returnKeyType="next"
          />
        </View>

        {!!otpSendError && (
          // No frame draws it: the non-field message row (plan §3), where the code always showed it.
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 18 }}>
            <InformationCircleIcon size={16} color={color.text} />
            <Text fontSize="text-xs" fontWeight="font-medium" lineHeight={16} style={{ flexShrink: 1, color: color.dangerStrong }}>
              {otpSendError}
            </Text>
          </View>
        )}

        {/* "Other ways in" (21637): two 14/20 SemiBold links, 36 apart, 24 under the field (TextField keeps 18
            below itself). The password link keeps today's rule, disabled while the address is not valid, and is
            dimmed to the frame's 38% then (21681). */}
        <View style={{ marginTop: 6, gap: 16, alignItems: "flex-start" }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: passwordDisabled }}
            disabled={passwordDisabled}
            hitSlop={8}
            onPress={() => handleSubmit("password")}
          >
            <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} tone="brand" style={{ opacity: passwordDisabled ? 0.38 : 1 }}>
              Use my password
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.navigate("Phone")}>
            <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} tone="brand">
              Use my phone number instead
            </Text>
          </Pressable>
        </View>
      </ScrollContainer>

      <BottomBar
        primary={{ label: "Email me a code", onPress: () => handleSubmit("otp"), disabled: !isValid || !email }}
      />
    </NonScrollableContainer>
  );
}
