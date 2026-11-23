import { HeaderIndicator } from "@/components/auth/headerIndicator";
import {
  BottomBar,
  Button,
  FieldShell,
  NonScrollableContainer,
  ScrollContainer,
  Text,
  TextField,
} from "@/components/core";
import { useAuthContext } from "@/context/auth-context";
import { usePublicTerms, TermsKind } from "@/backend/terms";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import { Linking, Modal, ScrollView, TouchableOpacity, View } from "react-native";
import { InformationCircleIcon } from "react-native-heroicons/outline";
import { ChevronDownIcon } from "react-native-heroicons/mini";
import { CheckBox } from "@/components/core/checkbox";
import { OwnerTermsTick } from "@/components/terms/owner-terms-tick";
import { density, ink, SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Constants for date selections
const DATES = Array.from({ length: 31 }, (_, i) =>
  String(i + 1).padStart(2, "0")
);
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const YEARS = Array.from({ length: 100 }, (_, i) =>
  String(new Date().getFullYear() - i)
);

/** Dev-only design seed (ENG-428 plan §1/§2): only DevFixture passes it. */
type AboutDesign = {
  merchant?: boolean;
  businessName?: string;
  firstName?: string;
  lastName?: string;
  dob?: { date: string; month: string; year: string };
  errors?: Partial<ErrorState>;
  agreed?: boolean;
  ownerTerms?: TermsKind;
  ownerTermsAccepted?: boolean;
};

// figma/02 2089:25271: the form is a column 24 apart. The kit TextField keeps
// its own 18 below itself, which `Field` cancels so the column's gap applies.
const SECTION_GAP = 24;

/** The 2.1 Form field (label, 48 input, error), spaced as the frame's column. */
function Field(props: React.ComponentProps<typeof TextField>) {
  return (
    <View style={{ marginBottom: -density.fieldGap }}>
      <TextField maxFontSizeMultiplier={1.4} {...props} />
    </View>
  );
}

/**
 * The non-field message row (25343 "Message"): an information-circle 16 and a
 * 12/16 Medium line 6 to its right. Used for the DOB message and `sameName`.
 */
function MessageRow({ children, tone }: { children: React.ReactNode; tone: "danger" | "warning" }) {
  const { color } = useTheme();
  const ink = tone === "danger" ? color.dangerStrong : color.warning;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <InformationCircleIcon size={16} color={ink} />
      <Text fontSize="text-xs" fontWeight="font-medium" lineHeight={16} style={{ flexShrink: 1, color: ink }}>
        {children}
      </Text>
    </View>
  );
}

/**
 * The kit card row (25271 "Card row"): 342×50, padded 14/16, a 14/20 Medium
 * label and the checkbox on the right; ticked, it takes the brand panel fill and
 * a brand edge (25419). The checkbox's 44 target is cancelled vertically so the
 * row stays 50, and pulled 11 right so its box sits at the frame's x329.
 */
function CardRow({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        minHeight: 50,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: checked ? color.brand : color.line,
        backgroundColor: checked ? color.brandPanel : color.surface,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text fontSize="text-sm" fontWeight="font-medium" lineHeight={20} style={{ flexShrink: 1 }}>
        {label}
      </Text>
      <View style={{ marginVertical: -12, marginRight: -11 }}>
        <CheckBox checked={checked} onPress={onPress} accessibilityLabel={label} />
      </View>
    </View>
  );
}

interface DropdownProps {
  value: string;
  placeholder: string;
  options: string[];
  onSelect: (value: string) => void;
  isDarkMode: boolean;
  /** 25343: a blocking DOB message gives all three boxes the kit error edge. */
  error: boolean;
}

// 25271 "Dropdowns": 88 / 138 / 100, 8 apart. These are maximums: flexShrink
// lets them fit 312pt of content on a 360dp Android screen, or a raised
// display size, where the Year box used to run off screen.
const DROPDOWN_WIDTH: Record<string, number> = { Date: 88, Month: 138, Year: 100 };

