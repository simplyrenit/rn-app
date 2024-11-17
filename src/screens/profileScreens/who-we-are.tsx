import { Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import { TouchableOpacity, View } from "react-native";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  QuestionMarkCircleIcon,
} from "react-native-heroicons/outline";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";

interface WhoWeAreProps {}

const WhoWeAreScreen: React.FC<WhoWeAreProps> = () => {
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
          onPress={() => router.goBack()}
          className="flex-1 items-start w-[10%]"
        >
          <ArrowLeftIcon size={26} color={isDarkMode ? "#FFF" : "#000"} />
        </TouchableOpacity>
        <View className="items-center justify-center w-[80%]">
          <Text fontSize="text-xl" fontWeight="font-bold">
            Who we are
          </Text>
        </View>

        <View className="w-[10%]"></View>
      </View>

      <KeyboardAwareScrollView className="px-5 py-5 flex-1">
        <Text
          fontSize="text-base"
          fontWeight="font-bold"
          style={{ paddingVertical: wp("2%") }}
        >
          What is Renit?
        </Text>
        <Text
          fontSize="text-base"
          className={`leading-6 ${
            isDarkMode ? "text-[#ffffffb2]" : "text-[#000000b2]"
          }`}
        >
          Renit is a community that enables individuals and organizations to get
          access to anything by providing everyone with the most seamless rental
          marketplace. A place where anyone can 'rent out' thier belongings to
          others or 'rent in' anything they need. What really drives us at Renit
          is our simple yet profound vision to enable everyone around the world
          to access anything; fostering a world of shared abundance.
        </Text>

        <View style={{ paddingVertical: wp("8%") }} className=" ">
          <View className="flex-row gap-2">
            <QuestionMarkCircleIcon
              size={24}
              color={isDarkMode ? "#FFF" : "#000"}
            />
            <Text fontSize="text-base" fontWeight="font-bold">
              FAQs
            </Text>
          </View>
          <View className="py-4">
            <TouchableOpacity
              onPress={() => {
                router.navigate("faq");
              }}
              className={`flex-row h-12 rounded-[12px] border ${
                isDarkMode
                  ? "bg-[#0F0F0F] border-[#292929]"
                  : "bg-white border-[#e6e6e6]"
              } items-center justify-center`}
            >
              <Text className="px-2" fontSize="text-sm" fontWeight="font-bold">
                Check all FAQs
              </Text>
              <ChevronRightIcon
                size={20}
                strokeWidth={2}
                color={isDarkMode ? "#FFF" : "#000"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </NonScrollableContainer>
  );
};

export default WhoWeAreScreen;
