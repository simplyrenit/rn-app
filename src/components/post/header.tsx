import { PinnedHeader } from "@/components/core/pinned-header";
import { useGlobalContext } from "@/context/global-context";
import { MIN_TOUCH_TARGET, ink } from "@/lib/design-tokens";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { Alert, TouchableOpacity, View } from "react-native";
import { ArrowLeftIcon, XMarkIcon } from "react-native-heroicons/outline";
import { Text } from "../core";
import { POST_FLOW_STEPS, PostProductPageIndicator } from "./page-indicator";

interface Props {
  /** Legacy percentage API. Prefer `step`. */
  percentage?: number;
  /**
   * 1-based step number. The flow has seven screens, but the indicator was
   * driven by a percentage that put two consecutive screens on the same partial
   * fill — so the customer completed a step and got no feedback.
   */
  step?: number;
  heading: string;
  showBackArrow?: boolean;
  /**
   * Shows a close button that leaves the flow. Entering Post hides the tab bar,
   * so without this the only way out of step 3 was three consecutive back taps.
   */
  showClose?: boolean;
}

export function PostProductHeader({
  percentage,
  step,
  heading,
  showBackArrow = false,
  showClose = true,
}: Props) {
  const navigation = useTypedNavigation();
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";

  const leave = () => {
    Alert.alert(
      "Discard this listing?",
      "Everything you have entered so far will be lost.",
      [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => navigation.navigate("MainTabs"),
        },
      ]
    );
  };

  return (
    <PinnedHeader gutter={false}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          // Was a fixed 96pt block for a title and a 3pt indicator.
          minHeight: MIN_TOUCH_TARGET + 8,
          paddingHorizontal: 4,
        }}
      >
        <View style={{ width: MIN_TOUCH_TARGET, alignItems: "center" }}>
          {showBackArrow ? (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeftIcon size={24} color={ink.text(isDark)} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
          <Text
            accessibilityRole="header"
            fontSize="text-md"
            fontWeight="font-semibold"
            numberOfLines={1}
          >
            {heading}
          </Text>
          {/* Seven unlabelled dashes told the customer nothing about how much
              was left. The count now leads and the bar corroborates it. */}
          {step ? (
            <Text fontSize="text-xs" tone="body">
              Step {step} of {POST_FLOW_STEPS}
            </Text>
          ) : null}
        </View>

        <View style={{ width: MIN_TOUCH_TARGET, alignItems: "center" }}>
          {showClose ? (
            <TouchableOpacity
              onPress={leave}
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Close and discard this listing"
            >
              <XMarkIcon size={24} color={ink.body(isDark)} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={{ marginTop: 8, paddingHorizontal: 12 }}>
        <PostProductPageIndicator percentage={percentage} step={step} />
      </View>
    </PinnedHeader>
  );
}
