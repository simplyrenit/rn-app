import { StaticContainer, Text } from "@/components/core";
import { useNavigation } from "@react-navigation/native";

import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { TERMS_CONTENT } from "@/lib/content";
import { styled } from "nativewind";
import {
  ScrollView,
  Text as RNT,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";

const StyledScroll = styled(ScrollView);

export default function Terms() {
  const { theme } = useGlobalContext();
  const isDarkMode = theme === "dark";
  const router = useNavigation();

  return (
    <NonScrollableContainer>
      <View
        className="flex-row items-center justify-between px-4"
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
            Terms & Conditions
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
        <StyledScroll className="space-y-5 h-[100%] mx-4">
          <RNT style={{ fontStyle: "italic", fontWeight: "600" }}>
            {TERMS_CONTENT["effectiveDate"]}
          </RNT>
          <Text className="">{TERMS_CONTENT["intro"]}</Text>

          <View>
            <Text fontWeight="font-bold">1. Acceptance of Terms</Text>
            <Text className="">{TERMS_CONTENT["section1.1"]}</Text>
            <Text className="">{TERMS_CONTENT["section1.2"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">2. General Terms</Text>
            <Text className="">{TERMS_CONTENT["section2.1"]}</Text>
            <Text className="">{TERMS_CONTENT["section2.2"]}</Text>
            <Text className="">{TERMS_CONTENT["section2.3"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">3. User Obligations</Text>
            <Text className="">{TERMS_CONTENT["section3.1"]}</Text>
            <Text className="">{TERMS_CONTENT["section3.2"]}</Text>
            <Text className="">{TERMS_CONTENT["section3.3"]}</Text>
            <Text className="">{TERMS_CONTENT["section3.4"]}</Text>
            <Text className="">{TERMS_CONTENT["section3.5"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">4. User Content</Text>
            <Text className="">{TERMS_CONTENT["section4.1"]}</Text>
            <Text className="">{TERMS_CONTENT["section4.2"]}</Text>
            <Text className="">{TERMS_CONTENT["section4.3"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">5. Prohibited Content</Text>
            <Text className="">{TERMS_CONTENT["section5.1"]}</Text>
            <Text className="">{TERMS_CONTENT["section5.2"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">6. Intellectual Property Rights</Text>
            <Text className="">{TERMS_CONTENT["section6.1"]}</Text>
            <Text className="">{TERMS_CONTENT["section6.2"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">
              7. Disclaimer of Warranty and Limitation of Liability
            </Text>
            <Text className="">{TERMS_CONTENT["section7.1"]}</Text>
            <Text className="">{TERMS_CONTENT["section7.2"]}</Text>
            <Text className="">{TERMS_CONTENT["section7.3"]}</Text>
            <Text className="">{TERMS_CONTENT["section7.4"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">8. Indemnification</Text>
            <Text className="">{TERMS_CONTENT["section8.1"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">9. Third-Party Websites</Text>
            <Text className="">{TERMS_CONTENT["section9.1"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">10. Termination</Text>
            <Text className="">{TERMS_CONTENT["section10.1"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">
              11. Governing Law and Jurisdiction
            </Text>
            <Text className="">{TERMS_CONTENT["section11.1"]}</Text>
          </View>
        </StyledScroll>
        {/* </StaticContainer> */}
      </View>
    </NonScrollableContainer>
  );
}
