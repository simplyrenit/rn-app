import { Button, Text } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import { styled } from "nativewind";
import React, { useRef } from "react";
import { Platform, TouchableOpacity, View } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { IOS_CLIENT_ID, WEB_CLIENT_ID } from "@/lib/config";
import { useOAuth } from "@/components/auth/oauth";
import * as Progress from "react-native-progress";
import { ArrowRightStartOnRectangleIcon } from "react-native-heroicons/outline";
import IconButton from "../post-auth/profile-icon-button";
import AppearanceSheet from "../post-auth/sheets/AppearanceSheet";
import { CurrencySheet } from "../post-auth/sheets/currency-sheet";
import PersonalDetailsSheet from "../post-auth/sheets/PersonaldetailsSheet";
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
  const { googleSignIn, loading, appleSignIn } = useOAuth();
  const isDark = theme === "dark";
  const appearanceSheetRef = useRef<BottomSheetModal>(null);
  const personalDetailsSheetRef = useRef<BottomSheetModal>(null);
  const currencySheetRef = useRef<BottomSheetModal>(null);

  const handleCurrencyModal = () => {
    currencySheetRef.current?.present();
  };

  const handleAppeareanceModal = () => {
    appearanceSheetRef.current?.present();
  };

  return (
    <>
      <View className="px-4 py-4 flex-1 justify-end">
        <View className="justify-center items-center">
          <Text> Enjoy Renit to the fullest...</Text>
        </View>
        <StyledView className=" gap-3 justify-center py-5">
          <Button
            onPress={googleSignIn}
            className={`flex-row justify-center gap-1 items-center ${isDark
              ? "bg-[#1A1A1A] border-[#292929]"
              : "bg-white border-[#e6e6e6]"
              } border rounded-lg py-3 px-6 mx-2`}
          >
            {loading ? (
              <Progress.CircleSnail
                size={22}
                color={isDark ? "white" : "black"}
              />
            ) : (
              <>
                <View>
                  <StyledImage
                    className="h-6 w-6"
                    source={require("../../../../assets/auth/google-icon.png")}
                  />
                </View>
                <View>
                  <Text
                    fontWeight="font-bold"
                    className="ml-1 -translate-y-0.5"
                  >
                    Continue with Google
                  </Text>
                </View>
              </>
            )}
          </Button>

          {Platform.OS === "ios" && (
            <Button
              onPress={appleSignIn}
              className={`flex-row justify-center gap-1 items-center ${isDark
                ? "bg-[#1A1A1A] border-[#292929]"
                : "bg-white border-[#e6e6e6]"
                } border rounded-lg py-3 px-6 mx-2`}
            >
              {loading ? (
                <Progress.CircleSnail
                  size={22}
                  color={isDark ? "white" : "black"}
                />
              ) : (
                <>
                  <View>
                    <StyledImage
                      className="h-6 w-6"
                      source={
                        isDarkMode
                          ? require("../../../../assets/auth/apple-icon.png")
                          : require("../../../../assets/auth/apple-icon-dark.png")
                      }
                    />
                  </View>
                  <View>
                    <Text
                      fontWeight="font-bold"
                      className="ml-1"
                    >
                      Continue with Apple
                    </Text>
                  </View>
                </>
              )}
            </Button>
          )}

          <Button
            onPress={() => router.navigate("Email")}
            className={`flex-row justify-center gap-1 items-center ${isDark
              ? "bg-[#1A1A1A] border-[#292929]"
              : "bg-white border-[#e6e6e6]"
              } border rounded-lg py-3 px-6 mx-2`}
          >
            <View>
              <StyledImage
                className="h-6 w-6"
                source={require("../../../../assets/auth/mail-icon.png")}
                contentFit="contain"
              />
            </View>
            <View>
              <Text
                fontWeight="font-bold"
                className="ml-1 -translate-y-0.5"
              >
                {" "}
                Continue with Email
              </Text>
            </View>
          </Button>
        </StyledView>
        {/* App */}
        {router.getState().routes[router.getState().index].name ===
          "Profile" && (
            <>
              <View
                className={`py-4 border-b-[0.2px] ${isDark ? "border-[#292929]" : "border-[#e6e6e6]"
                  }`}
              >
                <View className="px-5">
                  <Text
                    fontSize="text-base"
                    fontWeight="font-bold"
                    className="pb-3"
                  >
                    Account
                  </Text>
                  <IconButton
                    onPress={() => {
                      router.navigate("myProducts");
                    }}
                    leftIcon="CubeIcon"
                    text="My products"
                    isDarkMode={isDarkMode}
                  />
                </View>
              </View>
              <View
                className={`py-4 border-b-[0.2px] ${isDark ? "border-[#292929]" : "border-[#e6e6e6]"
                  }`}
              >
                <View className="px-5">
                  <Text
                    fontSize="text-base"
                    fontWeight="font-bold"
                    className="pb-3"
                  >
                    App
                  </Text>
                  <IconButton
                    onPress={handleAppeareanceModal}
                    leftIcon="DevicePhoneMobileIcon"
                    text="Switch theme"
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
                className={`py-4 border-b-[0.2px] ${isDark ? "border-[#292929]" : "border-[#e6e6e6]"
                  }`}
              >
                <View className="px-5">
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
                    leftIcon="FlagIcon"
                    text="Report a problem"
                    isDarkMode={isDarkMode}
                  />
                  <IconButton
                    onPress={() => {
                      router.navigate("feedback");
                    }}
                    leftIcon="BriefcaseIcon"
                    text="Feedback & review"
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
                    leftIcon="DocumentIcon"
                    text="Unavailability form"
                    isDarkMode={isDarkMode}
                  />
                </View>
              </View>

              {/* <Legal */}
              <View className="py-4 mb-16">
                <View className="px-5">
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
                    leftIcon="ClipboardDocumentIcon"
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

              <PersonalDetailsSheet
                bottomSheetModalRef={personalDetailsSheetRef}
                isDarkMode={isDarkMode}
              />
            </>
          )}
      </View>
    </>
  );
};

export default ProfilePreAuth;
