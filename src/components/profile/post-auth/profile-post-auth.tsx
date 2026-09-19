import { Button, Text } from "@/components/core";
import { useProfile } from "@/backend/profile";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import {
  ArrowRightOnRectangleIcon,
  ChatBubbleLeftEllipsisIcon,
  CubeIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  FlagIcon,
  InboxArrowDownIcon,
  LockClosedIcon,
  QuestionMarkCircleIcon,
  UsersIcon,
} from "react-native-heroicons/outline";
import ProfileImgContainer from "./profile-img";
import {
  PROFILE_LIST_GAP,
  ProfileBlockRule,
  ProfileRow,
  ProfileSection,
  ProfileSectionRule,
} from "./profile-row";
import AppearanceSheet from "./sheets/AppearanceSheet";
import { CurrencySheet } from "./sheets/currency-sheet";
import PersonalDetailsSheet from "./sheets/PersonaldetailsSheet";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, density, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";

interface ProfilePostAuthProps {
  isDarkMode: boolean;
  handleLogout: () => void;
}

/** Gap between the logout glyph and its label, off the frame. */
const LOGOUT_ICON_GAP = 4;
const LOGOUT_ICON_SIZE = 24;

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
  const { color, shadow } = useTheme();

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
      {/* The tab bar floats over this list, so the last block needs air under it
          or the logout button sits behind the bar. */}
      <View style={{ paddingBottom: density.listFooter }}>
        <ProfileImgContainer
          isDarkMode={isDarkMode}
          handlePersonalDetailsSheetPress={handlePersonalDetailsSheetPress}
        />
        {isMerchant && (
          <View className="px-gutter">
            <View
              className={`mb-4 rounded-card border px-3 py-2 ${
                isDark ? "border-line-dark bg-surface-dark" : "border-line-light bg-surface-light"
              }`}
            >
              <Text fontWeight="font-semibold">
                Merchant status: {merchantStatus}
              </Text>
              {merchantStatus !== "approved" && (
                <Text
                  className={`mt-1 ${isDark ? "text-muted-dark" : "text-muted-light"}`}
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
                    <Text tone="danger" className="mt-2">{requestReviewError}</Text>
                  )}
                </>
              )}
            </View>
          </View>
        )}

        <ProfileBlockRule />

        {/* One list, four sections. The sections carry no borders of their own:
            the design separates them with a single centred hairline, and rows
            inside a section run edge to edge with nothing between them. */}
        <View style={{ paddingVertical: PROFILE_LIST_GAP }}>
          <ProfileSection title="Account">
            <ProfileRow
              icon={CubeIcon}
              label="My products"
              onPress={() => {
                router.navigate("myProducts");
              }}
            />
          </ProfileSection>

          <ProfileSectionRule />

          <ProfileSection title="App">
            {/* The frame labels this "Dark mode" with a phone glyph, but the row
                opens a three-way system/light/dark choice — "Dark mode" would
                promise a switch the sheet does not offer. */}
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
              label="Unavailability form"
              onPress={() => {
                router.navigate("unavailabilityFormCategories");
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

        {/* Logout is a bordered button at the foot of the screen, not a row in
            the list. It reads in the danger tone because the design says so —
            signing out is recoverable, so the colour is the design's emphasis
            and not this app's usual "destructive" signal. */}
        <View
          style={{
            paddingVertical: PROFILE_LIST_GAP,
            paddingHorizontal: SCREEN_GUTTER,
          }}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Logout"
            activeOpacity={0.6}
            onPress={handleLogout}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: LOGOUT_ICON_GAP,
              minHeight: MIN_TOUCH_TARGET,
              borderRadius: radius.button,
              borderWidth: 1,
              borderColor: color.line,
              backgroundColor: color.surface,
              // Light lifts the button off the canvas; dark draws the edge only,
              // which is what this token pair already encodes.
              ...shadow,
            }}
          >
            <ArrowRightOnRectangleIcon
              size={LOGOUT_ICON_SIZE}
              color={color.danger}
              strokeWidth={1.5}
            />
            <Text fontSize="text-sm" fontWeight="font-bold" tone="danger">
              Logout
            </Text>
          </TouchableOpacity>
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
