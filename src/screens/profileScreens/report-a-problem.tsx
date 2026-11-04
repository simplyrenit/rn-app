import { useProfile } from "@/backend/profile";
import { Button, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import { useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/outline";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toast } from "@/lib/toast";
import { ink, colors, fontFamily, space } from "@/lib/design-tokens";

const ReportAProblemScreen: React.FC = () => {
  const { theme } = useGlobalContext();
  const { reportAProblem } = useProfile();
  const isDarkMode = theme === "dark";
  const router = useTypedNavigation();
  // The container leaves the bottom edge to the screen: the last control clears the home bar.
  const insets = useSafeAreaInsets();

  const [feedback, setFeedback] = useState<string>("");
  const submitting = useRef(false);

  const handleReportPress = async () => {
    if (submitting.current) return;

    submitting.current = true;
    try {
      await reportAProblem(feedback.trim());
      setFeedback("");
      toast.success("Your feedback has been sent");
      router.goBack();
    } catch {
      toast.error("Couldn’t send your report");
    } finally {
      submitting.current = false;
    }
  };

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Report a problem" />

      <KeyboardAwareScrollView className="px-gutter pb-5 pt-2 flex-1">
        <Text fontSize="text-sm">
          We'd love to help you out in any issue you might be facing while using
          Renit.
        </Text>

        <View className="py-3">
          <TextInput
            // The app face and the core Text's 1.4 cap: bare, the box typed in the system font, uncapped.
            maxFontSizeMultiplier={1.4}
            style={{
              textAlignVertical: "top",
              fontFamily: fontFamily.regular,
              // borderBlockColor: isDarkMode ? "#333" : "#FFF",
              color: ink.text(isDarkMode),
              // borderColor: isDarkMode ? "#444" : "#CCC",
            }}
            className={`p-4 h-40 text-[16px] rounded-group mt-4 ${
              isDarkMode
                ? "border-[1px] border-input-line-dark"
                : "border-[1px] border-input-line-light"
            }`}
            multiline={true}
            numberOfLines={10}
            placeholder="Share your thoughts..."
            placeholderTextColor={ink.dim(isDarkMode)}
            autoComplete="off"
            autoCorrect={false}
            value={feedback}
            onChangeText={setFeedback}
          />
        </View>
      </KeyboardAwareScrollView>
      <View className="pb-3 px-gutter">
        <Text
          fontSize="text-sm"
          className={`${isDarkMode ? "text-subtle-dark" : "text-subtle-light"}`}
        >
          Have any more questions?
        </Text>
        {/* Wraps: at a large font size on a 360dp phone the address and chevron ran off the edge. */}
        <View className="flex-row flex-wrap items-center mt-1">
          <Text
            fontSize="text-sm"
            fontWeight="font-bold"
          >
            Email us at
          </Text>
          <Text
            fontSize="text-sm"
            fontWeight="font-bold"
            className="text-brand mx-1"
          >
            support@simplyrenit.com
          </Text>
          <View className="mt-1">
            <ChevronRightIcon
              size={14}
              color={colors.dark.brand}
            />
          </View>
        </View>
      </View>
      {/* 14pt at least where there is no home indicator (iPhone SE, Android). */}
      <View className="pt-2 px-gutter" style={{ paddingBottom: Math.max(insets.bottom + space.sm, space.md) }}>
        <Button
          disabled={!feedback.trim() || submitting.current}
          onPress={handleReportPress}
        >
          <Text
            className={`${
              !feedback.trim()
                ? isDarkMode
                  ? "text-subtle-dark"
                  : "text-subtle-light"
                : "text-white"
            }`}
            fontWeight="font-bold"
            fontSize="text-sm"
          >
            Report
          </Text>
        </Button>
      </View>
    </NonScrollableContainer>
  );
};

export default ReportAProblemScreen;
