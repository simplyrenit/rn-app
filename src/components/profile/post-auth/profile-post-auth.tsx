import { KycCard } from "@/components/kyc/kyc-card";
import { ListRow } from "@/components/core";
import { useProfile } from "@/backend/profile";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { useRef, useState } from "react";
import { View } from "react-native";
import {
  AdjustmentsHorizontalIcon,
  ArrowRightOnRectangleIcon,
  BriefcaseIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  ChatBubbleLeftEllipsisIcon,
  CubeIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  FlagIcon,
  InboxArrowDownIcon,
  LockClosedIcon,
  MapPinIcon,
  QuestionMarkCircleIcon,
  UsersIcon,
} from "react-native-heroicons/outline";
import { MerchantStatusCard } from "./merchant-status-card";
import ProfileImgContainer from "./profile-img";
import {
  ProfileBlockRule,
  ProfileRow,
  ProfileSection,
  ProfileSectionRule,
} from "./profile-row";
import AppearanceSheet from "./sheets/AppearanceSheet";
import { CurrencySheet } from "./sheets/currency-sheet";
import PersonalDetailsSheet from "./sheets/PersonaldetailsSheet";
import { SCREEN_GUTTER } from "@/lib/design-tokens";

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
      {/* Body (2095:25349): the scroll view ends at the tab bar (profile.tsx bounds it), so the list ends 24 under Logout. */}
      <View style={{ paddingBottom: SCREEN_GUTTER }}>
        <ProfileImgContainer
          isDarkMode={isDarkMode}
          handlePersonalDetailsSheetPress={handlePersonalDetailsSheetPress}
        />
        {/* Status cards (2095:25822 / 26102): padding 0 24 16, gap 12 between the merchant status and the KYC card. */}
        {isMerchant ? (
          <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: 16, gap: 12 }}>
            <MerchantStatusCard
              status={merchantStatus}
              onRequestReview={handleRequestReviewAgain}
              loading={profileActionLoading}
              error={requestReviewError}
            />
            <KycCard isDark={isDark} />
          </View>
        ) : (
          // Anyone else's ID check (ENG-351), once they have one on file. It hides itself otherwise, and its margins
          // go with it.
          <KycCard isDark={isDark} style={{ marginHorizontal: SCREEN_GUTTER, marginBottom: 16 }} />
        )}

        <ProfileBlockRule />

        {/* Four sections stacked with a 1pt rule between them and no other air; rows run edge to edge. */}
        <View>
          <ProfileSection title="Account">
            <ProfileRow
              icon={CalendarDaysIcon}
              label="Today and bookings"
              onPress={() => {
                router.navigate("ShopToday");
              }}
            />
            <ProfileRow
              icon={CubeIcon}
              label="My products"
              onPress={() => {
                router.navigate("myProducts");
              }}
            />
            <ProfileRow
              icon={AdjustmentsHorizontalIcon}
              label="Rental settings"
              onPress={() => {
                router.navigate("RentalSettings");
              }}
            />
            <ProfileRow
              icon={BuildingLibraryIcon}
              label="Bank account"
              onPress={() => {
                router.navigate("BankAccount");
              }}
            />
            <ProfileRow
              icon={MapPinIcon}
              label="Saved addresses"
              onPress={() => {
                router.navigate("SavedAddresses");
              }}
            />
            {/* GST invoices to a customer's GSTIN (ENG-352); a merchant has its own business flow. */}
            {!isMerchant && (
              <ProfileRow
                icon={BriefcaseIcon}
                label="Business billing"
                onPress={() => {
                  router.navigate("BusinessBilling");
                }}
              />
            )}
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
              label="Request an item"
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

        <ProfileSectionRule />

        {/* Logout is a kit List row in the danger tone (frame "Logout", 64 high: 8 above the 56 row). */}
        <View style={{ paddingTop: 8 }}>
          <ListRow
            leadingIcon={ArrowRightOnRectangleIcon}
            label="Logout"
            tone="danger"
            chevron={false}
            onPress={handleLogout}
          />
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
