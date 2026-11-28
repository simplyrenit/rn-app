import { SignUpError, useAuth } from "@/backend/auth";
import { LoginOptions, TermsAndPolicy } from "@/components/auth";
import { PhoneField } from "@/components/auth/phone-field";
import { INDIA, PhoneCountry, toE164 } from "@/lib/phone-number";
import { Button, NonScrollableContainer, Text } from "@/components/core";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";

// 02b sign-in (2179:31785), in pt under the status bar. One screen for signing up and signing in: the server makes
// the account on the first confirmed code, so there is nothing to choose between. The art is the "Rent anything"
// illustration cut to its top 202 (logo and first listing card) with a 48 fade into the canvas; the title block sits
// 24 above the sign-in block, which ends 30 above the screen's bottom edge as on the 02 Welcome frame.
// The art gives up its height first: on a short screen, a large font or with the keyboard up it shrinks to nothing,
// then the whole screen scrolls, so the number field and Continue are never under the keyboard.
const ART_TOP = 8;
const ART_MAX = 202;
const ART_IMAGE = 326;
const FADE = 48;
const TITLE_GAP = 8;
const TITLE_TO_BLOCK = 24;
const BLOCK_GAP = 16;
const BOTTOM = 30;

/** Dev-only design seed: only DevFixture passes it. */
type SignInDesign = { phone?: string; error?: string };

export default function SignInScreen(): JSX.Element {
  const { color, isDark } = useTheme();
  const router = useTypedNavigation();
  const route = useRoute<RouteProps<"Welcome">>();
  const design = __DEV__ ? (route.params as { design?: SignInDesign } | undefined)?.design : undefined;
  const { sendPhoneOTP, loading } = useAuth();

  const [country, setCountry] = useState<PhoneCountry>(INDIA);
  const [phone, setPhone] = useState(design?.phone ?? "");
  const [error, setError] = useState(design?.error ?? "");
  const [viewport, setViewport] = useState(0);
  const [content, setContent] = useState(0);
  const art = viewport && content ? Math.max(0, Math.min(ART_MAX, viewport - content - ART_TOP)) : ART_MAX;

  const handleContinue = useCallback(async () => {
    // A design seed never sends an SMS.
    if (design) return;
    const e164 = toE164(country, phone);
    if (!e164) {
      setError(country.cca2 === "IN" ? "Enter your 10-digit mobile number." : "Enter a valid mobile number.");
      return;
    }
    setError("");
    try {
      await sendPhoneOTP(e164);
      router.navigate("Verify", { phone: e164, verificationType: "phone" });
    } catch (requestError: any) {
      setError((requestError as SignUpError).message || "We couldn't send a code. Try again.");
    }
  }, [country, design, phone, router, sendPhoneOTP]);

  return (
    <NonScrollableContainer>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
        style={{ backgroundColor: color.canvas }}
        onLayout={(e) => setViewport(Math.round(e.nativeEvent.layout.height))}
      >
        {art > 0 && (
          <View style={{ marginTop: ART_TOP, height: art, overflow: "hidden" }}>
            <Image
              source={
                isDark
                  ? require("../../assets/auth/rent-anything-dark.png")
                  : require("../../assets/auth/rent-anything-light.png")
              }
              style={{ width: "100%", height: ART_IMAGE }}
              contentFit="contain"
              contentPosition="top"
            />
            <LinearGradient
              pointerEvents="none"
              colors={[`${color.canvas}00`, color.canvas]}
              style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: FADE }}
            />
          </View>
        )}

        <View
          style={{ flexGrow: 1, justifyContent: "flex-end", paddingHorizontal: SCREEN_GUTTER, paddingBottom: BOTTOM }}
        >
          <View onLayout={(e) => setContent(Math.round(e.nativeEvent.layout.height) + BOTTOM)}>
            <View style={{ gap: TITLE_GAP, marginBottom: TITLE_TO_BLOCK }}>
              <Text fontSize="text-lg" fontWeight="font-bold" lineHeight={28} style={{ textAlign: "center" }}>
                Rent anything nearby
              </Text>
              <Text fontSize="text-md" lineHeight={24} tone="body" style={{ textAlign: "center" }}>
                Sign in or create an account
              </Text>
            </View>

            <View style={{ gap: BLOCK_GAP }}>
              <PhoneField
                country={country}
                onCountryChange={(next) => {
                  setCountry(next);
                  setError("");
                }}
                value={phone}
                onChangeText={(value) => {
                  setPhone(value);
                  setError("");
                }}
                error={error || undefined}
                autoFocus={Boolean(route.params?.focusPhone)}
                onSubmitEditing={handleContinue}
              />
              <Button onPress={handleContinue} loading={loading} disabled={!phone.trim() || loading}>
                Continue
              </Button>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <View style={{ flex: 1, height: 1, backgroundColor: color.line }} />
                <Text fontSize="text-xs" lineHeight={16} tone="dim">
                  or
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: color.line }} />
              </View>

              <LoginOptions />
              <TermsAndPolicy />
            </View>
          </View>
        </View>
      </ScrollView>
    </NonScrollableContainer>
  );
}
