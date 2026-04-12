import { Button, Text } from "@/components/core";
import { useProfile } from "@/backend/profile";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { ArrowRightStartOnRectangleIcon } from "react-native-heroicons/outline";
import IconButton from "./profile-icon-button";
import ProfileImgContainer from "./profile-img";
import AppearanceSheet from "./sheets/AppearanceSheet";
import { CurrencySheet } from "./sheets/currency-sheet";
import PersonalDetailsSheet from "./sheets/PersonaldetailsSheet";

interface ProfilePostAuthProps {
  isDarkMode: boolean;
  handleLogout: () => void;
}

const ProfilePostAuth: React.FC<ProfilePostAuthProps> = ({
  isDarkMode,
  handleLogout,
}) => {
  const router = useTypedNavigation();
  const { theme, userDetails } = useGlobalContext();
  const { requestMerchantReview, loading: profileActionLoading } = useProfile();
  const isDark = theme === "dark";
  const isMerchant = userDetails?.account_type === "merchant";
  const merchantStatus = userDetails?.merchant_approval_status;
  const [requestReviewError, setRequestReviewError] = useState<string | null>(null);
  const appearanceSheetRef = useRef<BottomSheetModal>(null);
  const personalDetailsSheetRef = useRef<BottomSheetModal>(null);
  const currencySheetRef = useRef<BottomSheetModal>(null);


  const handleCurrencyModal = () => {
    currencySheetRef.current?.present();
  };

  const handleAppeareanceModal = () => {
    appearanceSheetRef.current?.present();
  };

  const handlePersonalDetailsSheetPress = () => {
    personalDetailsSheetRef.current?.present();
  };

  const handleRequestReviewAgain = async () => {
    try {
      setRequestReviewError(null);
      await requestMerchantReview();
    } catch (error: any) {
      setRequestReviewError(
        error?.response?.data?.error ||
          "Unable to request review right now. Please try again."
      );
    }
  };

  return (
    <>
      <View className="">
        <View
          className={`border-b-[0.2px] ${isDark ? "border-[#292929]" : "border-[#e6e6e6]"
            }`}
        >
          <View className="px-5">
            <ProfileImgContainer
              isDarkMode={isDarkMode}
              handlePersonalDetailsSheetPress={handlePersonalDetailsSheetPress}
            />
            {isMerchant && (
              <View
                className={`mb-4 rounded-xl border px-3 py-2 ${
                  isDark ? "border-[#292929] bg-[#0F0F0F]" : "border-[#e6e6e6] bg-white"
                }`}
              >
                <Text fontWeight="font-semibold">
                  Merchant status: {merchantStatus}
                </Text>
                {merchantStatus !== "approved" && (
                  <Text
                    className={`mt-1 ${isDark ? "text-[#FFFFFFB2]" : "text-[#000000B2]"}`}
                  >
                    Listings will be enabled after merchant approval.
                  </Text>
                )}
                {merchantStatus === "rejected" && (
                  <>
                    <Button
                      className="mt-3"
                      onPress={handleRequestReviewAgain}
                      disabled={profileActionLoading}
                    >
                      {profileActionLoading
                        ? "Requesting review..."
                        : "Request review again"}
                    </Button>
                    {requestReviewError && (
                      <Text className="mt-2 text-red-500">{requestReviewError}</Text>
                    )}
                  </>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Account */}
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

        {/* App */}
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
                router.navigate("NetworkDiagnostics");
              }}
              leftIcon="Square3Stack3DIcon"
              text="Network diagnostics"
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
                router.navigate("unavailabilityFormCategories");
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

          {/* logout */}
          <View className="pt-5 px-5">
            <TouchableOpacity
              onPress={handleLogout}
              className={`${isDark
                ? "bg-[#1A1A1A] border-[#292929]"
                : "bg-white border-[#e6e6e6]"
                } border rounded-[12px] px-4 py-3 flex-row items-center justify-center -translate-y-0.5`}
            >
              <ArrowRightStartOnRectangleIcon
                size={26}
                color="#E50914"
              />
              <Text
                fontSize="text-base"
                fontWeight="font-bold"
                className="text-[#E50914] ml-2"
              >
                Logout
              </Text>
            </TouchableOpacity>
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
      </View>
    </>
  );
};

export default ProfilePostAuth;
