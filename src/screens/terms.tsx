import { SubpageHeader, Text } from "@/components/core";
import { useNavigation } from "@react-navigation/native";

import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { TERMS_CONTENT } from "@/lib/content";
import { styled } from "nativewind";
import {
  ScrollView,
  Text as RNT,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SCREEN_GUTTER, ink } from "@/lib/design-tokens";

const StyledScroll = styled(ScrollView);

// Measured off the Figma legal frames: the text is padded 24 at the sides, sits 28 under
// the header, and its blocks are 20 apart.
const TOP_INSET = 28;
const BOTTOM_INSET = 24;
const BLOCK_GAP = 20;

export default function Terms() {
  const { theme } = useGlobalContext();
  const insets = useSafeAreaInsets();
  const isDarkMode = theme === "dark";
  const router = useNavigation();

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Terms & Conditions" />

      <View
        className="flex-1 justify-between"
        style={{ paddingBottom: insets.bottom }}
      >
        {/* <StaticContainer> */}
        <StyledScroll
          style={{ height: "100%" }}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: TOP_INSET,
            paddingBottom: BOTTOM_INSET,
            gap: BLOCK_GAP,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text fontSize="text-sm" fontWeight="font-bold">
            {TERMS_CONTENT["effectiveDate"]}
          </Text>
          <Text fontSize="text-sm" className="">{TERMS_CONTENT["intro"]}</Text>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">1. Acceptance of Terms</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section1.1"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section1.2"]}</Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">2. General Terms</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section2.1"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section2.2"]}</Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">3. User Obligations</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section3.1"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section3.2"]}</Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">4. User Content</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section4.1"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section4.2"]}</Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">5. Prohibited Content</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section5.1"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section5.2"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section5.3"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section5.4"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section5.5"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section5.6"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section5.7"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section5.8"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section5.9"]}</Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">6. Intellectual Property Rights</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section6.1"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section6.2"]}</Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">
              7. Disclaimer of Warranty and Limitation of Liability
            </Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section7.1"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section7.2"]}</Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">8. Indemnification</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section8.1"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section8.2"]}</Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">9. Third-Party Websites</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section9.1"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section9.2"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section9.3"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section9.4"]}</Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">10. Termination</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section10.1"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section10.2"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section10.3"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section10.4"]}</Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">
              11. Governing Law and Jurisdiction
            </Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section11.1"]}</Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">12. Contact Information</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section12.1"]}</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section12.2"]}</Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">13. Grievance Redressal</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section13.1"]}</Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">14. Termination</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section14.1"]}</Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">15. Contact Us</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section15.1"]}</Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">16. Grievance Redressal Officer</Text>
            <Text fontSize="text-sm" className="">{TERMS_CONTENT["section16.1"]}</Text>
            <Text fontSize="text-sm" className=""> </Text>
          </View>
        </StyledScroll>
        {/* </StaticContainer> */}
      </View>
    </NonScrollableContainer>
  );
}
