import { HeaderIndicator } from "@/components/auth/headerIndicator";
import { Button, StaticContainer, Text } from "@/components/core";
import { ScrollContainer } from "@/components/core/scroll-container";
import { useAuthContext } from "@/context/auth-context";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";

import React, { useCallback, useState } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import {
  CheckIcon,
  InformationCircleIcon,
} from "react-native-heroicons/outline";

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
}

export default function AboutYourself() {
  const router = useTypedNavigation();
  const [accountType, setAccountType] = useState<
    "Individual" | "Business" | null
  >(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    ownerName: "",
    businessName: "",
    sameName: "",
    accountType: "",
  });

  const { theme } = useGlobalContext();
  const isDarkMode = theme === "dark";
  const { saveUser } = useAuthContext();

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

    setErrors(newErrors);
    return isValid;
  }, [accountType, firstName, lastName, businessName]);

  const handleSubmit = useCallback(() => {
    if (validateForm()) {
      console.log("Submitting form:", {
        accountType,
        ...(accountType === "Individual"
          ? { firstName, lastName }
          : { firstName, lastName, businessName }),
      });

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
          <View className="flex">
            <Text fontSize="text-2xl" fontWeight="font-bold">
              Tell us about yourself
            </Text>
            <Text
              fontSize="text-base"
              className={`${
                isDarkMode ? "text-[#FFFFFFB2]" : "text-[#000000b2]"
              } mt-1`}
            >
              Spill the beans already
            </Text>
          </View>

          <View>
            <View className="mt-12">
              <Text fontSize="text-sm" fontWeight="font-bold" className="mb-2">
                I am...
              </Text>
              <View className="flex-row justify-between mt-2">
                <TouchableOpacity
                  className={`flex-1 mr-2 p-4 rounded-xl border-2 ${
                    accountType === "Individual"
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
                  <View className="flex-row justify-between items-center">
                    <Text
                      fontSize="text-sm"
                      className={isDarkMode ? "text-white" : "text-black"}
                    >
                      Individual
                    </Text>
                    {accountType === "Individual" && (
                      <CheckIcon color="#635BE8" size={24} />
                    )}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`flex-1 ml-2 p-4 rounded-xl border-2 ${
                    accountType === "Business"
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
                      <CheckIcon color="#635BE8" size={24} />
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {errors.accountType && (
            <View className="flex flex-row items-center mt-4 space-x-3">
              <InformationCircleIcon size={14} color="#ef4444" />
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
              <InformationCircleIcon size={14} color="#ef4444" />
              <Text className="text-red-500">{errors.sameName}</Text>
            </View>
          )}
        </ScrollContainer>

        <View className="py-5">
          <Button variant="primary" onPress={handleSubmit}>
            Continue
          </Button>
        </View>
      </View>
    </StaticContainer>
  );
}

const IndividualForm = ({
  firstName,
  lastName,
  setFirstName,
  setLastName,
  errors,
  isDarkMode,
  setError,
}: IndividualFormProps) => (
  <>
    <View className="mt-4">
      <Text fontSize="text-sm" fontWeight="font-semibold" className="mb-2">
        First name
      </Text>
      <TextInput
        value={firstName}
        // onChangeText={setFirstName}
        onChangeText={(text) => {
          setFirstName(text);
          if (errors.firstName) {
            setError((prevErrors) => ({
              ...prevErrors,
              firstName: "",
            }));
          }
        }}
        className={`p-4 border rounded-lg ${
          isDarkMode
            ? "bg-[#0F0F0F] text-white border-[#292929]"
            : "bg-white text-black border-[#e6e6e6]"
        }`}
        placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
      />
      {errors.firstName && (
        <View className="flex flex-row items-center mt-4 space-x-3">
          <InformationCircleIcon size={14} color="#ef4444" />
          <Text className="text-red-500">{errors.firstName}</Text>
        </View>
      )}
    </View>

    <View className="mt-4">
      <Text fontSize="text-sm" fontWeight="font-semibold" className="mb-2">
        Last name
      </Text>
      <TextInput
        value={lastName}
        // onChangeText={setLastName}
        onChangeText={(text) => {
          setLastName(text);
          if (errors.lastName) {
            setError((prevErrors) => ({
              ...prevErrors,
              lastName: "",
            }));
          }
        }}
        className={`p-4 border rounded-lg ${
          isDarkMode
            ? "bg-[#0F0F0F] text-white border-[#292929]"
            : "bg-white text-black border-[#e6e6e6]"
        }`}
        placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
      />
      {errors.lastName && (
        <View className="flex flex-row items-center mt-4 space-x-3">
          <InformationCircleIcon size={14} color="#ef4444" />
          <Text className="text-red-500">{errors.lastName}</Text>
        </View>
      )}
    </View>
  </>
);

const BusinessForm = ({
  firstName,
  lastName,
  businessName,
  setFirstName,
  setLastName,
  setBusinessName,
  errors,
  isDarkMode,
  setError,
}: BusinessFormProps) => (
  <>
    <View className="mt-4">
      <Text fontSize="text-sm" fontWeight="font-semibold" className="mb-2">
        Owner First name
      </Text>
      <TextInput
        value={firstName}
        onChangeText={(text) => {
          setFirstName(text);
          if (errors.firstName) {
            setError((prevErrors) => ({
              ...prevErrors,
              firstName: "",
            }));
          }
        }}
        className={`p-4 border rounded-lg ${
          isDarkMode
            ? "bg-[#0F0F0F] text-white border-[#292929]"
            : "bg-white text-black border-[#e6e6e6]"
        }`}
        placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
      />
      {errors.firstName && (
        <View className="flex flex-row items-center mt-4 space-x-3">
          <InformationCircleIcon size={14} color="#ef4444" />
          <Text className="text-red-500">{errors.firstName}</Text>
        </View>
      )}
    </View>

    <View className="mt-4">
      <Text fontSize="text-sm" fontWeight="font-semibold" className="mb-2">
        Owner Last name
      </Text>
      <TextInput
        value={lastName}
        onChangeText={(text) => {
          setLastName(text);
          if (errors.lastName) {
            setError((prevErrors) => ({
              ...prevErrors,
              lastName: "",
            }));
          }
        }}
        className={`p-4 border rounded-lg ${
          isDarkMode
            ? "bg-[#0F0F0F] text-white border-[#292929]"
            : "bg-white text-black border-[#e6e6e6]"
        }`}
        placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
      />
      {errors.lastName && (
        <View className="flex flex-row items-center mt-4 space-x-3">
          <InformationCircleIcon size={14} color="#ef4444" />
          <Text className="text-red-500">{errors.lastName}</Text>
        </View>
      )}
    </View>

    <View className="mt-4">
      <Text fontSize="text-sm" fontWeight="font-semibold" className="mb-2">
        Business Name
      </Text>
      <TextInput
        value={businessName}
        onChangeText={(text) => {
          setBusinessName(text);
          if (errors.businessName) {
            setError((prevErrors) => ({
              ...prevErrors,
              businessName: "",
            }));
          }
        }}
        className={`p-4 border rounded-lg ${
          isDarkMode
            ? "bg-[#0F0F0F] text-white border-[#292929]"
            : "bg-white text-black border-[#e6e6e6]"
        }`}
        placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
      />
      {errors.businessName && (
        <View className="flex flex-row items-center mt-4 space-x-3">
          <InformationCircleIcon size={14} color="#ef4444" />
          <Text className="text-red-500">{errors.businessName}</Text>
        </View>
      )}
    </View>
  </>
);
