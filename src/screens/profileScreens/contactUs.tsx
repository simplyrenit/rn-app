import { SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { Linking, ScrollView, TouchableOpacity, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import {
  EnvelopeOpenIcon,
  PencilIcon,
  PhoneIcon,
} from "react-native-heroicons/outline";

// Measured off the Figma Contact Us frame: each block is padded 32 top and bottom and 24 at the sides with 16 between its
// heading and its 44pt button, and a hairline closes each one.
const BLOCK_PAD_V = 32;
const BLOCK_GAP = 16;
const HEADING_GAP = 8;
const GLYPH = 24;
const BUTTON_HEIGHT = 44;
// The design draws these buttons at radius 12; `radius.button` is 11.
const BUTTON_RADIUS = 12;

/** A block: an icon and heading, then one full-width outline button. */
function ContactBlock({
  icon,
  heading,
  label,
  onPress,
  accessibilityHint,
}: {
  icon: React.ReactNode;
  heading: string;
  label: string;
  onPress: () => void;
  accessibilityHint: string;
}) {
  const { color, shadow } = useTheme();

  return (
    <View
      style={{
        paddingVertical: BLOCK_PAD_V,
        paddingHorizontal: SCREEN_GUTTER,
        gap: BLOCK_GAP,
        borderBottomWidth: 1,
        borderBottomColor: color.line,
      }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: HEADING_GAP }}
      >
        {icon}
        <Text
          accessibilityRole="header"
          fontSize="text-md"
          fontWeight="font-bold"
        >
          {heading}
        </Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        style={[
          {
            height: BUTTON_HEIGHT,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            borderRadius: BUTTON_RADIUS,
            borderWidth: 1,
            borderColor: color.line,
            backgroundColor: color.surface,
          },
          shadow,
        ]}
      >
        <Text fontSize="text-sm" fontWeight="font-bold">
          {label}
        </Text>
        <ChevronRightIcon size={GLYPH} color={color.text} />
      </TouchableOpacity>
    </View>
  );
}

const ContactUsScreen: React.FC = () => {
  const { color } = useTheme();
  const router = useTypedNavigation();

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Contact Us" />

      {/* The frame leaves 4pt between the header and the first block. */}
      <ScrollView style={{ marginTop: 4 }}>
        <ContactBlock
          icon={<EnvelopeOpenIcon size={GLYPH} color={color.text} />}
          heading="Email us"
          label="support@simplyrenit.com"
          accessibilityHint="Opens your mail app"
          onPress={() => Linking.openURL("mailto:support@simplyrenit.com")}
        />
        <ContactBlock
          icon={<PhoneIcon size={GLYPH} color={color.text} />}
          heading="Call our customer support"
          label="+91-7297941741"
          accessibilityHint="Starts a phone call"
          onPress={() => Linking.openURL("tel:+91-7297941741")}
        />
        <ContactBlock
          icon={<PencilIcon size={GLYPH} color={color.text} />}
          heading="Leave us your feedback"
          label="Feedback & Review"
          accessibilityHint="Opens the feedback form"
          onPress={() => router.navigate("feedback")}
        />
      </ScrollView>
    </NonScrollableContainer>
  );
};

export default ContactUsScreen;
