import { SignUpError, useAuth } from "@/backend/auth";
import { BottomBar, FieldError, NonScrollableContainer, ScrollContainer, SubpageHeader, Text, TextField } from "@/components/core";
import { useAuthContext } from "@/context/auth-context";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { View } from "react-native";

const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

/** Dev-only design seed: only DevFixture passes it. */
type EmailDesign = { email: string; touched?: boolean };

/**
 * 02b email (2179:31895): code only. The emailed code signs an existing account in and starts a new one, so there
 * is no password and no "sign up or sign in" choice. Accounts made with a password before still sign in this way.
 */
export default function LoginWithEmail() {
  const route = useRoute();
  const design = __DEV__ ? (route.params as { design?: EmailDesign } | undefined)?.design : undefined;

  const [email, setEmail] = useState(design?.email ?? "");
  const [isTouched, setIsTouched] = useState(design?.touched ?? false);
  const [sendError, setSendError] = useState("");
  const isValid = validateEmail(email);

  const { saveUser } = useAuthContext();
  const { sendOTP, loading } = useAuth();
  const router = useTypedNavigation();

  const handleSubmit = useCallback(async () => {
    // A design seed never sends a code or opens the next step.
    if (design) return;
    setIsTouched(true);
    if (!isValid) return;
    const address = email.trim();
    setSendError("");
    saveUser({ email: address });
    try {
      await sendOTP(address);
    } catch (error: any) {
      setSendError((error as SignUpError).message || "We couldn't send a code. Try again.");
      return;
    }
    router.navigate("Verify", { email: address, verificationType: "otp" });
  }, [design, email, isValid, router, saveUser, sendOTP]);

  return (
    <NonScrollableContainer>
      <SubpageHeader variant="back-only" />

      <ScrollContainer containerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 24 }}>
        <Text role="screenTitle">Continue with email</Text>

        <View style={{ marginTop: 24 }}>
          <TextField
            label="Email"
            placeholder="Enter email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setSendError("");
            }}
            onBlur={() => setIsTouched(true)}
            error={!isValid && isTouched && email ? "Enter a valid email address" : undefined}
            maxFontSizeMultiplier={1.4}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={!design}
            // Without textContentType/autoComplete, iCloud Keychain will not offer to fill this address.
            textContentType="emailAddress"
            autoComplete="email"
            accessibilityLabel="Email address"
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
          />
        </View>

        {sendError ? (
          <View style={{ marginTop: -12, marginBottom: 12 }}>
            <FieldError>{sendError}</FieldError>
          </View>
        ) : null}

        {/* TextField keeps 18 under itself; the hint sits 12 under the box. */}
        <Text fontSize="text-sm" lineHeight={20} tone="body" style={{ marginTop: -6 }}>
          We'll email you a 6-digit code. New here? We'll create your account.
        </Text>
      </ScrollContainer>

      <BottomBar primary={{ label: "Send code", onPress: handleSubmit, loading, disabled: !email.trim() || loading }} />
    </NonScrollableContainer>
  );
}
