import { useProfile } from "@/backend/profile";
import { Button, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import { useRef, useState } from "react";
import { Platform, TextInput, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/outline";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import { toast } from "@/lib/toast";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, colors, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";

// Measured off the Figma Feedback & Review frame: the copy sits 28 under the header on
// the 24 gutter, the field is 200 tall with 16 padding, and 16 separates the blocks.
const TOP_INSET = 28;
const BLOCK_GAP = 16;
const FIELD_HEIGHT = 200;
const FIELD_PADDING = 16;

interface FeedbackNReviewProps {}

const FeedbackNReviewScreen: React.FC<FeedbackNReviewProps> = () => {
  const { theme } = useGlobalContext();
  const { giveFeedback } = useProfile();
  const isDarkMode = theme === "dark";
  const { color } = useTheme();
  const router = useTypedNavigation();

  const [feedback, setFeedback] = useState<string>("");
  const submitting = useRef(false);

  const handleFeedBackPress = async () => {
    if (submitting.current) return;

    submitting.current = true;
    try {
      await giveFeedback(feedback.trim());
      setFeedback("");
      toast.success("Your feedback has been sent");
      router.goBack();
    } catch {
      toast.error("Couldn’t send your feedback");
    } finally {
      submitting.current = false;
    }
  };

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Feedback & Review" />

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: TOP_INSET,
          gap: BLOCK_GAP,
        }}
      >
        <Text fontSize="text-sm">
          Thanks for sending us your feedback and ideas to improve. We can’t
          respond to all individually, but we’ll pass it on to the teams who are
          working to help make Renit better for everyone.
        </Text>

        <TextInput
          style={{
            textAlignVertical: "top",
            height: FIELD_HEIGHT,
            padding: FIELD_PADDING,
            fontSize: 16,
            color: color.text,
            borderWidth: 1,
            // The frame draws this box with the hairline tone and a 16 radius.
            borderColor: color.line,
            borderRadius: radius.card,
            // No fill: the dark frame leaves the box the page's own black.
          }}
          multiline={true}
          numberOfLines={10}
          placeholder="Share your thoughts..."
          placeholderTextColor={color.placeholder}
          autoComplete="off"
          autoCorrect={false}
          value={feedback}
          onChangeText={setFeedback}
        />

        {feedback.trim() ? (
          <Button
            disabled={submitting.current}
            onPress={handleFeedBackPress}
          >
            <Text className="text-white" fontWeight="font-bold" fontSize="text-sm">
              Submit feedback
            </Text>
          </Button>
        ) : (
          // The frame draws the empty state as bare grey text with no fill; it
          // becomes the primary button once there is something to send.
          <View
            accessible
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            accessibilityLabel="Submit feedback"
            style={{
              height: MIN_TOUCH_TARGET,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              fontSize="text-sm"
              fontWeight="font-bold"
              style={{ color: color.textDim }}
            >
              Submit feedback
            </Text>
          </View>
        )}
      </KeyboardAwareScrollView>

      <View className="pb-3 px-gutter">
        <Text
          fontSize="text-sm"
          className={`${isDarkMode ? "text-subtle-dark" : "text-subtle-light"}`}
        >
          Have any more questions?
        </Text>
        <View className="flex-row items-center mt-1">
          <Text fontSize="text-sm" fontWeight="font-bold">
            Email us at
          </Text>
          <Text
            fontSize="text-sm"
            fontWeight="font-bold"
            className="text-brand mx-1"
          >
            support@simplyrenit.com
          </Text>
          <View className="mt-1 ">
            <ChevronRightIcon size={14} color={colors.dark.brand} />
          </View>
        </View>
      </View>
    </NonScrollableContainer>
  );
};

export default FeedbackNReviewScreen;
