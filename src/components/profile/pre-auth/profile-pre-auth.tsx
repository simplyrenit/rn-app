import { Button, Text } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import { styled } from "nativewind";
import React, { useRef } from "react";
import { Platform, TouchableOpacity, View } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { IOS_CLIENT_ID, WEB_CLIENT_ID } from "@/lib/config";
import { SignInOptions } from "@/components/auth/sign-in-options";
import {
  ChatBubbleLeftEllipsisIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  FlagIcon,
  InboxArrowDownIcon,
  LockClosedIcon,
  QuestionMarkCircleIcon,
  UsersIcon,
} from "react-native-heroicons/outline";
import {
  ProfileRow,
  ProfileSection,
  ProfileSectionRule,
} from "../post-auth/profile-row";
import AppearanceSheet from "../post-auth/sheets/AppearanceSheet";
import { CurrencySheet } from "../post-auth/sheets/currency-sheet";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

// GoogleSignin.configure({
//   webClientId: WEB_CLIENT_ID,
//   offlineAccess: false,
//   iosClientId: IOS_CLIENT_ID,
//   scopes: ["profile", "email"],
// });

interface ProfilePreAuthProps {
  isDarkMode: boolean;
}
const StyledView = styled(View);
const StyledImage = styled(Image);
const StyledTouchableOpacity = styled(TouchableOpacity);

const ProfilePreAuth: React.FC<ProfilePreAuthProps> = ({ isDarkMode }) => {
  const router = useTypedNavigation();
  const { theme, isAuthenticated } = useGlobalContext();
  const isDark = theme === "dark";
  const appearanceSheetRef = useRef<BottomSheetModal>(null);
  const currencySheetRef = useRef<BottomSheetModal>(null);

  const handleCurrencyModal = () => {
    currencySheetRef.current?.present();
  };

  const handleAppeareanceModal = () => {
    appearanceSheetRef.current?.present();
  };

  // The screen's own route, not the navigator's focused tab: this component is
  // shared by Profile, Saved, Post and Chat, and reading `getState()` at render
  // time made whichever tab happened to be mounted show the list whenever it
  // re-rendered while Profile was the focused one (a theme change made from the
  // Appearance sheet was enough).
  const onProfile = useRoute().name === "Profile";

  return (
    <View className="flex-1 justify-end">
      {/* The 2.1 sign-in panel (Saved 2089:15649, Profile 2095:25130): 16 above, 24 below, a 20/28 Bold
          heading and a 14/20 sub-line, 24 above the providers. The sub-line says "book items", not
          "message owners", while chat is off. The heading-to-sub gap is 6 on Saved and 8 on Profile. */}
      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 16, paddingBottom: 24 }}>
        <View style={{ gap: onProfile ? 8 : 6, marginBottom: 24 }}>
          <Text fontSize="text-lg" fontWeight="font-bold" lineHeight={28}>
            Rent what you need, from people near you.
          </Text>
          <Text fontSize="text-sm" lineHeight={20} tone="body">
            Sign in to save listings, book items and track your rentals.
          </Text>
        </View>

        <SignInOptions />
      </View>

      {onProfile && (
        <>
          {/* The same sections, rows and rules the signed-in Profile draws (2095:25130 / 2095:24982): the App
              section starts right under the panel with no rule, and the list ends 24 above the tab bar. */}
          <View style={{ paddingBottom: 24 }}>
            <ProfileSection title="App">
              <ProfileRow
                icon={DevicePhoneMobileIcon}
                label="Appearance"
                onPress={handleAppeareanceModal}
              />
            </ProfileSection>

            <ProfileSectionRule />

            <ProfileSection title="Support">
              <ProfileRow
                icon={QuestionMarkCircleIcon}
                label="FAQs"
                onPress={() => {
                  router.navigate("faq");
                }}
              />
              <ProfileRow
                icon={FlagIcon}
                label="Report a problem"
                onPress={() => {
                  router.navigate("ReportAProblem");
                }}
              />
              <ProfileRow
                icon={ChatBubbleLeftEllipsisIcon}
                label="Feedback & review"
                onPress={() => {
                  router.navigate("feedback");
                }}
              />
              <ProfileRow
                icon={EnvelopeIcon}
                label="Contact us"
                onPress={() => {
                  router.navigate("contactUs");
                }}
              />
              <ProfileRow
                icon={UsersIcon}
                label="Who we are"
                onPress={() => {
                  router.navigate("whoWeAre");
                }}
              />
              <ProfileRow
                icon={InboxArrowDownIcon}
                label="Request an item"
                onPress={() => {
                  if (!isAuthenticated) {
                    router.navigate("Welcome"); // or whatever your login route name is
                  } else {
                    router.navigate("unavailabilityFormCategories");
                  }
                }}
              />
            </ProfileSection>

            <ProfileSectionRule />

            <ProfileSection title="Legal">
              <ProfileRow
                icon={DocumentTextIcon}
                label="Terms & conditions"
                onPress={() => {
                  router.navigate("Terms");
                }}
              />
              <ProfileRow
                icon={LockClosedIcon}
                label="Privacy policy"
                onPress={() => {
                  router.navigate("Privacy");
                }}
              />
            </ProfileSection>
          </View>

          <CurrencySheet
            bottomSheetModalRef={currencySheetRef}
            isDarkMode={isDarkMode}
          />

          <AppearanceSheet
            bottomSheetModalRef={appearanceSheetRef}
            isDarkMode={isDarkMode}
          />
        </>
      )}
    </View>
  );
};

export default ProfilePreAuth;
