import { SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, density, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { QuestionMarkCircleIcon } from "react-native-heroicons/outline";

// Measured off the Figma Who we are frame: the content is padded 24, the copy is
// body text (16/24) in the secondary tone, and the FAQs block follows it with a
// 16pt gap between its heading and its 44pt outline button.
const SECTION_GAP = 48;
// The frame sits its first heading 28 below the header, 4 more than the 24 gutter.
const TOP_INSET = 28;
const BLOCK_GAP = 16;
const HEADING_GAP = 8;
const GLYPH = 24;

const WhoWeAreScreen: React.FC = () => {
  const { color, shadow } = useTheme();
  const router = useTypedNavigation();

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Who we are" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: TOP_INSET,
          gap: SECTION_GAP,
          paddingBottom: density.listFooterCompact,
        }}
      >
        <View style={{ gap: HEADING_GAP }}>
          <Text accessibilityRole="header" fontSize="text-md" fontWeight="font-bold">
            What is Renit?
          </Text>
          <Text fontSize="text-md" style={{ color: color.textBody }}>
            Renit is a community that enables everyone to get access to anything by
            providing everyone with the most seamless rental marketplace. A place
            where anyone can ‘rent out’ their belongings to others or ‘rent in’
            anything they need. What really drives us at Renit is our simple yet
            profound vision to enable everyone around the world to access anything;
            fostering a world of shared abundance.
          </Text>
        </View>

        <View style={{ gap: BLOCK_GAP }}>
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: HEADING_GAP }}
          >
            <QuestionMarkCircleIcon size={GLYPH} color={color.text} />
            <Text
              accessibilityRole="header"
              fontSize="text-md"
              fontWeight="font-bold"
            >
              FAQs
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Check all FAQs"
            onPress={() => router.navigate("faq")}
            style={[
              {
                height: MIN_TOUCH_TARGET,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                borderRadius: radius.button,
                borderWidth: 1,
                borderColor: color.line,
                backgroundColor: color.surface,
              },
              shadow,
            ]}
          >
            <Text fontSize="text-sm" fontWeight="font-bold">
              Check all FAQs
            </Text>
            <ChevronRightIcon size={GLYPH} color={color.text} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </NonScrollableContainer>
  );
};

export default WhoWeAreScreen;
