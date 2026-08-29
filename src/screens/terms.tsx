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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ink } from "@/lib/design-tokens";

const StyledScroll = styled(ScrollView);

export default function Terms() {
  const { theme } = useGlobalContext();
  const insets = useSafeAreaInsets();
  const isDarkMode = theme === "dark";
  const router = useNavigation();

  return (
    <NonScrollableContainer>
      <View
        className="flex-row items-center justify-between px-gutter py-2 mt-2"
        style={{ paddingTop: wp("2.5%") }}
      >
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
            Terms & Conditions
          </Text>
        </View>
        <View className="w-[10%]"></View>
      </View>

      <View
        className="flex-1 justify-between"
        style={{ paddingBottom: insets.bottom }}
      >
        {/* <StaticContainer> */}
        <StyledScroll
          className="space-y-5 h-[100%] mx-4 pt-2 "
          showsVerticalScrollIndicator={false}
        >
          <RNT
            style={{
              fontStyle: "italic",
              fontWeight: "600",
              color: ink.text(isDarkMode),
            }}
          >
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
          </View>

          <View>
            <Text fontWeight="font-bold">3. User Obligations</Text>
            <Text className="">{TERMS_CONTENT["section3.1"]}</Text>
            <Text className="">{TERMS_CONTENT["section3.2"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">4. User Content</Text>
            <Text className="">{TERMS_CONTENT["section4.1"]}</Text>
            <Text className="">{TERMS_CONTENT["section4.2"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">5. Prohibited Content</Text>
            <Text className="">{TERMS_CONTENT["section5.1"]}</Text>
            <Text className="">{TERMS_CONTENT["section5.2"]}</Text>
            <Text className="">{TERMS_CONTENT["section5.3"]}</Text>
            <Text className="">{TERMS_CONTENT["section5.4"]}</Text>
            <Text className="">{TERMS_CONTENT["section5.5"]}</Text>
            <Text className="">{TERMS_CONTENT["section5.6"]}</Text>
            <Text className="">{TERMS_CONTENT["section5.7"]}</Text>
            <Text className="">{TERMS_CONTENT["section5.8"]}</Text>
            <Text className="">{TERMS_CONTENT["section5.9"]}</Text>
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
          </View>

          <View>
            <Text fontWeight="font-bold">8. Indemnification</Text>
            <Text className="">{TERMS_CONTENT["section8.1"]}</Text>
            <Text className="">{TERMS_CONTENT["section8.2"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">9. Third-Party Websites</Text>
            <Text className="">{TERMS_CONTENT["section9.1"]}</Text>
            <Text className="">{TERMS_CONTENT["section9.2"]}</Text>
            <Text className="">{TERMS_CONTENT["section9.3"]}</Text>
            <Text className="">{TERMS_CONTENT["section9.4"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">10. Termination</Text>
            <Text className="">{TERMS_CONTENT["section10.1"]}</Text>
            <Text className="">{TERMS_CONTENT["section10.2"]}</Text>
            <Text className="">{TERMS_CONTENT["section10.3"]}</Text>
            <Text className="">{TERMS_CONTENT["section10.4"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">
              11. Governing Law and Jurisdiction
            </Text>
            <Text className="">{TERMS_CONTENT["section11.1"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">12. Contact Information</Text>
            <Text className="">{TERMS_CONTENT["section12.1"]}</Text>
            <Text className="">{TERMS_CONTENT["section12.2"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">13. Grievance Redressal</Text>
            <Text className="">{TERMS_CONTENT["section13.1"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">14. Termination</Text>
            <Text className="">{TERMS_CONTENT["section14.1"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">15. Contact Us</Text>
            <Text className="">{TERMS_CONTENT["section15.1"]}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">16. Grievance Redressal Officer</Text>
            <Text className="">{TERMS_CONTENT["section16.1"]}</Text>
            <Text className=""> </Text>
          </View>
        </StyledScroll>
        {/* </StaticContainer> */}
      </View>
    </NonScrollableContainer>
  );
}
