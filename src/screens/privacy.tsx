import { SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { PRIVACY_CONTENT } from "@/lib/content";

import { styled } from "nativewind";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SCREEN_GUTTER } from "@/lib/design-tokens";

const StyledScroll = styled(ScrollView);

// Measured off the Figma Privacy frame: the text is padded 24 at the sides, sits 24 under
// the header (the Terms frame has it 28 down), and its blocks are 20 apart.
const TOP_INSET = 24;
const BOTTOM_INSET = 24;
const BLOCK_GAP = 20;

export default function Privacy() {
  const insets = useSafeAreaInsets();



  return (
    <NonScrollableContainer>
      <SubpageHeader title="Privacy Policy" />

      <View
        className="flex-1 justify-between"
        style={{ paddingBottom: insets.bottom }}
      >
        <StyledScroll
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: TOP_INSET,
            paddingBottom: BOTTOM_INSET,
            gap: BLOCK_GAP,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text fontSize="text-sm" fontWeight="font-bold">
            {PRIVACY_CONTENT.effectiveDate}
          </Text>
          <Text fontSize="text-sm">{PRIVACY_CONTENT.intro}</Text>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">1. Information We Collect</Text>
            <Text fontSize="text-sm">
              {PRIVACY_CONTENT.informationWeCollect.personalData}
            </Text>
            <Text fontSize="text-sm">
              {PRIVACY_CONTENT.informationWeCollect.nonPersonalInformation}
            </Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">2. Use of Information</Text>
            <Text fontSize="text-sm">
              {PRIVACY_CONTENT.useOfInformation.personalData}
            </Text>
            <Text fontSize="text-sm">
              {PRIVACY_CONTENT.useOfInformation.nonPersonalInformation}
            </Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">3. Sharing of Information</Text>
            <Text fontSize="text-sm">
              {PRIVACY_CONTENT.sharingOfInformation.serviceProviders}
            </Text>
            <Text fontSize="text-sm">
              {PRIVACY_CONTENT.sharingOfInformation.legalRequirements}
            </Text>
            <Text fontSize="text-sm">
              {PRIVACY_CONTENT.sharingOfInformation.affiliates}
            </Text>
            <Text fontSize="text-sm">
              {PRIVACY_CONTENT.sharingOfInformation.businessTransfers}
            </Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">4. Data Security</Text>
            <Text fontSize="text-sm">{PRIVACY_CONTENT.dataSecurity}</Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">5. Your Rights</Text>
            <Text fontSize="text-sm">{PRIVACY_CONTENT.otherGeneralRights}</Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">6. Children's Privacy</Text>
            <Text fontSize="text-sm">{PRIVACY_CONTENT.childrensPrivacy}</Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">7. Changes to the Privacy Policy</Text>
            <Text fontSize="text-sm">{PRIVACY_CONTENT.changesToPolicy}</Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">8. Contact Us</Text>
            <Text fontSize="text-sm">{PRIVACY_CONTENT.contactUs}</Text>
          </View>

          <View>
            <Text fontSize="text-sm" fontWeight="font-bold">9. Grievance Redressal Officer</Text>
            <Text fontSize="text-sm">
              Name: {PRIVACY_CONTENT.grievanceRedressalOfficer.name}
            </Text>
            <Text fontSize="text-sm">
              Email: {PRIVACY_CONTENT.grievanceRedressalOfficer.email}
            </Text>
            <Text fontSize="text-sm">
              Address: {PRIVACY_CONTENT.grievanceRedressalOfficer.address}
            </Text>
            <Text></Text>
          </View>
        </StyledScroll>
      </View>
    </NonScrollableContainer>
  );
}
