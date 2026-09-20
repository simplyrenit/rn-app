import { Button, Text } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
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
  PROFILE_LIST_GAP,
  ProfileBlockRule,
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
      <View className="px-gutter py-4">
        {/* This is the moment a customer decides to commit an account to
            you. It used to read " Enjoy Renit to the fullest..." — default
            size, no weight, a trailing ellipsis and a literal leading space. */}
        <View style={{ gap: 6, marginBottom: 24 }}>
          <Text fontSize="text-2xl" fontWeight="font-bold">
            Rent what you need, from people near you.
          </Text>
          <Text fontSize="text-md" tone="body">
            Sign in to save listings, message owners and track your rentals.
          </Text>
        </View>

        <SignInOptions />
      </View>

      {onProfile && (
        <>
          {/* The same list, rows and rules the signed-in Profile draws, so the
              two states of one tab read as one screen. This used to be its own
              copy of the list, inside the hero's 24pt gutter and then a second
              24pt gutter per section, so every row sat 48pt in from the edge
              with an inset rule and an older glyph set. */}
          <ProfileBlockRule />

          {/* The list's own padding, as signed in, plus a second gap at the foot
              so the last row clears the tab bar (there is no Logout below it). */}
          <View
            style={{
              paddingTop: PROFILE_LIST_GAP,
              paddingBottom: PROFILE_LIST_GAP * 2,
            }}
          >
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
