import { Button, SubpageHeader, Text } from "@/components/core";
import { CheckBox } from "@/components/core/checkbox";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { SCREEN_GUTTER, MIN_TOUCH_TARGET, radius, space } from "@/lib/design-tokens";
import { track } from "@/lib/events";
import { consentSections, KYC_CONSENT_VERSION } from "@/lib/kyc-consent";
import { useTheme } from "@/lib/theme";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import {
  BuildingOffice2Icon,
  ChevronRightIcon,
  DevicePhoneMobileIcon,
  IdentificationIcon,
  ShieldCheckIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HERO = 56;
const CONSENT_LABEL =
  "I've read this and agree to Renit and [VERIFICATION PARTNER] using my details to verify my business.";

const NEEDS = [
  { Icon: IdentificationIcon, text: "Your PAN" },
  { Icon: BuildingOffice2Icon, text: "Your GSTIN, if your business is registered for GST" },
  { Icon: DevicePhoneMobileIcon, text: "Your Aadhaar linked to DigiLocker. You'll confirm with an OTP." },
];
const STEPS = ["Enter your details", "Confirm with DigiLocker", "Our team reviews. We'll notify you."];

/**
 * What verification is, what happens to the merchant's data, and an informed yes before any
 * identity field is shown. Nothing is sent from this screen: the consent version goes with the
 * start request, and the box starts unticked every time the screen opens.
 */
export default function KycIntroScreen() {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProps<"KycIntro">>();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const [agreed, setAgreed] = useState(false);
  const source = route.params?.source ?? "profile";
  const supersede = route.params?.supersede;

  useEffect(() => {
    track("kyc_intro_viewed", { source });
    // Once per mount, whatever the params do later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = () => {
    track("kyc_consent_accepted", { version: KYC_CONSENT_VERSION });
    navigation.navigate("KycDetails", supersede ? { supersede: true } : undefined);
  };

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Verify your business" />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.lg,
          paddingBottom: space.lg,
          gap: space.lg,
        }}
      >
        <View style={{ gap: space.sm }}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              width: HERO,
              height: HERO,
              borderRadius: radius.full,
              backgroundColor: color.brand,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldCheckIcon size={30} color={color.onBrand} />
          </View>
          <Text fontSize="text-xl" fontWeight="font-bold" accessibilityRole="header">
            Get a Verified business badge
          </Text>
          <Text tone="body">
            Renters see the badge on your profile and your listings, and can filter search to verified
            businesses.
          </Text>
        </View>

        <View style={{ gap: space.sm }}>
          <Text fontWeight="font-bold" accessibilityRole="header">
            What you'll need
          </Text>
          {NEEDS.map(({ Icon, text }) => (
            <View key={text} style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start" }}>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Icon size={22} color={color.brandText} />
              </View>
              <Text tone="body" style={{ flex: 1 }}>
                {text}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ gap: space.sm }}>
          <Text fontWeight="font-bold" accessibilityRole="header">
            How it works
          </Text>
          {STEPS.map((step, index) => (
            <Text key={step} tone="body">
              {index + 1}. {step}
            </Text>
          ))}
        </View>

        <Text tone="dim" fontSize="text-sm">
          Verification is optional. You can keep listing without it. It will be needed for payouts when
          they launch.
        </Text>

        <View
          style={{
            gap: space.md,
            padding: space.md,
            borderRadius: radius.group,
            borderWidth: 1,
            borderColor: color.line,
            backgroundColor: color.surface,
          }}
        >
          <Text fontWeight="font-bold" accessibilityRole="header">
            How we use your information
          </Text>
          {consentSections(KYC_CONSENT_VERSION).map((section) => (
            <View key={section.heading} style={{ gap: 2 }}>
              <Text fontWeight="font-semibold" fontSize="text-sm">
                {section.heading}
              </Text>
              <Text tone="body" fontSize="text-sm">
                {section.body}
              </Text>
            </View>
          ))}
          <TouchableOpacity
            accessibilityRole="link"
            onPress={() => navigation.navigate("Privacy")}
            style={{ minHeight: MIN_TOUCH_TARGET, flexDirection: "row", alignItems: "center" }}
          >
            <Text tone="brand" fontWeight="font-semibold" style={{ flex: 1 }}>
              Read our Privacy Policy
            </Text>
            <ChevronRightIcon size={18} color={color.brandText} />
          </TouchableOpacity>
          <Text tone="dim" fontSize="text-xs">
            Version {KYC_CONSENT_VERSION}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.sm }}>
          <CheckBox
            checked={agreed}
            onPress={() => setAgreed((value) => !value)}
            accessibilityLabel={CONSENT_LABEL}
          />
          {/* The box carries the label for screen readers; this is the same sentence for the eye. */}
          <Text
            tone="body"
            style={{ flex: 1, paddingTop: 10 }}
            accessibilityElementsHidden
            importantForAccessibility="no"
            onPress={() => setAgreed((value) => !value)}
          >
            {CONSENT_LABEL}
          </Text>
        </View>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.sm,
          paddingBottom: insets.bottom + space.sm,
        }}
      >
        <Button onPress={next} disabled={!agreed}>
          Continue
        </Button>
      </View>
    </NonScrollableContainer>
  );
}
