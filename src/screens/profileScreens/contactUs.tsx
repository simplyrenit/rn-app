import { BackButton, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import { ScrollView, TouchableOpacity, View, Linking } from "react-native";
import {
  ChevronRightIcon,
  EnvelopeOpenIcon,
  PencilIcon,
  PhoneIcon,
} from "react-native-heroicons/outline";

import { ink, MIN_TOUCH_TARGET, space } from "@/lib/design-tokens";

interface ContactUsProps {}

const ContactUsScreen: React.FC<ContactUsProps> = () => {
  const { theme } = useGlobalContext();

  const isDarkMode = theme === "dark";
  const router = useTypedNavigation();

  return (
    <NonScrollableContainer>
      <View className="flex-row items-center px-gutter pt-2">
        <BackButton />
        <View className="flex-1 items-center justify-center">
          <Text role="sectionTitle" fontWeight="font-bold">
            Contact Us
          </Text>
        </View>
        <View style={{ width: MIN_TOUCH_TARGET }} />
      </View>

      <ScrollView className="">
        <View
          style={{ paddingVertical: space.xl }}
          className={`px-gutter border-b-[0.2px] ${
            isDarkMode ? "border-line-dark" : "border-line-light"
          }`}
        >
          <View className="flex-row items-center space-x-2">
            <EnvelopeOpenIcon
              size={24}
              color={ink.text(isDarkMode)}
            />
            <Text
              fontSize="text-md"
              fontWeight="font-bold"
            >
              Email us
            </Text>
          </View>
          <View className="py-4">
            <TouchableOpacity
              onPress={() => Linking.openURL("mailto:support@simplyrenit.com")}
              className={`flex-row h-12 rounded-card border ${
                isDarkMode
                  ? "bg-surface-dark border-line-dark"
                  : "bg-surface-light border-line-light"
              } items-center justify-center `}
            >
              <Text
                className="px-2"
                fontSize="text-sm"
                fontWeight="font-bold"
                style={{ lineHeight: 18 }}
              >
                support@simplyrenit.com
              </Text>
              <ChevronRightIcon
                size={20}
                strokeWidth={2}
                color={ink.text(isDarkMode)}
                style={{ marginTop: 1 }}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={{ paddingVertical: space.xl }}
          className={`px-gutter border-b-[0.2px] ${
            isDarkMode ? "border-line-dark" : "border-line-light"
          }`}
        >
          <View className="flex-row items-center space-x-2">
            <PhoneIcon
              size={24}
              color={ink.text(isDarkMode)}
            />
            <Text
              fontSize="text-md"
              fontWeight="font-bold"
            >
              Call our customer support
            </Text>
          </View>
          <View className="py-4">
            <TouchableOpacity
              onPress={() => Linking.openURL("tel:+91-7297941741")}
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
                style={{ lineHeight: 20 }}
              >
                +91-7297941741
              </Text>
              <ChevronRightIcon
                size={20}
                strokeWidth={2}
                color={ink.text(isDarkMode)}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={{ paddingVertical: space.xl }}
          className={`px-gutter border-b-[0.2px] ${
            isDarkMode ? "border-line-dark" : "border-line-light"
          }`}
        >
          <View className="flex-row items-center space-x-2">
            <PencilIcon
              size={24}
              color={ink.text(isDarkMode)}
            />
            <Text
              fontSize="text-md"
              fontWeight="font-bold"
            >
              Leave us your feedback
            </Text>
          </View>
          <View className="py-4">
            <TouchableOpacity
              onPress={() => {
                router.navigate("feedback");
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
                style={{ lineHeight: 16 }}
              >
                Feedback & review
              </Text>
              <ChevronRightIcon
                size={20}
                strokeWidth={2}
                color={ink.text(isDarkMode)}
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </NonScrollableContainer>
  );
};

export default ContactUsScreen;
