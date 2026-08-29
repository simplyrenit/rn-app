import { useProfile } from "@/backend/profile";
import { Button, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import { useRef, useState } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
} from "react-native-heroicons/outline";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";

import { toast } from "@/lib/toast";
import { ink, colors } from "@/lib/design-tokens";

const ReportAProblemScreen: React.FC = () => {
  const { theme } = useGlobalContext();
  const { reportAProblem } = useProfile();
  const isDarkMode = theme === "dark";
  const router = useTypedNavigation();

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
      <View className="flex-row items-center justify-between px-gutter pb-2 pt-2 ">
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
          onPress={() => router.goBack()}
          className="flex-1 items-start w-[10%]"
        >
          <ArrowLeftIcon
            size={26}
            color={ink.text(isDarkMode)}
          />
        </TouchableOpacity>
        <View className="items-center justify-center w-[80%]">
          <Text
            fontSize="text-xl"
            fontWeight="font-bold"
          >
            Report a problem
          </Text>
        </View>

        <View className="w-[10%]"></View>
      </View>

      <KeyboardAwareScrollView className="px-gutter pb-5 pt-2 flex-1">
        <Text fontSize="text-sm">
          We'd love to help you out in any issue you might be facing while using
          Renit.
        </Text>

        <View className="py-3">
          <TextInput
            style={{
              textAlignVertical: "top",
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
        <View className="flex-row items-center mt-1">
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
      <View className="py-2 px-gutter">
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
