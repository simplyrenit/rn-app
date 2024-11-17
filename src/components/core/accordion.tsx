import { useGlobalContext } from "@/context/global-context";
import React, { useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
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
  const { theme } = useGlobalContext();

  const isDarkMode = theme === "dark";

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
      className="rounded-2xl border-[1px] my-2"
      style={[isDarkMode ? styles.darkContainer : styles.lightContainer]}
    >
      <Pressable
        className={`flex-row justify-between items-center p-3  ${
          isOpen
            ? `border-b border-b-[${isDarkMode ? "#292929" : "#e6e6e6"}]`
            : ""
        }`}
        onPress={toggleAccordion}
      >
        <View className=" flex-1 pr-3">
          <Text fontSize="text-base" fontWeight="font-bold">
            {question}
          </Text>
        </View>
        <Animated.View style={animatedIconStyle}>
          {isOpen ? (
            <MinusIcon
              size={20}
              color={isDarkMode ? "#FFFFFF80" : "#00000080"}
            />
          ) : (
            <PlusIcon
              size={20}
              color={isDarkMode ? "#FFFFFF80" : "#00000080"}
            />
          )}
        </Animated.View>
      </Pressable>
      {isOpen && (
        <View className="p-3">
          <Text fontSize="text-sm">{answer}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  darkContainer: {
    backgroundColor: "#0F0F0F",
    borderColor: "#444",
  },
  lightContainer: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
  },
  darkText: {
    color: "#fff",
  },
  lightText: {
    color: "#000",
  },
});

export default Accordion;
