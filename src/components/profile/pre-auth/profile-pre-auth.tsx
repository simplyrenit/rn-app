import { Button, Text } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import { styled } from "nativewind";
import React, { useRef } from "react";
import { Platform, TouchableOpacity, View } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { IOS_CLIENT_ID, WEB_CLIENT_ID } from "@/lib/config";
import { SignInOptions } from "@/components/auth/sign-in-options";
import { useTheme } from "@/lib/theme";
import { ArrowRightStartOnRectangleIcon } from "react-native-heroicons/outline";
import IconButton from "../post-auth/profile-icon-button";
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
  const { color } = useTheme();

  const sectionStyle = {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  } as const;

  const handleCurrencyModal = () => {
    currencySheetRef.current?.present();
  };

  const handleAppeareanceModal = () => {
    appearanceSheetRef.current?.present();
  };

  return (
    <>
      <View className="px-gutter py-4 flex-1 justify-end">
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
        {/* App */}
        {router.getState().routes[router.getState().index].name ===
          "Profile" && (
            <>
              <View
                style={sectionStyle}
              >
                <View className="px-gutter">
                  <Text
                    fontSize="text-base"
                    fontWeight="font-bold"
                    className="pb-3"
                  >
                    App
                  </Text>
                  <IconButton
                    onPress={handleAppeareanceModal}
                    leftIcon="MoonIcon"
                    text="Appearance"
                    isDarkMode={isDarkMode}
                  />
                  {/* <IconButton
                  onPress={handleCurrencyModal}
                  leftIcon="BanknotesIcon"
                  text="Currency"
                  isDarkMode={isDarkMode}
                /> */}
                </View>
              </View>

              {/* Support */}
              <View
                style={sectionStyle}
              >
                <View className="px-gutter">
                  <Text
                    fontSize="text-base"
                    fontWeight="font-bold"
                    className="pb-3"
                  >
                    Support
                  </Text>
                  <IconButton
                    onPress={() => {
                      router.navigate("faq");
                    }}
                    leftIcon="QuestionMarkCircleIcon"
                    text="FAQs"
                    isDarkMode={isDarkMode}
                  />
                  <IconButton
                    onPress={() => {
                      router.navigate("ReportAProblem");
                    }}
                    leftIcon="ExclamationTriangleIcon"
                    text="Report a problem"
                    isDarkMode={isDarkMode}
                  />
                  <IconButton
                    onPress={() => {
                      router.navigate("feedback");
                    }}
                    leftIcon="ChatBubbleLeftEllipsisIcon"
                    text="Send feedback"
                    isDarkMode={isDarkMode}
                  />
                  <IconButton
                    onPress={() => {
                      router.navigate("contactUs");
                    }}
                    leftIcon="EnvelopeIcon"
                    text="Contact us"
                    isDarkMode={isDarkMode}
                  />
                  <IconButton
                    onPress={() => {
                      router.navigate("whoWeAre");
                    }}
                    leftIcon="UsersIcon"
                    text="Who we are"
                    isDarkMode={isDarkMode}
                  />
                  <IconButton
                    onPress={() => {
                      if (!isAuthenticated) {
                        router.navigate("Welcome"); // or whatever your login route name is
                      } else {
                        router.navigate("unavailabilityFormCategories");
                      }
                    }}
                    leftIcon="InboxArrowDownIcon"
                    text="Request an item"
                    isDarkMode={isDarkMode}
                  />
                </View>
              </View>

              {/* <Legal */}
              <View className="py-4 mb-16">
                <View className="px-gutter">
                  <Text
                    fontSize="text-base"
                    fontWeight="font-bold"
                    className="pb-3"
                  >
                    Legal
                  </Text>
                  <IconButton
                    onPress={() => {
                      router.navigate("Terms");
                    }}
                    leftIcon="DocumentTextIcon"
                    text="Terms & conditions"
                    isDarkMode={isDarkMode}
                  />
                  <IconButton
                    onPress={() => {
                      router.navigate("Privacy");
                    }}
                    leftIcon="LockClosedIcon"
                    text="Privacy policy"
                    isDarkMode={isDarkMode}
                  />
                </View>
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
    </>
  );
};

export default ProfilePreAuth;
