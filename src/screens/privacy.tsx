import { SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { PRIVACY_CONTENT } from "@/lib/content";

import React from "react";
import { styled } from "nativewind";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SCREEN_GUTTER } from "@/lib/design-tokens";

const StyledScroll = styled(ScrollView);

// 02 Privacy (2089:28263), as Terms: the text starts 16 under the top bar (y126), padded 24 at
// the sides. Blocks are 12 apart; a section pads 12 above its 16/24 Bold title and keeps 8
// between the title and each 14/20 `textBody` paragraph. The date line is 14/20 SemiBold.
const TOP_INSET = 16;
const BOTTOM_INSET = 24;
const BLOCK_GAP = 12;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingTop: 12, gap: 8 }}>
      <Text fontSize="text-md" fontWeight="font-bold">{title}</Text>
      {children}
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <Text fontSize="text-sm" tone="body">{children}</Text>;
}

export default function Privacy() {
  const insets = useSafeAreaInsets();

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Privacy Policy" />

      <View style={{ flex: 1, paddingBottom: insets.bottom }}>
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
          <Text fontSize="text-sm" fontWeight="font-semibold">
            {PRIVACY_CONTENT.effectiveDate}
          </Text>
          <P>{PRIVACY_CONTENT.intro}</P>

          <Section title="1. Information We Collect">
            <P>
              {PRIVACY_CONTENT.informationWeCollect.personalData}
            </P>
            <P>
              {PRIVACY_CONTENT.informationWeCollect.nonPersonalInformation}
            </P>
          </Section>

          <Section title="2. Use of Information">
            <P>
              {PRIVACY_CONTENT.useOfInformation.personalData}
            </P>
            <P>
              {PRIVACY_CONTENT.useOfInformation.nonPersonalInformation}
            </P>
          </Section>

          <Section title="3. Sharing of Information">
            <P>
              {PRIVACY_CONTENT.sharingOfInformation.serviceProviders}
            </P>
            <P>
              {PRIVACY_CONTENT.sharingOfInformation.legalRequirements}
            </P>
            <P>
              {PRIVACY_CONTENT.sharingOfInformation.affiliates}
            </P>
            <P>
              {PRIVACY_CONTENT.sharingOfInformation.businessTransfers}
            </P>
          </Section>

          <Section title="4. Data Security">
            <P>{PRIVACY_CONTENT.dataSecurity}</P>
          </Section>

          <Section title="5. Your Rights">
            <P>{PRIVACY_CONTENT.otherGeneralRights}</P>
          </Section>

          <Section title="6. Children's Privacy">
            <P>{PRIVACY_CONTENT.childrensPrivacy}</P>
          </Section>

          <Section title="7. Changes to the Privacy Policy">
            <P>{PRIVACY_CONTENT.changesToPolicy}</P>
          </Section>

          <Section title="8. Contact Us">
            <P>{PRIVACY_CONTENT.contactUs}</P>
          </Section>

          <Section title="9. Grievance Redressal Officer">
            <P>
              Name: {PRIVACY_CONTENT.grievanceRedressalOfficer.name}
            </P>
            <P>
              Email: {PRIVACY_CONTENT.grievanceRedressalOfficer.email}
            </P>
            <P>
              Address: {PRIVACY_CONTENT.grievanceRedressalOfficer.address}
            </P>
          </Section>
        </StyledScroll>
      </View>
    </NonScrollableContainer>
  );
}
