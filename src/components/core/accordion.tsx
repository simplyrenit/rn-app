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
import { MinusIcon, PlusIcon } from "react-native-heroicons/solid";
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

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Accordion: React.FC<AccordionProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { color, shadow } = useTheme();

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
          borderRadius: radius.group,
          borderWidth: 1,
          marginVertical: 8,
          backgroundColor: color.surface,
          borderColor: color.line,
          overflow: "hidden",
        },
        shadow,
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
          padding: 14,
          minHeight: 56,
          borderBottomWidth: isOpen ? 1 : 0,
          borderBottomColor: color.line,
        }}
        onPress={toggleAccordion}
      >
        <View className=" flex-1 pr-3">
          <Text
            fontSize="text-base"
            fontWeight="font-bold"
          >
            {question}
          </Text>
        </View>
        <Animated.View style={animatedIconStyle}>
          {isOpen ? (
            <MinusIcon size={20} color={color.textBody} />
          ) : (
            <PlusIcon size={20} color={color.textBody} />
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
