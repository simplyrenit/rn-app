import { HeaderIndicator } from "@/components/auth/headerIndicator";
import { Button, StaticContainer, Text } from "@/components/core";
import { ScrollContainer } from "@/components/core/scroll-container";
import { useAuthContext } from "@/context/auth-context";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import React, { useCallback, useEffect, useState } from "react";
import { Modal, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import {
  CheckIcon,
  InformationCircleIcon,
  ChevronDownIcon,
} from "react-native-heroicons/outline";
import { CheckBox } from "@/components/core/checkbox";

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
        className={`p-3 border rounded-xl ${isDarkMode
          ? "bg-[#0F0F0F] border-[#292929]"
          : "bg-white border-[#e6e6e6]"
          }`}
      >
        <View className="flex-row justify-between items-center">
          <Text className={isDarkMode ? "text-white" : "text-black"}>
            {value || placeholder}
          </Text>
          <ChevronDownIcon
            color={isDarkMode ? "#fff" : "#000"}
            size={20}
          />
        </View>
      </TouchableOpacity>

      {isOpen && (
        <Modal visible={isOpen} transparent onDismiss={() => setIsOpen(false)} onRequestClose={() => setIsOpen(false)}>
          <View style={{ height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 }} /* onTouchEnd={() => setIsOpen(false)} */>

            <View style={{ backgroundColor: isDarkMode ? "#121212" : "#fff", width: '100%' }}>

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
                      borderColor: isDarkMode ? "#292929" : "#e6e6e6",
                      borderBottomRightRadius: index === options.length - 1 ? 8 : 0,
                      borderBottomLeftRadius: index === options.length - 1 ? 8 : 0,
                    }}
                    className={`p-4 border-b ${isDarkMode ? "border-[#292929]" : "border-[#e6e6e6]"
                      } ${value === option ? "bg-brand-blue/10" : ""}`}
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
  accountType: string;
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
        className={`p-3 border rounded-[12px] h-12 ${isDarkMode
          ? "bg-[#0F0F0F] text-white border-[#292929]"
          : "bg-white text-black border-[#e6e6e6]"
          }`}
        placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
      />
      {errors.firstName && (
        <View className="flex flex-row items-center mt-4 space-x-3">
          <InformationCircleIcon
            size={14}
            color="#ef4444"
          />
          <Text className="text-red-500">{errors.firstName}</Text>
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
         className={`p-3 border rounded-[12px] h-12 ${isDarkMode
                  ? "bg-[#0F0F0F] text-white border-[#292929]"
                  : "bg-white text-black border-[#e6e6e6]"
                  }`}

        placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
      />
      {errors.lastName && (
        <View className="flex flex-row items-center mt-4 space-x-3">
          <InformationCircleIcon
            size={14}
            color="#ef4444"
          />
          <Text className="text-red-500">{errors.lastName}</Text>
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
           className={`p-3 border rounded-[12px] h-12 `}
          isDarkMode={isDarkMode}
          setDobError={setDobError}
        />
        <Dropdown
          value={dob.month}
          placeholder="Month"
          options={MONTHS}
          onSelect={(value) => setDob((prev) => ({ ...prev, month: value }))}
           className={`p-3 border rounded-[12px] h-12 `}
          isDarkMode={isDarkMode}
          setDobError={setDobError}
        />
        <Dropdown
          value={dob.year}
          placeholder="Year"
          options={YEARS}
          onSelect={(value) => { setDob((prev) => ({ ...prev, year: value })) }}
           className={`p-3 border rounded-[12px] h-12 `}
          isDarkMode={isDarkMode}
          setDobError={setDobError}
        />
      </View>
      {dobError && (
        <View className="flex flex-row items-center mt-2 mr-2 space-x-3" style={{ bottom: 0, left: 0, right: 0 }}>
          <InformationCircleIcon
            size={14}
            color={dobError.includes("not allowed") ? "#ef4444" : "#f59e0b"}
          />
          <Text
            className={
              dobError.includes("not allowed")
                ? "text-red-500 flex-wrap"
                : "text-amber-500 flex-wrap"
            }
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
         className={`p-3 border rounded-[12px] h-12 ${isDarkMode
                          ? "bg-[#0F0F0F] text-white border-[#292929]"
                          : "bg-white text-black border-[#e6e6e6]"
                          }`}

        placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
      />
      {errors.businessName && (
        <View className="flex flex-row items-center mt-4 space-x-3">
          <InformationCircleIcon
            size={14}
            color="#ef4444"
          />
          <Text className="text-red-500">{errors.businessName}</Text>
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
        className={`p-3 border rounded-[12px] h-12 ${isDarkMode
                         ? "bg-[#0F0F0F] text-white border-[#292929]"
                         : "bg-white text-black border-[#e6e6e6]"
                         }`}
        placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
      />
      {errors.firstName && (
        <View className="flex flex-row items-center mt-4 space-x-3">
          <InformationCircleIcon
            size={14}
            color="#ef4444"
          />
          <Text className="text-red-500">{errors.firstName}</Text>
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
         className={`p-3 border rounded-[12px] h-12 ${isDarkMode
                          ? "bg-[#0F0F0F] text-white border-[#292929]"
                          : "bg-white text-black border-[#e6e6e6]"
                          }`}
        placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
      />
      {errors.lastName && (
        <View className="flex flex-row items-center mt-4 space-x-3">
          <InformationCircleIcon
            size={14}
            color="#ef4444"
          />
          <Text className="text-red-500">{errors.lastName}</Text>
        </View>
      )}
    </View>
  </>
);

export default function AboutYourself() {
  const router = useTypedNavigation();
  const [accountType, setAccountType] = useState<
    "Individual" | "Business" | null
  >(null);
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
    accountType: "",
  });
  const [dobError, setDobError] = useState("");
  const [agreementChecked, setAgreementChecked] = useState(false);

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
      accountType: "",
    };

    if (accountType === null) {
      newErrors.accountType =
        "Please tell us if you're an Individual or a Business";
      isValid = false;
    }

    if (accountType === "Individual" || accountType === "Business") {
      if (firstName.trim() === "") {
        newErrors.firstName = "First name is required";
        isValid = false;
      }
      if (lastName.trim() === "") {
        newErrors.lastName = "Last name is required";
        isValid = false;
      }
    }

    if (accountType === "Business") {
      if (businessName.trim() === "") {
        newErrors.businessName = "Business name is required";
        isValid = false;
      }
    }

    if (accountType === "Individual") {
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
  }, [accountType, firstName, lastName, businessName, dob, calculateAge]);

  useEffect(() => {
    if (accountType === 'Individual') {
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
    }
  }, [dob])

  const handleSubmit = useCallback(() => {
    if (validateForm()) {

      saveUser({
        first_name: firstName,
        last_name: lastName,
        ...(businessName.trim() !== "" && { business_name: businessName }),
      });
      router.navigate("Password");
    }
  }, [accountType, firstName, lastName, businessName, validateForm]);

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
                className={`${isDarkMode ? "text-[#FFFFFFB2]" : "text-[#000000b2]"
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
                  I am...
                </Text>
                <View className="flex-row justify-between mt-2">
                  <TouchableOpacity
                    className={`flex-1 mr-2 p-3 rounded-[12px] h-12 border ${accountType === "Individual"
                      ? "border-brand-blue"
                      : isDarkMode
                        ? "border-[#292929]"
                        : "border-[#e6e6e6]"
                      } ${isDarkMode ? "bg-[#0F0F0F]" : "bg-white"}`}
                    onPress={() => {
                      setAccountType("Individual");
                      if (errors.accountType) {
                        setErrors((prevErrors) => ({
                          ...prevErrors,
                          accountType: "",
                        }));
                      }
                    }}
                  >
                    <View className="flex-row flex-1 justify-between items-center">
                      <Text
                        fontSize="text-sm"
                        className={isDarkMode ? "text-white" : "text-black"}
                      >
                        Individual
                      </Text>
                      {accountType === "Individual" && (
                        <CheckIcon
                          color="#635BE8"
                          size={24}
                        />
                      )}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className={`flex-1 ml-2 p-3 rounded-[12px] h-12 border justify-center ${accountType === "Business"
                      ? "border-brand-blue"
                      : isDarkMode
                        ? "border-[#292929]"
                        : "border-[#e6e6e6]"
                      } ${isDarkMode ? "bg-[#0F0F0F]" : "bg-white"}`}
                    onPress={() => {
                      setAccountType("Business");
                      if (errors.accountType) {
                        setErrors((prevErrors) => ({
                          ...prevErrors,
                          accountType: "",
                        }));
                      }
                    }}
                  >
                    <View className="flex-row justify-between items-center">
                      <Text
                        fontSize="text-sm"
                        className={isDarkMode ? "text-white" : "text-black"}
                      >
                        Business
                      </Text>
                      {accountType === "Business" && (
                        <CheckIcon
                          color="#635BE8"
                          size={24}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {errors.accountType && (
              <View className="flex flex-row items-center mt-4 space-x-3">
                <InformationCircleIcon
                  size={14}
                  color="#ef4444"
                />
                <Text className="text-red-500">{errors.accountType}</Text>
              </View>
            )}

            {accountType === "Individual" && (
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

            {accountType === "Business" && (
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
                  color="#ef4444"
                />
                <Text className="text-red-500">{errors.sameName}</Text>
              </View>
            )}
          </View>
        </ScrollContainer>

        <View className="py-5">
          <View className="flex-row items-center mb-4">
            <CheckBox
              checked={agreementChecked}
              onPress={() => setAgreementChecked(!agreementChecked)}
            />
            <Text
              className={`ml-2 ${isDarkMode ? "text-[#FFFFFFB2]" : "text-[#000000b2]"
                }`}
            >
              I agree to provide accurate and verifiable information
            </Text>
          </View>
          <Button
            variant="primary"
            onPress={handleSubmit}
            disabled={!agreementChecked}
          >
            Continue
          </Button>
        </View>
      </View>
    </StaticContainer>
  );
}
