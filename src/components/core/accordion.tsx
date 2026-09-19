import { radius } from "@/lib/design-tokens";

import { useTheme } from "@/lib/theme";
import React, { useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  UIManager,
  View,
} from "react-native";
import { MinusIcon, PlusIcon } from "react-native-heroicons/mini";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Text } from "./text";

interface AccordionProps {
  question: string;
  answer: string;
}

// The frame draws the question row at radius 12 where `radius.button` is 11.
const FRAME_RADIUS = 12;
// The frame's plus is heroicons' mini glyph (14.4pt) in a 24pt box.
const GLYPH = 24;

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Accordion: React.FC<AccordionProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { color } = useTheme();

  const rotation = useSharedValue(0);

  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen(!isOpen);

    rotation.value = withTiming(isOpen ? 0 : 180, {
      duration: 300,
      easing: Easing.inOut(Easing.ease),
    });
  };

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <View
      style={[
        {
          // The frame draws these cards at radius 12 with a hairline and no
          // shadow, 8 apart (the list owns the gap, so there is no margin here).
          borderRadius: FRAME_RADIUS,
          borderWidth: 1,
          backgroundColor: color.surface,
          borderColor: color.line,
          overflow: "hidden",
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={question}
        // The divider used to be an interpolated arbitrary class, which
        // NativeWind cannot resolve at build time, so it silently never drew.
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          // 16 from the card's outer edge: the 1pt border is part of it.
          padding: 15,
          // 56 outside edge to outside edge: the card's own 1pt borders make up
          // the other 2.
          minHeight: 54,
          borderBottomWidth: isOpen ? 1 : 0,
          borderBottomColor: color.line,
        }}
        onPress={toggleAccordion}
      >
        <View className=" flex-1 pr-3">
          <Text fontSize="text-sm" fontWeight="font-bold">
            {question}
          </Text>
        </View>
        <Animated.View style={animatedIconStyle}>
          {isOpen ? (
            <MinusIcon size={GLYPH} color={color.textDim} />
          ) : (
            <PlusIcon size={GLYPH} color={color.textDim} />
          )}
        </Animated.View>
      </Pressable>
      {isOpen && (
        <View style={{ padding: 14 }}>
          <Text fontSize="text-md" tone="body">
            {answer}
          </Text>
        </View>
      )}
    </View>
  );
};

export default Accordion;
