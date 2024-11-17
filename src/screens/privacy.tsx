import { StaticContainer, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { PRIVACY_CONTENT } from "@/lib/content";
import { useNavigation } from "@react-navigation/native";

import { styled } from "nativewind";
import {
  ScrollView,
  TouchableOpacity,
  View,
  Text as RNT,
  Platform,
} from "react-native";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";

const StyledScroll = styled(ScrollView);

export default function Privacy() {
  const { theme } = useGlobalContext();

  const isDarkMode = theme === "dark";

  const router = useNavigation();

  return (
    <NonScrollableContainer>
      <View
        className="flex-row items-center justify-between px-4 "
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
            Privacy Policy
          </Text>
        </View>

        <View className="w-[10%]"></View>
      </View>

      <View
        className={`${Platform.OS === "ios" ? "" : "flex-1"} justify-between`}
        style={{
          paddingBottom: Platform.OS === "ios" ? wp("10%") : 0,
        }}
      >
        {/* <StaticContainer> */}
        <StyledScroll
          className="space-y-5 h-[100%] mx-4"
          showsVerticalScrollIndicator={false}
        >
          <RNT style={{ fontStyle: "italic", fontWeight: "600" }}>
            {PRIVACY_CONTENT["effectiveDate"]}
          </RNT>
          <Text className="">{PRIVACY_CONTENT["intro"]}</Text>

          <View>
            <Text fontWeight="font-bold">1. Information We Collect</Text>
            <Text className="">{PRIVACY_CONTENT["section1.1"]}</Text>
            <Text className="">{PRIVACY_CONTENT["section1.2"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">2. Use of Information</Text>
            <Text className="">{PRIVACY_CONTENT["section2.1"]}</Text>
            <Text className="">{PRIVACY_CONTENT["section2.2"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">3. Sharing of Information</Text>
            <Text className="">{PRIVACY_CONTENT["section3.1"]}</Text>
            <Text className="">{PRIVACY_CONTENT["section3.2"]}</Text>
            <Text className="">{PRIVACY_CONTENT["section3.3"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">4. Data Security</Text>
            <Text className="">{PRIVACY_CONTENT["section4"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">5. Your Rights</Text>
            <Text className="">{PRIVACY_CONTENT["section5"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">6. Children's Privacy</Text>
            <Text className="">{PRIVACY_CONTENT["section6"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">7. Changes to the Privacy Policy</Text>
            <Text className="">{PRIVACY_CONTENT["section7"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">8. Contact Us</Text>
            <Text className="">{PRIVACY_CONTENT["section8"]}</Text>
          </View>
        </StyledScroll>
      </View>
    </NonScrollableContainer>
  );
}
