import { Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import { ScrollView, TouchableOpacity, View, Linking } from "react-native";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  EnvelopeOpenIcon,
  PencilIcon,
  PhoneIcon,
} from "react-native-heroicons/outline";

import { widthPercentageToDP as wp } from "react-native-responsive-screen";

interface ContactUsProps {}

const ContactUsScreen: React.FC<ContactUsProps> = () => {
  const { theme } = useGlobalContext();

  const isDarkMode = theme === "dark";
  const router = useTypedNavigation();

  return (
    <NonScrollableContainer>
      <View
        className="flex-row items-center justify-between px-5 "
        style={{ paddingVertical: wp("5%") }}
      >
        <TouchableOpacity
          className="w-[10%]"
          onPress={() => router.goBack()}
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
            Contact Us
          </Text>
        </View>

        <View className="w-[10%]"></View>
      </View>

      <ScrollView className="">
        <View
          style={{ paddingVertical: wp("8%") }}
          className={`px-5 border-b ${
            isDarkMode ? "border-[#292929]" : "border-[#e6e6e6]"
          }`}
        >
          <View className="flex-row items-center gap-2">
            <EnvelopeOpenIcon
              size={24}
              color={isDarkMode ? "#FFF" : "#000"}
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
              onPress={() => Linking.openURL("mailto:support@renit.co.in")}
              className={`flex-row h-12 rounded-[12px] border ${
                isDarkMode
                  ? "bg-[#0F0F0F] border-[#292929]"
                  : "bg-white border-[#e6e6e6]"
              } items-center justify-center `}
            >
              <Text
                className="px-2"
                fontSize="text-sm"
                fontWeight="font-bold"
                style={{ lineHeight: 18 }}
              >
                support@renit.co.in
              </Text>
              <ChevronRightIcon
                size={20}
                strokeWidth={2}
                color={isDarkMode ? "#FFF" : "#000"}
                style={{ marginTop: 1 }}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={{ paddingVertical: wp("8%") }}
          className={`px-5 border-b ${
            isDarkMode ? "border-[#292929]" : "border-[#e6e6e6]"
          }`}
        >
          <View className="flex-row items-center gap-2">
            <PhoneIcon
              size={24}
              color={isDarkMode ? "#FFF" : "#000"}
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
              className={`flex-row h-12 rounded-[12px] border ${
                isDarkMode
                  ? "bg-[#0F0F0F] border-[#292929]"
                  : "bg-white border-[#e6e6e6]"
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
                color={isDarkMode ? "#FFF" : "#000"}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={{ paddingVertical: wp("8%") }}
          className={`px-5 border-b ${
            isDarkMode ? "border-[#292929]" : "border-[#e6e6e6]"
          }`}
        >
          <View className="flex-row items-center gap-2">
            <PencilIcon
              size={24}
              color={isDarkMode ? "#FFF" : "#000"}
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
              className={`flex-row h-12 rounded-[12px] border ${
                isDarkMode
                  ? "bg-[#0F0F0F] border-[#292929]"
                  : "bg-white border-[#e6e6e6]"
              } items-center justify-center`}
            >
              <Text
                className="px-2"
                fontSize="text-sm"
                fontWeight="font-bold"
                style={{ lineHeight: 16 }}
              >
                Feedback & Review
              </Text>
              <ChevronRightIcon
                size={20}
                strokeWidth={2}
                color={isDarkMode ? "#FFF" : "#000"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </NonScrollableContainer>
  );
};

export default ContactUsScreen;