const Dropdown: React.FC<DropdownProps> = ({
  value,
  placeholder,
  options,
  onSelect,
  isDarkMode,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { color } = useTheme();

  return (
    <View style={{ width: DROPDOWN_WIDTH[placeholder], flexShrink: 1, zIndex: 123 }}>
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        accessibilityRole="button"
        accessibilityLabel={value ? `${placeholder}, ${value}` : placeholder}
      >
        <FieldShell
          error={error}
          style={{ paddingHorizontal: 12, paddingVertical: 0, justifyContent: "space-between", gap: 0 }}
        >
          {/* "September" fills the Month box exactly at 1x; at a larger font it
              pushed the chevron out of the box instead of truncating. */}
          <Text
            fontSize="text-md"
            lineHeight={24}
            numberOfLines={1}
            style={{ flexShrink: 1, color: value ? color.text : color.placeholder }}
          >
            {value || placeholder}
          </Text>
          <ChevronDownIcon color={color.textDim} size={20} />
        </FieldShell>
      </TouchableOpacity>

      {isOpen && (
        <Modal
        // Android: draw under the status bar too, so the scrim covers it and
        // insets.top means the same thing as on iOS.
        statusBarTranslucent visible={isOpen} transparent onDismiss={() => setIsOpen(false)} onRequestClose={() => setIsOpen(false)}>
          <View style={{ height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: ink.scrim(isDarkMode), position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 }} /* onTouchEnd={() => setIsOpen(false)} */>

            <View style={{ backgroundColor: ink.surface(isDarkMode), width: '100%' }}>

              {/* The list starts under the status bar: 48 cleared a 47pt notch but
                  left the first option under the Dynamic Island on a Pro Max. */}
              <ScrollView className="mb-[100px]" showsVerticalScrollIndicator={false} nestedScrollEnabled style={{ height: '100%' }} contentContainerStyle={{ paddingTop: Math.max(48, insets.top) }}>
                {options.map((option, index) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => {
                      onSelect(option);
                      setIsOpen(false);
                    }}
                    style={{
                      borderWidth: 1,
                      borderBottomWidth: index < options.length - 1 ? 0 : 1,
                      borderTopLeftRadius: index === 0 ? 8 : 0,
                      borderTopRightRadius: index === 0 ? 8 : 0,
                      borderColor: ink.line(isDarkMode),
                      borderBottomRightRadius: index === options.length - 1 ? 8 : 0,
                      borderBottomLeftRadius: index === options.length - 1 ? 8 : 0,
                    }}
                    className={`p-4 border-b ${isDarkMode ? "border-input-line-dark" : "border-input-line-light"
                      } ${value === option ? "bg-brand/10" : ""}`}
                  >
                    <Text className={isDarkMode ? "text-white" : "text-black"}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )
      }
    </View >
  );
};

interface BusinessFormProps {
  firstName: string;
  lastName: string;
  businessName: string;
  setFirstName: (value: string) => void;
  setLastName: (value: string) => void;
  setBusinessName: (value: string) => void;
  errors: ErrorState;
  setError: React.Dispatch<React.SetStateAction<ErrorState>>;
}

interface ErrorState {
  firstName: string;
  lastName: string;
  ownerName: string;
  businessName: string;
  sameName: string;
}

interface IndividualFormProps {
  firstName: string;
  lastName: string;
  setFirstName: (value: string) => void;
  setLastName: (value: string) => void;
  errors: ErrorState;
  isDarkMode: boolean;
  setError: React.Dispatch<React.SetStateAction<ErrorState>>;
  dob: {
    date: string;
    month: string;
    year: string;
  };
  setDob: React.Dispatch<
    React.SetStateAction<{
      date: string;
      month: string;
      year: string;
    }>
  >;
  dobError: string;
}

const IndividualForm: React.FC<IndividualFormProps> = ({
  firstName,
  lastName,
  setFirstName,
  setLastName,
  errors,
  isDarkMode,
  setError,
  dob,
  setDob,
  dobError,
}) => {
  // Required and under-13 block sign-up, so they draw the error edge; the
  // 13-18 note is only a warning and leaves the boxes as they are.
  const dobWarning = dobError.startsWith("Warning");
  const dobBlocking = Boolean(dobError) && !dobWarning;
  return (
    <>
      <Field
        label="First name"
        value={firstName}
        onChangeText={(text) => {
          setFirstName(text);
          if (errors.firstName) {
            setError((prev) => ({ ...prev, firstName: "" }));
          }
        }}
        error={errors.firstName || undefined}
      />

      <Field
        label="Last name"
        value={lastName}
        onChangeText={(text) => {
          setLastName(text);
          if (errors.lastName) {
            setError((prev) => ({ ...prev, lastName: "" }));
          }
        }}
        error={errors.lastName || undefined}
      />

      <View style={{ gap: 8 }}>
        <Text role="fieldLabel">Date of birth</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Dropdown
            value={dob.date}
            placeholder="Date"
            options={DATES}
            onSelect={(value) => setDob((prev) => ({ ...prev, date: value }))}
            isDarkMode={isDarkMode}
            error={dobBlocking}
          />
          <Dropdown
            value={dob.month}
            placeholder="Month"
            options={MONTHS}
            onSelect={(value) => setDob((prev) => ({ ...prev, month: value }))}
            isDarkMode={isDarkMode}
            error={dobBlocking}
          />
          <Dropdown
            value={dob.year}
            placeholder="Year"
            options={YEARS}
            onSelect={(value) => { setDob((prev) => ({ ...prev, year: value })) }}
            isDarkMode={isDarkMode}
            error={dobBlocking}
          />
        </View>
        {dobError ? (
          <MessageRow tone={dobWarning ? "warning" : "danger"}>{dobError}</MessageRow>
        ) : null}
      </View>
    </>
  );
};

const BusinessForm: React.FC<BusinessFormProps> = ({
  firstName,
  lastName,
  businessName,
  setFirstName,
  setLastName,
  setBusinessName,
  errors,
  setError,
}) => (
  <>
    <Field
      label="Legal name of the business"
      value={businessName}
      onChangeText={(text) => {
        setBusinessName(text);
        if (errors.businessName) {
          setError((prev) => ({ ...prev, businessName: "" }));
        }
      }}
      error={errors.businessName || undefined}
    />

    <Field
      label="Owner’s first name"
      value={firstName}
      onChangeText={(text) => {
        setFirstName(text);
        if (errors.firstName) {
          setError((prev) => ({ ...prev, firstName: "" }));
        }
      }}
      error={errors.firstName || undefined}
    />

    <Field
      label="Owner’s last name"
      value={lastName}
      onChangeText={(text) => {
        setLastName(text);
        if (errors.lastName) {
          setError((prev) => ({ ...prev, lastName: "" }));
        }
      }}
      error={errors.lastName || undefined}
    />
  </>
);

export default function AboutYourself() {
  const router = useTypedNavigation();
  const route = useRoute();
  const design = __DEV__ ? (route.params as { design?: AboutDesign } | undefined)?.design : undefined;
  const [isMerchant, setIsMerchant] = useState(design?.merchant ?? false);
  // "I'm renting for a business" (ENG-352): a customer's only; the GSTIN comes after sign-up.
  const [forBusiness, setForBusiness] = useState(false);
  const [firstName, setFirstName] = useState(design?.firstName ?? "");
  const [lastName, setLastName] = useState(design?.lastName ?? "");
  const [businessName, setBusinessName] = useState(design?.businessName ?? "");
  const [dob, setDob] = useState(design?.dob ?? {
    date: "",
    month: "",
    year: "",
  });
  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    ownerName: "",
    businessName: "",
    sameName: "",
    ...design?.errors,
  });
  const [dobError, setDobError] = useState("");
  const [agreementChecked, setAgreementChecked] = useState(design?.agreed ?? false);
  // A merchant also accepts the owner terms (ENG-122). The account does not exist
  // yet, so the tick is kept on the sign-up draft and sent once it does, against
  // the page and the version read here, signed out, and shown by the link below.
  const [ownerTermsChecked, setOwnerTermsChecked] = useState(design?.ownerTermsAccepted ?? false);
  const publicTerms = usePublicTerms();
  // A seed brings its own terms, so the frame does not depend on QA's.
  const ownerTerms = design?.ownerTerms ?? publicTerms.data?.owner;

  const openOwnerTerms = () => {
    if (design || !ownerTerms?.url) return;
    // The owner terms themselves, not the app's general Terms screen: what is
    // recorded is an acceptance of this page.
    Linking.openURL(ownerTerms.url).catch(() =>
      toast.error("We couldn't open the owner terms", { message: "Check your connection and try again." })
    );
  };

  const { color, isDark: isDarkMode } = useTheme();
  const { saveUser } = useAuthContext();

  const calculateAge = useCallback(
    (dob: { date: string; month: string; year: string }) => {
      if (!dob.date || !dob.month || !dob.year) return null;

      const birthDate = new Date(
        parseInt(dob.year),
        MONTHS.indexOf(dob.month),
        parseInt(dob.date)
      );
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      return age;
    },
    []
  );

  const validateForm = useCallback(() => {
    let isValid = true;
    const newErrors = {
      firstName: "",
      lastName: "",
      ownerName: "",
      businessName: "",
      sameName: "",
    };

    if (firstName.trim() === "") {
      newErrors.firstName = "First name is required";
      isValid = false;
    }
    if (lastName.trim() === "") {
      newErrors.lastName = "Last name is required";
      isValid = false;
    }

    if (isMerchant) {
      if (businessName.trim() === "") {
        newErrors.businessName = "Business name is required";
        isValid = false;
      }
    }

    if (!isMerchant) {
      if (!dob.date || !dob.month || !dob.year) {
        setDobError("Date of birth is required.");
        isValid = false;
      }
      const age = calculateAge(dob);
      if (age !== null) {
        if (age < 13) {
          setDobError("Users below 13 years are not allowed to use this app.");
          isValid = false;
        } else if (age < 18) {
          setDobError(
            "Warning: Users between 13-18 years need parental guidance to use this app."
          );
          // Don't set isValid to false here as it's just a warning
        } else {
          setDobError("");
        }
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [isMerchant, firstName, lastName, businessName, dob, calculateAge]);

  useEffect(() => {
    if (!isMerchant) {
      const age = calculateAge(dob);
      if (age !== null) {
        if (age < 13) {
          setDobError("Users below 13 years are not allowed to use this app.");
        } else if (age < 18) {
          setDobError(
            "Warning: Users between 13-18 years need parental guidance to use this app."
          );
          // Don't set isValid to false here as it's just a warning
        } else {
          setDobError("");
        }
      }
    } else {
      setDobError("");
    }
  }, [dob, isMerchant, calculateAge]);

  const handleSubmit = useCallback(() => {
    // A design seed never saves the draft or moves on.
    if (design) return;
    if (validateForm()) {
      const monthIndex = MONTHS.indexOf(dob.month);
      const formattedDob =
        !isMerchant &&
        dob.year &&
        dob.date &&
        monthIndex >= 0
          ? `${dob.year}-${String(monthIndex + 1).padStart(2, "0")}-${
              dob.date
            }`
          : undefined;

      saveUser({
        first_name: firstName,
        last_name: lastName,
        account_type: isMerchant ? "merchant" : "user",
        business_name: isMerchant ? businessName.trim() : "",
        date_of_birth: !isMerchant ? formattedDob || "" : "",
        bills_to_business: !isMerchant && forBusiness,
        owner_terms_accepted: isMerchant && ownerTermsChecked,
        // The version the link showed when the box was ticked; sent once the account exists.
        owner_terms_version: isMerchant && ownerTermsChecked ? ownerTerms?.version : undefined,
      });
      router.navigate("Password");
    }
  }, [design, isMerchant, forBusiness, dob, firstName, lastName, businessName, ownerTermsChecked, ownerTerms?.version, validateForm, saveUser, router]);

  return (
    <NonScrollableContainer>
      <HeaderIndicator percentage={30} />

      <ScrollContainer
        containerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 24, gap: SECTION_GAP }}
      >
        <View style={{ gap: 4 }}>
          <Text role="screenTitle">Tell us about yourself</Text>
          <Text fontSize="text-sm" lineHeight={20} tone="body">
            Spill the beans already
          </Text>
        </View>

        {/* 25271 "Account type": label, card, helper, 8 apart; a 4pt spacer
            before the second card. */}
        <View style={{ gap: 8 }}>
          <Text role="fieldLabel">Account type</Text>
          <CardRow
            label="Are you a merchant?"
            checked={isMerchant}
            onPress={() => {
              setIsMerchant((prev) => !prev);
              setDobError("");
            }}
          />
          <Text role="fieldHint">
            Merchant accounts require admin approval before posting listings.
          </Text>
          {!isMerchant && (
            <>
              <View style={{ height: 4 }} />
              <CardRow
                label="I’m renting for a business"
                checked={forBusiness}
                onPress={() => setForBusiness((prev) => !prev)}
              />
              <Text role="fieldHint">
                Add your GSTIN later in Profile to get GST invoices.
              </Text>
            </>
          )}
        </View>

        {!isMerchant && (
          <IndividualForm
            firstName={firstName}
            lastName={lastName}
            setFirstName={setFirstName}
            setLastName={setLastName}
            errors={errors}
            isDarkMode={isDarkMode}
            setError={setErrors}
            dob={dob}
            setDob={setDob}
            dobError={dobError}
          />
        )}

        {isMerchant && (
          <BusinessForm
            firstName={firstName}
            lastName={lastName}
            businessName={businessName}
            setFirstName={setFirstName}
            setLastName={setLastName}
            setBusinessName={setBusinessName}
            errors={errors}
            setError={setErrors}
          />
        )}

        {/* No frame draws it: the non-field message row (plan §3). */}
        {errors.sameName ? <MessageRow tone="danger">{errors.sameName}</MessageRow> : null}
      </ScrollContainer>

      {/* 25271/25419 "Footer": the ticks above the bar, 16 apart, under the
          footer's own hairline; the bar below draws none (its strip starts at
          the footer's end, y739). Each 44pt checkbox target is cancelled
          vertically so a tick row is as tall as its text (20 / 40). */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: color.line,
          backgroundColor: color.canvas,
          paddingTop: 16,
          paddingHorizontal: SCREEN_GUTTER,
          gap: 16,
        }}
      >
        {isMerchant && (
          ownerTerms ? (
            <View style={{ marginVertical: -12 }}>
              <OwnerTermsTick
                checked={ownerTermsChecked}
                onChange={setOwnerTermsChecked}
                onOpenTerms={openOwnerTerms}
              />
            </View>
          ) : publicTerms.isError ? (
            // No page and no version means nothing to tick: say so and offer
            // another try, rather than a box that records a page nobody saw.
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text fontSize="text-xs" lineHeight={16} style={{ flex: 1, color: color.dangerStrong }}>
                We couldn't load the owner terms.
              </Text>
              <Button variant="outline" tone="tonal" size="compact" onPress={() => void publicTerms.refetch()}>
                Try again
              </Button>
            </View>
          ) : (
            <Text role="fieldHint">Loading the owner terms…</Text>
          )
        )}
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View style={{ marginVertical: -12 }}>
            <CheckBox
              checked={agreementChecked}
              onPress={() => setAgreementChecked(!agreementChecked)}
              accessibilityLabel="I agree to provide accurate and verifiable information"
            />
          </View>
          {/* flex-1: the sentence is 350pt on one line, so beside the box it ran
              ~30pt past the content edge and "information" was cut by the
              screen, even at 390. */}
          <Text fontSize="text-sm" lineHeight={20} tone="body" style={{ flex: 1, marginLeft: 8 }}>
            I agree to provide accurate and verifiable information
          </Text>
        </View>
      </View>

      <BottomBar
        style={{ borderTopWidth: 0 }}
        primary={{
          label: "Continue",
          onPress: handleSubmit,
          disabled: !agreementChecked || (isMerchant && !(ownerTerms && ownerTermsChecked)),
        }}
      />
    </NonScrollableContainer>
  );
}
