import { SignUpError, useAuth } from "@/backend/auth";
import { HeaderIndicator } from "@/components/auth/headerIndicator";
import { BottomBar, NonScrollableContainer, ScrollContainer, Text, TextField } from "@/components/core";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { View } from "react-native";

const isE164Phone = (phone: string) => /^\+[1-9]\d{7,14}$/.test(phone);

/** Dev-only design seed (ENG-428 plan §1): only DevFixture passes it. */
type PhoneDesign = { phone: string; error?: string };

export default function LoginWithPhone() {
  const router = useTypedNavigation();
  const route = useRoute();
  const design = __DEV__ ? (route.params as { design?: PhoneDesign } | undefined)?.design : undefined;
  const { sendPhoneOTP, loading } = useAuth();
  const [phone, setPhone] = useState(design?.phone ?? "");
  const [error, setError] = useState(design?.error ?? "");

  const handleSubmit = useCallback(async () => {
    // A design seed never sends an SMS.
    if (design) return;
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
  }, [design, phone, router, sendPhoneOTP]);

  return (
    <NonScrollableContainer>
      <HeaderIndicator percentage={0} />
      <ScrollContainer containerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 24 }}>
        <Text role="screenTitle">Continue with your mobile number</Text>
        <View style={{ marginTop: 24 }}>
          <TextField
            label="Mobile number"
            placeholder="+919876543210"
            value={phone}
            onChangeText={(value) => {
              setPhone(value.replace(/[\s-]/g, ""));
              setError("");
            }}
            error={error || undefined}
            maxFontSizeMultiplier={1.4}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            accessibilityLabel="Phone number"
          />
        </View>
      </ScrollContainer>
      <BottomBar
        primary={{
          label: loading ? "Sending code..." : "Continue with Mobile OTP",
          onPress: handleSubmit,
          disabled: !phone,
          loading,
        }}
      />
    </NonScrollableContainer>
  );
}
