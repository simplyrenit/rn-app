import { PinnedHeader } from "@/components/core/pinned-header";
import { useGlobalContext } from "@/context/global-context";
import { MIN_TOUCH_TARGET, ink } from "@/lib/design-tokens";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { Alert, View } from "react-native";
import { XMarkIcon } from "react-native-heroicons/outline";
import { BackButton, IconButton, Text } from "../core";
import { POST_FLOW_STEPS, PostProductPageIndicator } from "./page-indicator";

/**
 * Measured off the Figma post frames (`1:13231`, `1:13333`, `1:13455`,
 * `1:13650`), all of which draw the same header: a 44pt row with the title
 * centred at 18 bold, the back control 16 from the screen edge (not on the 24
 * gutter the content uses, exactly as `SubpageHeader` measured it), the
 * progress bar 22.5pt below the title's baseline, and no hairline under the
 * block.
 */
const EDGE_INSET = 16;
/**
 * The frames put 22.5pt of air between the title baseline and the bar. The
 * wizard spends most of it on the "Step N of 7" caption the frames do not draw,
 * so the bar lands a few points lower here than in Figma — the one place the
 * kept structure and the design disagree. See `design/audit.md`.
 */
const BAR_GAP = 0;
/**
 * Caption leading, tightened from the 18 the 12pt ramp ships, so the caption
 * and the bar together still fit the 16pt the frames leave under the title.
 */
const CAPTION_LEADING = 16;
/** Places the title's cap line where the frames put it, under the status bar. */
const HEADER_PADDING = { paddingTop: 26, paddingBottom: 16 };

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
    <PinnedHeader
      gutter={false}
      // The frames draw no rule under the header and no band behind it — the
      // block is part of the page. On true black a blur reads as a grey band
      // that is not there (it measured 8/255 over the canvas), so this takes
      // the solid material `PinnedHeader` ships for exactly that case.
      separator={false}
      material="solid"
      style={HEADER_PADDING}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          // Was a fixed 96pt block for a title and a 3pt indicator.
          minHeight: MIN_TOUCH_TARGET,
          paddingHorizontal: EDGE_INSET,
        }}
      >
        <View style={{ width: MIN_TOUCH_TARGET, alignItems: "center" }}>
          {showBackArrow ? <BackButton /> : null}
        </View>

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            accessibilityRole="header"
            fontSize="text-base"
            fontWeight="font-bold"
            numberOfLines={1}
          >
            {heading}
          </Text>
          {/* Seven unlabelled dashes told the customer nothing about how much
              was left. The count now leads and the bar corroborates it. The
              frames draw no caption here, so this is the one place the wizard
              header is deliberately taller than the design. */}
          {step ? (
            <Text fontSize="text-xs" tone="body" lineHeight={CAPTION_LEADING}>
              Step {step} of {POST_FLOW_STEPS}
            </Text>
          ) : null}
        </View>

        <View style={{ width: MIN_TOUCH_TARGET, alignItems: "center" }}>
          {showClose ? (
            <IconButton
              onPress={leave}
              accessibilityLabel="Close and discard this listing"
            >
              <XMarkIcon size={24} color={ink.body(isDark)} />
            </IconButton>
          ) : null}
        </View>
      </View>

      <View style={{ marginTop: BAR_GAP }}>
        <PostProductPageIndicator percentage={percentage} step={step} />
      </View>
    </PinnedHeader>
  );
}
