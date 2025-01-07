import { useProfile } from "@/backend/profile";
import { Button, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import { useState } from "react";
import { Platform, TextInput, TouchableOpacity, View } from "react-native";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
} from "react-native-heroicons/outline";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import Toast from "react-native-toast-message";

interface FeedbackNReviewProps {}

const FeedbackNReviewScreen: React.FC<FeedbackNReviewProps> = () => {
  const { theme } = useGlobalContext();
  const { giveFeedback } = useProfile();
  const isDarkMode = theme === "dark";
  const router = useTypedNavigation();

  const [feedback, setFeedback] = useState<string>("");

  const handleFeedBackPress = async () => {
    const res = await giveFeedback(feedback.trim());
    if (res.user) {
      setFeedback("");
      Toast.show({
        type: "customToast",
        position: "bottom",
        text1: "Your feedback has been sent",
        text2: "success",
      });
      router.goBack();
    }
  };

  return (
    <NonScrollableContainer>
      <View className="flex-row items-center justify-between px-5 pb-2 pt-2">
        <TouchableOpacity
          onPress={() => router.goBack()}
          className="flex-1 items-start w-[10%]"
        >
          <ArrowLeftIcon
            size={26}
            color={isDarkMode ? "#FFF" : "#000"}
          />
        </TouchableOpacity>
        <View className="items-center justify-center w-[80%]">
          <Text
            fontSize="text-xl"
            fontWeight="font-bold"
          >
            Feedback & Review
          </Text>
        </View>

        <View className="w-[10%]"></View>
      </View>

      <KeyboardAwareScrollView className="px-5 pb-5 pt-2 flex-1">
        <Text fontSize="text-sm">
          Thanks for sending us your feedback and ideas to improve. We can't
          respond to all individually, but we'll pass it on to the teams who are
          working to help make Renit better for everyone.
        </Text>

        <View className="py-3">
          <TextInput
            style={{
              textAlignVertical: "top",
              // borderBlockColor: isDarkMode ? "#333" : "#FFF",
              color: isDarkMode ? "#FFF" : "#000",
              // borderColor: isDarkMode ? "#444" : "#CCC",
            }}
            className={`p-4 h-40 text-[16px] rounded-2xl mt-4 ${
              isDarkMode
                ? "border-[1px] border-[#292929]"
                : "border-[1px] border-[#e6e6e6]"
            }`}
            multiline={true}
            numberOfLines={10}
            placeholder="Share your thoughts..."
            placeholderTextColor={isDarkMode ? "#FFFFFF80" : "#00000080"}
            autoComplete="off"
            autoCorrect={false}
            value={feedback}
            onChangeText={setFeedback}
          />
        </View>
      </KeyboardAwareScrollView>
      <View className="pb-3 px-5">
        <Text
          fontSize="text-sm"
          className={`${isDarkMode ? "text-[#ffffff80]" : "text-[#00000080]"}`}
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
            className="text-brand-blue mx-1"
          >
            support@simplyrenit.com
          </Text>
          <View className="mt-1 ">
            <ChevronRightIcon
              size={14}
              color="#635be8"
            />
          </View>
        </View>
      </View>
      <View className={`px-5 py-2`}>
        <Button
          disabled={!feedback.trim()}
          onPress={handleFeedBackPress}
        >
          <Text
            className={`${
              !feedback.trim()
                ? isDarkMode
                  ? "text-[#ffffff80]"
                  : "text-[#00000080]"
                : "text-white"
            }`}
            fontWeight="font-bold"
            fontSize="text-sm"
          >
            Submit feedback
          </Text>
        </Button>
      </View>
    </NonScrollableContainer>
  );
};

export default FeedbackNReviewScreen;
