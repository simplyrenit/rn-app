import { HeaderIndicator } from "@/components/auth/headerIndicator";
import { Button, StaticContainer, Text } from "@/components/core";
import { ScrollContainer } from "@/components/core/scroll-container";
import { useAuthContext } from "@/context/auth-context";
import { useGlobalContext } from "@/context/global-context";
import { usePublicTerms } from "@/backend/terms";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import React, { useCallback, useEffect, useState } from "react";
import { Linking, Modal, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import {
  InformationCircleIcon,
  ChevronDownIcon,
} from "react-native-heroicons/outline";
import { CheckBox } from "@/components/core/checkbox";
import { OwnerTermsTick } from "@/components/terms/owner-terms-tick";
import { ink } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";

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

interface DropdownProps {
  value: string;
  placeholder: string;
  options: string[];
  onSelect: (value: string) => void;
  isDarkMode: boolean;
  setDobError: (error: string) => void;
}

const Dropdown: React.FC<DropdownProps> = ({
  value,
  placeholder,
  options,
  onSelect,
  isDarkMode,
  setDobError,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View
      className={`relative ${placeholder === "Date"
        ? "w-[100px]"
        : placeholder === "Month"
          ? "w-[120px]"
          : "w-[100px]"
        }`}
      style={{ zIndex: 123 }}
    >
      <TouchableOpacity
        onPress={() => {
          setIsOpen(!isOpen);
          // setDobError("");
        }}
        className={`p-3 border rounded-card ${isDarkMode
          ? "bg-surface-dark border-input-line-dark"
          : "bg-surface-light border-input-line-light"
          }`}
      >
        <View className="flex-row justify-between items-center">
          <Text className={isDarkMode ? "text-white" : "text-black"}>
            {value || placeholder}
          </Text>
          <ChevronDownIcon
            color={ink.text(isDarkMode)}
            size={20}
          />
        </View>
      </TouchableOpacity>

      {isOpen && (
        <Modal visible={isOpen} transparent onDismiss={() => setIsOpen(false)} onRequestClose={() => setIsOpen(false)}>
          <View style={{ height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: ink.scrim(isDarkMode), position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 }} /* onTouchEnd={() => setIsOpen(false)} */>

            <View style={{ backgroundColor: ink.surface(isDarkMode), width: '100%' }}>

              <ScrollView className="mb-[100px]" showsVerticalScrollIndicator={false} nestedScrollEnabled style={{ height: '100%' }} contentContainerStyle={{ paddingTop: 48 }}>
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
  isDarkMode: boolean;
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
  setDobError: (error: string) => void;
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
  setDobError,
}) => (
  <>
    <View className="mt-4">
      <Text
        fontSize="text-sm"
        fontWeight="font-semibold"
        className="mb-2"
      >
        First name
      </Text>
      <TextInput
        value={firstName}
        onChangeText={(text) => {
          setFirstName(text);
          if (errors.firstName) {
            setError((prev) => ({ ...prev, firstName: "" }));
          }
        }}
        className={`p-2 border rounded-card ${isDarkMode
          ? "bg-surface-dark text-white border-input-line-dark"
          : "bg-surface-light text-black border-input-line-light"
          }`}
        placeholderTextColor={ink.placeholder(isDarkMode)}
      />
      {errors.firstName && (
        <View className="flex flex-row items-center mt-4 space-x-3">
          <InformationCircleIcon
            size={14}
            color={ink.danger(true)}
          />
          <Text tone="danger">{errors.firstName}</Text>
        </View>
      )}
    </View>

    <View className="mt-4">
      <Text
        fontSize="text-sm"
        fontWeight="font-semibold"
        className="mb-2"
      >
        Last name
      </Text>
      <TextInput
        value={lastName}
        onChangeText={(text) => {
          setLastName(text);
          if (errors.lastName) {
            setError((prev) => ({ ...prev, lastName: "" }));
          }
        }}
        className={`p-2 border rounded-card ${isDarkMode
          ? "bg-surface-dark text-white border-input-line-dark"
          : "bg-surface-light text-black border-input-line-light"
          }`}
        placeholderTextColor={ink.placeholder(isDarkMode)}
      />
      {errors.lastName && (
        <View className="flex flex-row items-center mt-4 space-x-3">
          <InformationCircleIcon
            size={14}
            color={ink.danger(true)}
          />
          <Text tone="danger">{errors.lastName}</Text>
        </View>
      )}
    </View>

    <View className="mt-4">
      <Text
        fontSize="text-sm"
        fontWeight="font-semibold"
        className="mb-2"
      >
        Date of birth
      </Text>
      <View className=" flex-1 flex-row justify-between pb-2">
        <Dropdown
          value={dob.date}
          placeholder="Date"
          options={DATES}
          onSelect={(value) => setDob((prev) => ({ ...prev, date: value }))}
          isDarkMode={isDarkMode}
          setDobError={setDobError}
        />
        <Dropdown
          value={dob.month}
          placeholder="Month"
          options={MONTHS}
          onSelect={(value) => setDob((prev) => ({ ...prev, month: value }))}
          isDarkMode={isDarkMode}
          setDobError={setDobError}
        />
        <Dropdown
          value={dob.year}
          placeholder="Year"
          options={YEARS}
          onSelect={(value) => { setDob((prev) => ({ ...prev, year: value })) }}
          isDarkMode={isDarkMode}
          setDobError={setDobError}
        />
      </View>
      {dobError && (
        <View className="flex flex-row items-center mt-2 mr-2 space-x-3" style={{ bottom: 0, left: 0, right: 0 }}>
          <InformationCircleIcon
            size={14}
            color={
              dobError.includes("not allowed")
                ? ink.danger(isDarkMode)
                : ink.warning(isDarkMode)
            }
          />
          <Text
            tone={dobError.includes("not allowed") ? "danger" : "warning"}
            className="flex-wrap"
          >
            {dobError}
          </Text>
        </View>
      )}
    </View>
  </>
);

// Business Form component remains unchanged
const BusinessForm: React.FC<BusinessFormProps> = ({
  firstName,
  lastName,
  businessName,
  setFirstName,
  setLastName,
  setBusinessName,
  errors,
  isDarkMode,
  setError,
}) => (
  <>
    <View className="mt-4">
      <Text
        fontSize="text-sm"
        fontWeight="font-semibold"
        className="mb-2"
      >
        Legal name of the business
      </Text>
      <TextInput
        value={businessName}
        onChangeText={(text) => {
          setBusinessName(text);
          if (errors.businessName) {
            setError((prev) => ({ ...prev, businessName: "" }));
          }
        }}
        className={`p-2 border rounded-card ${isDarkMode
          ? "bg-surface-dark text-white border-input-line-dark"
          : "bg-surface-light text-black border-input-line-light"
          }`}
        placeholderTextColor={ink.placeholder(isDarkMode)}
      />
      {errors.businessName && (
        <View className="flex flex-row items-center mt-4 space-x-3">
          <InformationCircleIcon
            size={14}
            color={ink.danger(true)}
          />
          <Text tone="danger">{errors.businessName}</Text>
        </View>
      )}
    </View>

    <View className="mt-4">
      <Text
        fontSize="text-sm"
        fontWeight="font-semibold"
        className="mb-2"
      >
        Owner's first name
      </Text>
      <TextInput
        value={firstName}
        onChangeText={(text) => {
          setFirstName(text);
          if (errors.firstName) {
            setError((prev) => ({ ...prev, firstName: "" }));
          }
        }}
        className={`p-2 border rounded-card ${isDarkMode
          ? "bg-surface-dark text-white border-input-line-dark"
          : "bg-surface-light text-black border-input-line-light"
          }`}
        placeholderTextColor={ink.placeholder(isDarkMode)}
      />
      {errors.firstName && (
        <View className="flex flex-row items-center mt-4 space-x-3">
          <InformationCircleIcon
            size={14}
            color={ink.danger(true)}
          />
          <Text tone="danger">{errors.firstName}</Text>
        </View>
      )}
    </View>

    <View className="mt-4">
      <Text
        fontSize="text-sm"
        fontWeight="font-semibold"
        className="mb-2"
      >
        Owner's last name
      </Text>
      <TextInput
        value={lastName}
        onChangeText={(text) => {
          setLastName(text);
          if (errors.lastName) {
            setError((prev) => ({ ...prev, lastName: "" }));
          }
        }}
        className={`p-2 border rounded-card ${isDarkMode
          ? "bg-surface-dark text-white border-input-line-dark"
          : "bg-surface-light text-black border-input-line-light"
          }`}
        placeholderTextColor={ink.placeholder(isDarkMode)}
      />
      {errors.lastName && (
        <View className="flex flex-row items-center mt-4 space-x-3">
          <InformationCircleIcon
            size={14}
            color={ink.danger(true)}
          />
          <Text tone="danger">{errors.lastName}</Text>
        </View>
      )}
    </View>
  </>
);

export default function AboutYourself() {
  const router = useTypedNavigation();
  const [isMerchant, setIsMerchant] = useState(false);
  // "I'm renting for a business" (ENG-352): a customer's only; the GSTIN comes after sign-up.
  const [forBusiness, setForBusiness] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [dob, setDob] = useState({
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
  });
  const [dobError, setDobError] = useState("");
  const [agreementChecked, setAgreementChecked] = useState(false);
  // A merchant also accepts the owner terms (ENG-122). The account does not exist
  // yet, so the tick is kept on the sign-up draft and sent once it does, against
  // the page and the version read here, signed out, and shown by the link below.
  const [ownerTermsChecked, setOwnerTermsChecked] = useState(false);
  const publicTerms = usePublicTerms();
  const ownerTerms = publicTerms.data?.owner;

  const openOwnerTerms = () => {
    if (!ownerTerms?.url) return;
    // The owner terms themselves, not the app's general Terms screen: what is
    // recorded is an acceptance of this page.
    Linking.openURL(ownerTerms.url).catch(() =>
      toast.error("We couldn't open the owner terms", { message: "Check your connection and try again." })
    );
  };

  const { color } = useTheme();
  const { theme } = useGlobalContext();
  const isDarkMode = theme === "dark";
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
  }, [isMerchant, forBusiness, dob, firstName, lastName, businessName, ownerTermsChecked, ownerTerms?.version, validateForm, saveUser, router]);

  return (
    <StaticContainer>
      <View className="flex-1 ">
        <HeaderIndicator percentage={30} />

        <ScrollContainer>
          <View className="flex-1 mb-[100px]">
            <View className="flex">
              <Text
                fontSize="text-2xl"
                fontWeight="font-bold"
              >
                Tell us about yourself
              </Text>
              <Text
                fontSize="text-base"
                className={`${isDarkMode ? "text-muted-dark" : "text-muted-light"
                  } mt-1`}
              >
                Spill the beans already
              </Text>
            </View>

            <View>
              <View className="mt-4">
                <Text
                  fontSize="text-sm"
                  fontWeight="font-bold"
                  className="mb-2"
                >
                  Account type
                </Text>
                <View
                  className={`mt-2 p-3 rounded-card border flex-row items-center justify-between ${
                    isDarkMode
                      ? "bg-surface-dark border-input-line-dark"
                      : "bg-surface-light border-input-line-light"
                  }`}
                >
                  <Text
                    fontSize="text-sm"
                    className={isDarkMode ? "text-white" : "text-black"}
                  >
                    Are you a merchant?
                  </Text>
                  <CheckBox
                    checked={isMerchant}
                    onPress={() => {
                      setIsMerchant((prev) => !prev);
                      setDobError("");
                    }}
                  />
                </View>
                <Text
                  className={`mt-2 ${isDarkMode ? "text-muted-dark" : "text-muted-light"}`}
                >
                  Merchant accounts require admin approval before posting listings.
                </Text>
                {!isMerchant && (
                  <>
                    <View
                      className={`mt-3 p-3 rounded-card border flex-row items-center justify-between ${
                        isDarkMode
                          ? "bg-surface-dark border-input-line-dark"
                          : "bg-surface-light border-input-line-light"
                      }`}
                    >
                      <Text fontSize="text-sm" className={isDarkMode ? "text-white" : "text-black"}>
                        I'm renting for a business
                      </Text>
                      <CheckBox checked={forBusiness} onPress={() => setForBusiness((prev) => !prev)} />
                    </View>
                    <Text className={`mt-2 ${isDarkMode ? "text-muted-dark" : "text-muted-light"}`}>
                      Add your GSTIN later in Profile to get GST invoices.
                    </Text>
                  </>
                )}
              </View>
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
                setDobError={setDobError}
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
                isDarkMode={isDarkMode}
                setError={setErrors}
              />
            )}

            {errors.sameName && (
              <View className="flex flex-row items-center mt-4 space-x-3">
                <InformationCircleIcon
                  size={14}
                  color={ink.danger(true)}
                />
                <Text tone="danger">{errors.sameName}</Text>
              </View>
            )}
          </View>
        </ScrollContainer>

        <View className="py-5">
          {isMerchant && (
            <View className="mb-1">
              {ownerTerms ? (
                <OwnerTermsTick
                  checked={ownerTermsChecked}
                  onChange={setOwnerTermsChecked}
                  onOpenTerms={openOwnerTerms}
                />
              ) : publicTerms.isError ? (
                // No page and no version means nothing to tick: say so and offer
                // another try, rather than a box that records a page nobody saw.
                <View className="flex-row items-center justify-between mb-2">
                  <Text tone="danger" fontSize="text-sm" style={{ flex: 1 }}>
                    We couldn't load the owner terms.
                  </Text>
                  <Button variant="outline" size="compact" onPress={() => void publicTerms.refetch()}>
                    Try again
                  </Button>
                </View>
              ) : (
                <Text tone="dim" fontSize="text-sm" className="mb-2">
                  Loading the owner terms…
                </Text>
              )}
            </View>
          )}
          <View className="flex-row items-center mb-4">
            <CheckBox
              checked={agreementChecked}
              onPress={() => setAgreementChecked(!agreementChecked)}
            />
            <Text
              className={`ml-2 ${isDarkMode ? "text-muted-dark" : "text-muted-light"
                }`}
            >
              I agree to provide accurate and verifiable information
            </Text>
          </View>
          <Button
            variant="primary"
            onPress={handleSubmit}
            disabled={!agreementChecked || (isMerchant && !(ownerTerms && ownerTermsChecked))}
          >
            Continue
          </Button>
        </View>
      </View>
    </StaticContainer>
  );
}
