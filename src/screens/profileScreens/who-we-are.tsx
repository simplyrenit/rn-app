import { BackButton, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import { TouchableOpacity, View } from "react-native";
import {
  ChevronRightIcon,
  QuestionMarkCircleIcon,
} from "react-native-heroicons/outline";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { ink, MIN_TOUCH_TARGET, space } from "@/lib/design-tokens";

interface WhoWeAreProps {}

const WhoWeAreScreen: React.FC<WhoWeAreProps> = () => {
  const { theme } = useGlobalContext();

  const isDarkMode = theme === "dark";
  const router = useTypedNavigation();

  return (
    <NonScrollableContainer>
      <View className="flex-row items-center px-gutter pb-2 pt-2">
        <BackButton />
        <View className="flex-1 items-center justify-center">
          <Text role="sectionTitle" fontWeight="font-bold">
            Who we are
          </Text>
        </View>
        <View style={{ width: MIN_TOUCH_TARGET }} />
      </View>

      <KeyboardAwareScrollView className="px-gutter pb-5 pt-2 flex-1">
        <Text
          fontSize="text-base"
          fontWeight="font-bold"
          style={{ paddingVertical: space.sm }}
        >
          What is Renit?
        </Text>
        <Text
          lineHeight={23}
          fontSize="text-base"
          className={`leading-6 ${
            isDarkMode ? "text-muted-dark" : "text-muted-light"
          }`}
        >
          Renit is a community that enables everyone to get
          access to anything by providing everyone with the most seamless rental
          marketplace. A place where anyone can ‘rent out’ their belongings to
          others or ‘rent in’ anything they need. What really drives us at Renit
          is our simple yet profound vision to enable everyone around the world
          to access anything; fostering a world of shared abundance.
        </Text>
      </KeyboardAwareScrollView>
      <View
        style={{ paddingVertical: space.xl }}
        className="px-gutter flex-1 justify-end py-0 "
      >
        <View className="flex-row space-x-2 items-center">
          <QuestionMarkCircleIcon
            size={24}
            color={ink.text(isDarkMode)}
          />
          <Text
            fontSize="text-base"
            fontWeight="font-bold"
          >
            FAQs
          </Text>
        </View>
        <View className="py-4">
          <TouchableOpacity
            onPress={() => {
              router.navigate("faq");
            }}
            className={`flex-row h-12 rounded-card border ${
              isDarkMode
                ? "bg-surface-dark border-line-dark"
                : "bg-surface-light border-line-light"
            } items-center justify-center`}
          >
            <Text
              className="px-2"
              fontSize="text-sm"
              fontWeight="font-bold"
            >
              Check all FAQs
            </Text>
            <ChevronRightIcon
              size={20}
              strokeWidth={2}
              color={ink.text(isDarkMode)}
            />
          </TouchableOpacity>
        </View>
      </View>
    </NonScrollableContainer>
  );
};

export default WhoWeAreScreen;
