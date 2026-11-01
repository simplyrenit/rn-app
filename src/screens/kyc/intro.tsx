import { Button, SubpageHeader, Text } from "@/components/core";
import { CheckBox } from "@/components/core/checkbox";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { SCREEN_GUTTER, MIN_TOUCH_TARGET, radius, space } from "@/lib/design-tokens";
import { track } from "@/lib/events";
import { useGlobalContext } from "@/context/global-context";
import { consentSections, KYC_CONSENT_VERSION, KYC_INDIVIDUAL_CONSENT_VERSION } from "@/lib/kyc-consent";
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
  "I've read this and agree to Renit and Cashfree Payments India Private Limited using my details to verify my business.";

const NEEDS = [
  { Icon: IdentificationIcon, text: "Your PAN" },
  { Icon: BuildingOffice2Icon, text: "Your GSTIN, if your business is registered for GST" },
  { Icon: DevicePhoneMobileIcon, text: "Your Aadhaar linked to DigiLocker. You'll confirm with an OTP." },
];
const STEPS = ["Enter your details", "Confirm with DigiLocker", "Our team reviews. We'll notify you."];

// A person's ID check (ENG-351): their own PAN and Aadhaar, nothing about a business.
const PERSON = {
  header: "Check your ID",
  title: "Check your ID once",
  body: "Renit checks your ID before you rent some higher-value items. It's done once, and then covers every booking.",
  needs: [
    { Icon: IdentificationIcon, text: "Your own PAN" },
    { Icon: DevicePhoneMobileIcon, text: "Your Aadhaar linked to DigiLocker. You'll confirm with an OTP." },
  ],
  optional: "You only need this to rent items that ask for it. Everything else can be booked without it.",
  consent:
    "I've read this and agree to Renit and Cashfree Payments India Private Limited using my details to check my ID.",
};
const BUSINESS = {
  header: "Verify your business",
  title: "Get a Verified business badge",
  body: "Renters see the badge on your profile and your listings, and can filter search to verified businesses.",
  needs: NEEDS,
  optional: "Verification is optional. You can keep listing without it. It will be needed for payouts when they launch.",
  consent: CONSENT_LABEL,
};

/**
 * What verification is, what happens to the person's data, and an informed yes before any
 * identity field is shown. A business account gets the business check; anyone else the ID check
 * (ENG-351), as rn-api decides it. Nothing is sent from this screen: the consent version goes with the
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
  const { userDetails } = useGlobalContext();
  const person = userDetails?.account_type !== "merchant";
  const words = person ? PERSON : BUSINESS;
  const version = person ? KYC_INDIVIDUAL_CONSENT_VERSION : KYC_CONSENT_VERSION;

  useEffect(() => {
    track("kyc_intro_viewed", { source });
    // Once per mount, whatever the params do later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = () => {
    track("kyc_consent_accepted", { version });
    navigation.navigate("KycDetails", {
      ...(supersede ? { supersede: true } : {}),
      ...(source === "booking" ? { source } : {}),
    });
  };

  return (
    <NonScrollableContainer>
      <SubpageHeader title={words.header} />
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
            {words.title}
          </Text>
          <Text tone="body">{words.body}</Text>
        </View>

        <View style={{ gap: space.sm }}>
          <Text fontWeight="font-bold" accessibilityRole="header">
            What you'll need
          </Text>
          {words.needs.map(({ Icon, text }) => (
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
          {words.optional}
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
          {consentSections(version).map((section) => (
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
            Version {version}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.sm }}>
          <CheckBox
            checked={agreed}
            onPress={() => setAgreed((value) => !value)}
            accessibilityLabel={words.consent}
          />
          {/* The box carries the label for screen readers; this is the same sentence for the eye. */}
          <Text
            tone="body"
            style={{ flex: 1, paddingTop: 10 }}
            accessibilityElementsHidden
            importantForAccessibility="no"
            onPress={() => setAgreed((value) => !value)}
          >
            {words.consent}
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
