import { SubpageHeader, Text } from "@/components/core";
import { RingSpinner } from "@/components/core/ring-spinner";
import { fetchPublicTerms } from "@/backend/terms";
import { openCustomerTerms } from "@/lib/terms-link";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";

import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { TERMS_CONTENT } from "@/lib/content";
import { styled } from "nativewind";
import { Linking, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SCREEN_GUTTER } from "@/lib/design-tokens";

const StyledScroll = styled(ScrollView);

// 02 Terms (2089:28232, bundled fallback): the text starts 16 under the top bar (y126), padded
// 24 at the sides. Its blocks are 12 apart; a section pads 12 above its 16/24 Bold title and
// keeps 8 between the title and each 14/20 `textBody` paragraph. The date line is 14/20 SemiBold.
const TOP_INSET = 16;
const BOTTOM_INSET = 24;
const BLOCK_GAP = 12;
// 2089:28209: a 40 ring at y402, 292 under the top bar's bottom edge (y110).
const SPINNER_TOP = 292;
// How long the server page's address is waited for before the bundled text shows.
const READ_TIMEOUT_MS = 8000;

type TermsDesign = { state: "loading" | "fallback" };

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

export default function Terms() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  // Dev-only design seed (ENG-428 plan §1): pins the loading or fallback state and skips the
  // server read and browser open, so a frame diff never leaves the screen.
  const route = useRoute();
  const design = __DEV__ ? (route.params as { design?: TermsDesign } | undefined)?.design : undefined;
  // The server's terms page opens in the browser and this screen steps back; the
  // bundled text below shows only when that page cannot be read or opened.
  const [useBundled, setUseBundled] = useState(design?.state === "fallback");

  useEffect(() => {
    if (design) return;
    let live = true;
    openCustomerTerms(() => fetchPublicTerms(READ_TIMEOUT_MS), (url) => Linking.openURL(url), () => live).then((opened) => {
      if (!live) return;
      if (opened) navigation.goBack();
      else setUseBundled(true);
    });
    return () => {
      live = false;
    };
  }, [navigation, design]);

  if (!useBundled) {
    return (
      <NonScrollableContainer>
        <SubpageHeader title="Terms & Conditions" />
        <View style={{ flex: 1, alignItems: "center", paddingTop: SPINNER_TOP }}>
          <RingSpinner size={40} spinning={!design} />
        </View>
      </NonScrollableContainer>
    );
  }

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Terms & Conditions" />

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
            {TERMS_CONTENT["effectiveDate"]}
          </Text>
          <P>{TERMS_CONTENT["intro"]}</P>

          <Section title="1. Acceptance of Terms">
            <P>{TERMS_CONTENT["section1.1"]}</P>
            <P>{TERMS_CONTENT["section1.2"]}</P>
          </Section>

          <Section title="2. General Terms">
            <P>{TERMS_CONTENT["section2.1"]}</P>
            <P>{TERMS_CONTENT["section2.2"]}</P>
          </Section>

          <Section title="3. User Obligations">
            <P>{TERMS_CONTENT["section3.1"]}</P>
            <P>{TERMS_CONTENT["section3.2"]}</P>
          </Section>

          <Section title="4. User Content">
            <P>{TERMS_CONTENT["section4.1"]}</P>
            <P>{TERMS_CONTENT["section4.2"]}</P>
          </Section>

          <Section title="5. Prohibited Content">
            <P>{TERMS_CONTENT["section5.1"]}</P>
            <P>{TERMS_CONTENT["section5.2"]}</P>
            <P>{TERMS_CONTENT["section5.3"]}</P>
            <P>{TERMS_CONTENT["section5.4"]}</P>
            <P>{TERMS_CONTENT["section5.5"]}</P>
            <P>{TERMS_CONTENT["section5.6"]}</P>
            <P>{TERMS_CONTENT["section5.7"]}</P>
            <P>{TERMS_CONTENT["section5.8"]}</P>
            <P>{TERMS_CONTENT["section5.9"]}</P>
          </Section>

          <Section title="6. Intellectual Property Rights">
            <P>{TERMS_CONTENT["section6.1"]}</P>
            <P>{TERMS_CONTENT["section6.2"]}</P>
          </Section>

          <Section title="7. Disclaimer of Warranty and Limitation of Liability">
            <P>{TERMS_CONTENT["section7.1"]}</P>
            <P>{TERMS_CONTENT["section7.2"]}</P>
          </Section>

          <Section title="8. Indemnification">
            <P>{TERMS_CONTENT["section8.1"]}</P>
            <P>{TERMS_CONTENT["section8.2"]}</P>
          </Section>

          <Section title="9. Third-Party Websites">
            <P>{TERMS_CONTENT["section9.1"]}</P>
            <P>{TERMS_CONTENT["section9.2"]}</P>
            <P>{TERMS_CONTENT["section9.3"]}</P>
            <P>{TERMS_CONTENT["section9.4"]}</P>
          </Section>

          <Section title="10. Termination">
            <P>{TERMS_CONTENT["section10.1"]}</P>
            <P>{TERMS_CONTENT["section10.2"]}</P>
            <P>{TERMS_CONTENT["section10.3"]}</P>
            <P>{TERMS_CONTENT["section10.4"]}</P>
          </Section>

          <Section title="11. Governing Law and Jurisdiction">
            <P>{TERMS_CONTENT["section11.1"]}</P>
          </Section>

          <Section title="12. Contact Information">
            <P>{TERMS_CONTENT["section12.1"]}</P>
            <P>{TERMS_CONTENT["section12.2"]}</P>
          </Section>

          <Section title="13. Grievance Redressal">
            <P>{TERMS_CONTENT["section13.1"]}</P>
          </Section>

          <Section title="14. Termination">
            <P>{TERMS_CONTENT["section14.1"]}</P>
          </Section>

          <Section title="15. Contact Us">
            <P>{TERMS_CONTENT["section15.1"]}</P>
          </Section>

          <Section title="16. Grievance Redressal Officer">
            <P>{TERMS_CONTENT["section16.1"]}</P>
          </Section>
        </StyledScroll>
      </View>
    </NonScrollableContainer>
  );
}
