import { useAuth } from "@/backend/auth";
import { useProfile } from "@/backend/profile";
import { Button, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { useGlobalContext } from "@/context/global-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import CountryPicker, { DARK_THEME } from "react-native-country-picker-modal";
import {
  ArrowLeftIcon,
  CameraIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSquareIcon,
  PhoneIcon,
  PhotoIcon,
} from "react-native-heroicons/outline";
import OTPTextView from "react-native-otp-textinput";
import * as Progress from "react-native-progress";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

interface PersonalDetailsSheetProps {
  bottomSheetModalRef: React.RefObject<any>;
  isDarkMode: boolean;
}

const PersonalDetailsSheet: React.FC<PersonalDetailsSheetProps> = ({
  bottomSheetModalRef,
  isDarkMode,
}) => {
  const { theme } = useGlobalContext();
  const { sendOTP } = useAuth();
  const isDark = theme === "dark";

  const [details, setDetails] = useState({
    profilePic: "https://via.placeholder.com/150",
    fullName: "Garvit Babel",
    email: "garvit.babel200@gmail.com",
    phone: "9999999999",
    password: "*******",
  });
  const [nameId, setNameId] = useState("");

  const { getMyDetails, updateMyProfileImage, updateMyDetails, loading } =
    useProfile();

  const fetchDetails = async () => {
    const details = await getMyDetails();
    // setDetails(details);

    setNameId(details.username);
    setDetails({
      profilePic: details.image
        ? details.image.image_url
        : "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Default_pfp.svg/2048px-Default_pfp.svg.png",
      fullName: details.first_name + " " + details.last_name,
      email: details.email,
      phone: details.phone,
      password: "*******",
    });
    setUpdatedName(details.first_name + " " + details.last_name);
    setUpdatedEmail(details.email);
    setUpdatedPhone(details.phone);
    setUpdatedPassword("*******");
  };

  useEffect(() => {
    fetchDetails();
  }, []);

  const [updatedName, setUpdatedName] = useState(details.fullName);
  const [updatedEmail, setUpdatedEmail] = useState(details.email);
  const [updatedPhone, setUpdatedPhone] = useState(details.phone);
  const [updatedPassword, setUpdatedPassword] = useState(details.password);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassoword, setShowNewPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [country, setCountry] = useState<any>({
    cca2: "IN",
    callingCode: "91",
    flag: "🇮🇳",
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const editNameModalRef = useRef<any>(null);
  const editEmailModalRef = useRef<any>(null);
  const editPhoneModalRef = useRef<any>(null);
  const editPasswordModalRef = useRef<any>(null);
  const profileImageSheetRef = useRef<any>(null);

  const validatePassword = (password: string) => {
    const errors: string[] = [];
    if (password.length < 8)
      errors.push("Password must be at least 8 characters.");
    if (!/[!@#$%^&*]/.test(password))
      errors.push("Password must include at least 1 special character.");
    if (!/[0-9]/.test(password))
      errors.push("Password must include at least 1 number.");
    setPasswordErrors(errors);
  };

  const handleNewPasswordChange = (password: string) => {
    setNewPassword(password);
    validatePassword(password);
  };

  const allValid = Object.values(validatePassword).every(Boolean);

  const openEditNameModal = () => editNameModalRef.current?.present();
  const openEditEmailModal = () => editEmailModalRef.current?.present();
  const openEditPhoneModal = () => editPhoneModalRef.current?.present();
  const openEditPasswordModal = () => editPasswordModalRef.current?.present();
  const openProfileImageSheet = () => profileImageSheetRef.current?.present();

  // const handleSaveName = () => {
  //   setDetails((prevDetails) => ({ ...prevDetails, fullName: updatedName }));
  //   editNameModalRef.current?.close();
  // };
  // Inside your component
  const handleSaveName = async () => {
    try {
      const [first_name, ...lastNameParts] = updatedName.split(" ");
      const last_name = lastNameParts.join(" ");

      const updatedDetails = await updateMyDetails(nameId, {
        first_name,
        last_name,
      });

      setDetails((prevDetails) => ({ ...prevDetails, fullName: updatedName }));

      console.log("Name updated successfully!");
      editNameModalRef.current?.close();
    } catch (error) {
      console.error("Error saving name:", error);
    }
  };

  const handleSaveEmail = () => {
    setDetails((prevDetails) => ({ ...prevDetails, email: updatedEmail }));
    editEmailModalRef.current?.close();
  };

  const handleSavePhone = () => {
    setDetails((prevDetails) => ({ ...prevDetails, phone: updatedPhone }));
    editPhoneModalRef.current?.close();
    setIsMobileOtpSent(false);
  };

  const handleSavePassword = () => {
    if (allValid) {
      setDetails((prevDetails) => ({
        ...prevDetails,
        password: updatedPassword,
      }));
      editPasswordModalRef.current?.close();
    } else {
      console.log("Password does not meet the requirements.");
    }
  };

  const [verificationCode, setVerificationCode] = useState("");
  const [mobileOtpVerificationCode, setMobileOtpVerificationCode] =
    useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isMobileOtpSent, setIsMobileOtpSent] = useState(false);
  const [isIncorrect, setIsIncorrect] = useState(false);

  const handleSendOtp = async () => {
    if (updatedEmail) {
      setIsOtpSent(true);
      console.log("OTP sent to:", updatedEmail);
      // await sendOTP(updatedEmail);
    }
  };

  const handleSendOtpToMobile = () => {
    if (updatedPhone) {
      setIsMobileOtpSent(true);
      console.log("OTP sent to:", updatedPhone);
    }
  };

  // const handleSubmitOtp = () => {
  //   if (verificationCode.length === 6) {
  //     if (verificationCode !== "111111") {
  //       setIsIncorrect(true);
  //       return;
  //     }
  //     setDetails((prevDetails) => ({
  //       ...prevDetails,
  //       email: updatedEmail,
  //     }));
  //     editEmailModalRef.current?.close();
  //     console.log("Verified and email updated to:", updatedEmail);
  //     setIsOtpSent(false);
  //   }
  // };
  const handleSubmitOtp = async () => {
    if (verificationCode.length === 6) {
      if (verificationCode !== "111111") {
        setIsIncorrect(true);
        return;
      }

      try {
        // Call the API to update the email
        await updateMyDetails(nameId, { email: updatedEmail });

        // Update local state with the new email
        setDetails((prevDetails) => ({
          ...prevDetails,
          email: updatedEmail,
        }));

        // Close the modal and reset OTP state
        editEmailModalRef.current?.close();
        setIsOtpSent(false);
        console.log("Verified and email updated to:", updatedEmail);
      } catch (error) {
        console.error("Error updating email:", error);
        alert("Failed to update email. Please try again.");
      }
    }
  };

  // const handleSubmitOtpForMobile = () => {
  //   if (mobileOtpVerificationCode.length === 6) {
  //     if (mobileOtpVerificationCode !== "111111") {
  //       setIsIncorrect(true);
  //       return;
  //     }
  //     setDetails((prevDetails) => ({
  //       ...prevDetails,
  //       phone: updatedPhone,
  //     }));
  //     editPhoneModalRef.current?.close();
  //     console.log("Verified and email updated to:", updatedPhone);
  //     setIsMobileOtpSent(false);
  //   }
  // };
  const handleSubmitOtpForMobile = async () => {
    if (mobileOtpVerificationCode.length === 6) {
      if (mobileOtpVerificationCode !== "111111") {
        setIsIncorrect(true);
        return;
      }

      try {
        await updateMyDetails(nameId, {
          phone: "+" + country.callingCode + "-" + updatedPhone,
        });

        setDetails((prevDetails) => ({
          ...prevDetails,
          phone: "+" + country.callingCode + "-" + updatedPhone,
        }));

        editPhoneModalRef.current?.close();
        setIsMobileOtpSent(false);
        console.log(
          "Verified and phone updated to:",
          "+" + country.callingCode + "-" + updatedPhone
        );
      } catch (error) {
        console.error("Error updating phone number:", error);
      }
    }
  };

  const styles = StyleSheet.create({
    emailInput: {
      backgroundColor: theme === "dark" ? "#333" : "#fff",
      color: theme === "dark" ? "#fff" : "#000",
      padding: wp("3%"),
      borderWidth: 1,
      borderRadius: 10,
      marginVertical: wp("4%"),
      borderColor: theme === "dark" ? "#555" : "#ccc",
    },
    otpInputContainer: {
      marginHorizontal: -5,
    },
    otpInput: {
      backgroundColor: theme === "dark" ? "#0F0F0F" : "#FFF",
      borderRadius: 10,
      borderWidth: 3,
      color: theme === "dark" ? "white" : "black",
    },
    input: {
      fontSize: wp("4%"),
      borderColor: "#292929",
      borderWidth: 1,
      padding: wp("2.5%"),
      marginVertical: wp("3%"),
      borderRadius: 15,
    },
    saveButton: {
      backgroundColor: "#635BE8",
      padding: wp("3.5%"),
      alignItems: "center",
      borderRadius: 12,
    },
    textInputContainer: {
      marginHorizontal: -5,
    },
    roundedTextInput: {
      backgroundColor: theme === "dark" ? "#0F0F0F" : "#FFF",
      borderRadius: 10,
      borderWidth: 3,
      color: theme === "dark" ? "white" : "black",
      width: wp(12.5),
    },
  });
  const handleProfileUpdate = async () => {
    console.log(selectedImage);
    if (selectedImage) {
      try {
        await updateMyProfileImage(nameId, selectedImage);
        console.log("Profile image updated successfully!");
        setSelectedImage(null);
        profileImageSheetRef.current?.close();
      } catch (error) {
        console.error("Error updating profile image:", error);
      }
    } else {
      console.log("Please select an image before updating your profile.");
    }
  };

  // IMAGE
  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Sorry, we need media library permissions to make this work!");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newImageUris = result.assets.map((asset) => asset.uri);
      setSelectedImage(newImageUris[0]);
      // await updateMyProfileImage(nameId, newImageUris[0]);
    }
    profileImageSheetRef.current?.close();
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      alert("Sorry, we need camera permissions to make this work!");
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
      // await updateMyProfileImage(nameId, result.assets[0].uri);
    }
    // setBottomSheetVisible(false);
    profileImageSheetRef.current?.close();
  };

  return (
    <>
      <CustomBottomSheetModal
        ref={bottomSheetModalRef}
        snapPoints={["90%"]}
        isDark={isDarkMode}
      >
        <View className="flex items-center my-4">
          <Text
            fontSize="text-xl"
            fontWeight="font-bold"
          >
            Personal Details
          </Text>
        </View>

        <View
          style={{ paddingVertical: wp("5%") }}
          className={`flex-row justify-between items-center border-b-[1px] ${
            isDark ? "border-[#292929]" : "border-[#e6e6e6]"
          } p-4`}
        >
          <View className="flex-row gap-3 items-center justify-center">
            <View>
              <Image
                source={{ uri: selectedImage || details.profilePic }}
                style={{ width: wp("12%"), height: wp("12%") }}
                className="rounded-full"
              />
            </View>
            <View>
              <Text
                fontSize="text-md"
                fontWeight="font-bold"
              >
                Profile picture
              </Text>
            </View>
          </View>
          {!selectedImage && (
            <TouchableOpacity onPress={openProfileImageSheet}>
              <Text
                fontSize="text-md"
                fontWeight="font-bold"
                className="text-[#635BE8]"
              >
                Upload
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Full Name */}
        <View className="p-4">
          <View
            style={{ paddingVertical: wp("5%") }}
            className="flex-row justify-between items-center "
          >
            <View className="flex-row gap-3 items-center justify-center">
              <View>
                <Text fontWeight="font-bold">Full name</Text>
                <Text
                  fontSize="text-base"
                  className="pt-2"
                >
                  {details.fullName}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={openEditNameModal}>
              <PencilSquareIcon
                size={24}
                color="#635BE8"
              />
            </TouchableOpacity>
          </View>

          {/* Email Address */}
          <View
            style={{ paddingVertical: wp("5%") }}
            className="flex-row justify-between items-center "
          >
            <View className="flex-row gap-3 items-center justify-center">
              <View>
                <Text fontWeight="font-bold">Email address</Text>
                <Text
                  fontSize="text-base"
                  className="pt-2"
                >
                  {details.email}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={openEditEmailModal}>
              <PencilSquareIcon
                size={24}
                color="#635BE8"
              />
            </TouchableOpacity>
          </View>

          {/* Phone Number */}
          <View
            style={{ paddingVertical: wp("5%") }}
            className="flex-row justify-between items-center "
          >
            <View className="flex-row gap-3 items-center justify-center">
              <View>
                <Text fontWeight="font-bold">Phone number</Text>
                <Text
                  fontSize="text-base"
                  className="pt-2"
                >
                  {details.phone}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={openEditPhoneModal}>
              <PencilSquareIcon
                size={24}
                color="#635BE8"
              />
            </TouchableOpacity>
          </View>

          {/* Password */}
          <View
            style={{ paddingVertical: wp("5%") }}
            className="flex-row justify-between items-center "
          >
            <View className="flex-row gap-3 items-center justify-center">
              <View>
                <Text fontWeight="font-bold">Password</Text>
                <Text
                  fontSize="text-base"
                  className="pt-2"
                >
                  {details.password}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={openEditPasswordModal}>
              <PencilSquareIcon
                size={24}
                color="#635BE8"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-5">
          {selectedImage && (
            <TouchableOpacity
              onPress={handleProfileUpdate}
              style={[styles.saveButton, { marginTop: hp(5) }]}
            >
              {loading ? (
                <Progress.CircleSnail
                  color={"white"}
                  size={22}
                />
              ) : (
                <Text
                  className="text-white"
                  fontSize="text-sm"
                  fontWeight="font-bold"
                >
                  Update Profile Picture
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </CustomBottomSheetModal>

      {/* Profile Picture Sheet */}
      <CustomBottomSheetModal
        snapPoints={["40%"]}
        ref={profileImageSheetRef}
        isDark={isDark}
      >
        <View className="w-full px-5 py-2 flex flex-col justify-start flex-1">
          <View className="py-4 flex-row items-center justify-between gap-x-5">
            <TouchableOpacity
              onPress={pickImageFromGallery}
              className=" flex-1 space-y-4"
              style={{
                borderStyle: "dashed",
                borderColor: "#C4C4C4",
                borderWidth: 1,
                height: hp("20%"),
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PhotoIcon
                size={24}
                color={isDark ? "#e6e6e6" : "#292929"}
              />
              <Text
                className={`${
                  isDark ? "text-white/70" : "text-black/70"
                } text-center`}
              >
                Choose from gallery
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={takePhoto}
              className="space-y-4 flex-1"
              style={{
                borderStyle: "dashed",
                borderColor: "#C4C4C4",
                borderWidth: 1,
                height: hp("20%"),
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CameraIcon
                size={24}
                color={isDark ? "#e6e6e6" : "#292929"}
              />
              <Text
                className={`${
                  isDark ? "text-white/70" : "text-black/70"
                } text-center`}
              >
                Take a photo
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </CustomBottomSheetModal>

      {/* Full Name Modal */}
      <CustomBottomSheetModal
        ref={editNameModalRef}
        snapPoints={["50%"]}
        isDark={isDarkMode}
      >
        <View
          className="flex-row items-center justify-between px-6"
          style={{ paddingVertical: wp("5%") }}
        >
          <TouchableOpacity
            className="items-start"
            onPress={() => {
              editNameModalRef.current?.close();
            }}
          >
            <ArrowLeftIcon
              size={26}
              color={isDarkMode ? "#FFFFFFB2" : "#000000B2"}
            />
          </TouchableOpacity>

          <View
            className="items-center justify-center"
            style={{ left: 0, right: 0, top: 0, bottom: 0 }}
          >
            <Text
              fontSize="text-xl"
              fontWeight="font-bold"
            >
              Full Name
            </Text>
          </View>

          <View></View>
        </View>
        <View className="p-4 gap-4">
          <TextInput
            className={`rounded-[12px] border p-3 ${
              isDark
                ? "border-[#292929] text-white"
                : "border-[#e6e6e6] text-black"
            }`}
            placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
            value={updatedName}
            onChangeText={setUpdatedName}
            placeholder="Enter your full name"
          />
          <TouchableOpacity
            onPress={handleSaveName}
            style={styles.saveButton}
          >
            {loading ? (
              <Progress.CircleSnail
                color={"white"}
                size={22}
              />
            ) : (
              <Text
                className="text-white"
                fontSize="text-sm"
                fontWeight="font-bold"
              >
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </CustomBottomSheetModal>

      {/* Email Modal */}
      <CustomBottomSheetModal
        ref={editEmailModalRef}
        snapPoints={["50%"]}
        isDark={isDarkMode}
      >
        <View
          className="flex-row items-center justify-between relative px-6"
          style={{ paddingVertical: wp("5%") }}
        >
          <TouchableOpacity
            className="items-start"
            onPress={() => {
              editEmailModalRef.current?.close();
            }}
          >
            <ArrowLeftIcon
              size={26}
              color={isDarkMode ? "#FFFFFFB2" : "#000000B2"}
            />
          </TouchableOpacity>
          <View
            className="items-center justify-center"
            style={{ left: 0, right: 0, top: 0, bottom: 0 }}
          >
            <Text
              fontSize="text-xl"
              fontWeight="font-bold"
            >
              Edit Email Address
            </Text>
          </View>

          <View></View>
        </View>

        <View className="p-4 gap-4">
          {!isOtpSent ? (
            <>
              <TextInput
                className={`rounded-lg border p-3 ${
                  isDark
                    ? "border-[#292929] text-white"
                    : "border-[#e6e6e6] text-black"
                }`}
                placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
                value={updatedEmail}
                onChangeText={setUpdatedEmail}
                editable={!loading}
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                placeholder="Enter your new email"
                keyboardType="email-address"
              />

              <TouchableOpacity
                onPress={handleSendOtp}
                style={styles.saveButton}
              >
                <Text
                  fontSize="text-sm"
                  fontWeight="font-bold"
                  className="text-white"
                >
                  Verify
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text
                fontSize="text-base"
                fontWeight="font-bold"
                className="mt-6"
              >
                Enter verification code
              </Text>
              <View className="w-[90%] ">
                <OTPTextView
                  containerStyle={styles.textInputContainer}
                  textInputStyle={styles.roundedTextInput}
                  // @ts-ignore
                  placeholder="*"
                  placeholderTextColor={
                    theme === "dark" ? "#ffffff80" : "#00000080"
                  }
                  inputCount={6}
                  inputCellLength={1}
                  tintColor="#635BE8"
                  offTintColor={theme === "dark" ? "#292929" : "#e6e6e6"}
                  keyboardType="number-pad"
                  autoFocus
                  handleTextChange={setVerificationCode}
                />
              </View>

              {isIncorrect && (
                <View className="flex mt-2 flex-row items-center space-x-2">
                  <Text
                    fontSize="text-sm"
                    fontWeight="font-bold"
                    className="text-red-500"
                  >
                    Wrong OTP. Try again
                  </Text>
                </View>
              )}

              <View className=" flex-row gap-x-3 ">
                <View className="flex-1">
                  <Button variant="outline">
                    <Text
                      fontSize="text-sm"
                      fontWeight="font-bold"
                      // className="text-white"
                    >
                      Resend OTP
                    </Text>
                  </Button>
                </View>
                <View className="flex-1">
                  <Button onPress={handleSubmitOtp}>
                    <Text
                      fontSize="text-sm"
                      fontWeight="font-bold"
                      className="text-white"
                    >
                      Done
                    </Text>
                  </Button>
                </View>
              </View>
            </>
          )}
        </View>
      </CustomBottomSheetModal>

      {/* Phone Modal */}
      <CustomBottomSheetModal
        ref={editPhoneModalRef}
        snapPoints={["50%"]}
        isDark={isDarkMode}
      >
        <View
          className="flex-row items-center justify-between px-6"
          style={{ paddingVertical: wp("5%") }}
        >
          <TouchableOpacity
            className="items-start"
            onPress={() => editPhoneModalRef.current?.close()}
          >
            <ArrowLeftIcon
              size={26}
              color={isDarkMode ? "#FFFFFFB2" : "#000000B2"}
            />
          </TouchableOpacity>
          <View
            className="items-center justify-center"
            style={{ left: 0, right: 0, top: 0, bottom: 0 }}
          >
            <Text
              fontSize="text-xl"
              fontWeight="font-bold"
            >
              Edit Phone Number
            </Text>
          </View>

          <View></View>
        </View>

        <View className="p-4 gap-4  flex-1">
          {!isMobileOtpSent ? (
            <>
              <View className="flex-row gap-x-2 ">
                <View
                  className={` rounded-[12px] flex-[0.5] border h-12  flex-row items-center justify-center ${
                    isDark
                      ? "border-[#292929] text-white"
                      : "border-[#e6e6e6] text-black"
                  }`}
                >
                  <CountryPicker
                    {...(isDark && { theme: DARK_THEME })}
                    withFlag
                    withCallingCode
                    withFilter
                    withCallingCodeButton
                    countryCode={country.cca2}
                    onSelect={(country) => {
                      setCountry({
                        cca2: country.cca2,
                        callingCode: country.callingCode[0],
                        flag: country.flag,
                      });
                    }}
                  />
                  <View className="ml-2 ">
                    <ChevronDownIcon
                      size={16}
                      color={isDark ? "#ffffff" : "#000"}
                      className="mt-1"
                    />
                  </View>
                </View>

                <View
                  className={`flex-row items-center rounded-[12px] flex-1 border px-3 h-12 ${
                    isDark
                      ? "border-[#292929] text-white"
                      : "border-[#e6e6e6] text-black"
                  }`}
                >
                  <View className="pr-2 items-center justify-center">
                    <PhoneIcon
                      size={20}
                      color={isDark ? "#ffffff" : "#000"}
                      className="mt-1"
                    />
                  </View>
                  <View>
                    <TextInput
                      maxLength={10}
                      placeholder="Enter phone number"
                      value={updatedPhone}
                      onChangeText={setUpdatedPhone}
                      keyboardType="number-pad"
                      placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
                      className={`flex-1 h-12 p-3  ${
                        isDark ? "text-white" : "text-black"
                      }`}
                    />
                  </View>
                </View>
              </View>
              <Button onPress={handleSendOtpToMobile}>
                <Text
                  fontSize="text-sm"
                  fontWeight="font-bold"
                  className="text-white"
                >
                  Verify
                </Text>
              </Button>
            </>
          ) : (
            <>
              <Text
                fontSize="text-base"
                fontWeight="font-bold"
                className="mt-6"
              >
                Enter verification code
              </Text>
              <View className="w-[90%] self-center">
                <OTPTextView
                  containerStyle={styles.textInputContainer}
                  textInputStyle={styles.roundedTextInput}
                  // @ts-ignore
                  placeholder="*"
                  placeholderTextColor={
                    theme === "dark" ? "#ffffff80" : "#00000080"
                  }
                  inputCount={6}
                  inputCellLength={1}
                  tintColor="#635BE8"
                  offTintColor={theme === "dark" ? "#292929" : "#e6e6e6"}
                  keyboardType="number-pad"
                  autoFocus
                  handleTextChange={setMobileOtpVerificationCode}
                />
              </View>

              {isIncorrect && (
                <View className="flex mt-2 flex-row items-center space-x-2">
                  <Text
                    fontSize="text-sm"
                    fontWeight="font-bold"
                    className="text-red-500"
                  >
                    Wrong OTP. Try again
                  </Text>
                </View>
              )}

              <View className=" flex-row gap-x-3 ">
                <View className="flex-1">
                  <Button variant="outline">
                    <Text
                      fontSize="text-sm"
                      fontWeight="font-bold"
                    >
                      Resend OTP
                    </Text>
                  </Button>
                </View>
                <View className="flex-1">
                  <Button onPress={handleSubmitOtpForMobile}>
                    <Text
                      fontSize="text-sm"
                      fontWeight="font-bold"
                      className="text-white"
                    >
                      Done
                    </Text>
                  </Button>
                </View>
              </View>
            </>
          )}

          {/* <TouchableOpacity onPress={handleSavePhone} style={styles.saveButton}>
            <Text
              fontSize="text-base"
              fontWeight="font-bold"
              className="text-white"
            >
              Save
            </Text>
          </TouchableOpacity> */}
        </View>
      </CustomBottomSheetModal>

      {/* Password Modal */}
      <CustomBottomSheetModal
        ref={editPasswordModalRef}
        snapPoints={["70%"]}
        isDark={isDarkMode}
      >
        <View
          className="flex-row items-center justify-between px-6"
          style={{ paddingVertical: wp("5%") }}
        >
          <TouchableOpacity
            className="items-start"
            onPress={() => editPasswordModalRef.current?.close()}
          >
            <ArrowLeftIcon
              size={26}
              color={isDarkMode ? "#FFFFFFB2" : "#000000B2"}
            />
          </TouchableOpacity>
          <View className="items-center justify-center ">
            <Text
              fontSize="text-xl"
              fontWeight="font-bold"
            >
              Edit Password
            </Text>
          </View>

          <View></View>
        </View>

        <View className="p-4 gap-4">
          <Text
            fontSize="text-base"
            fontWeight="font-bold"
          >
            Current Password
          </Text>
          <View
            className={`flex flex-row items-center border mt-2 rounded-lg p-2 h-12  ${
              isDark
                ? "border-[#292929] text-white"
                : "border-[#e6e6e6] text-black"
            }`}
          >
            <TextInput
              className="flex-1"
              secureTextEntry={!showPassword}
              value={updatedPassword}
              onChangeText={setUpdatedPassword}
              placeholder="Enter your current password"
              placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
              style={{ color: isDarkMode ? "#FFF" : "#000" }}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <EyeSlashIcon
                  size={22}
                  color={isDarkMode ? "#FFF" : "#000"}
                />
              ) : (
                <EyeIcon
                  size={22}
                  color={isDarkMode ? "#FFF" : "#000"}
                />
              )}
            </TouchableOpacity>
          </View>

          <Text
            fontSize="text-base"
            fontWeight="font-bold"
          >
            New Password
          </Text>
          <View
            className={`flex flex-row items-center border mt-2 rounded-lg p-2 h-12  ${
              isDark
                ? "border-[#292929] text-white"
                : "border-[#e6e6e6] text-black"
            }`}
          >
            <TextInput
              className="flex-1"
              secureTextEntry={!showNewPassoword}
              value={newPassword}
              onChangeText={handleNewPasswordChange}
              placeholder="Enter your new password"
              style={{ color: isDarkMode ? "#fff" : "#000" }}
              placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
            />
            <TouchableOpacity
              onPress={() => setShowNewPassword(!showNewPassoword)}
            >
              {showNewPassoword ? (
                <EyeSlashIcon
                  size={22}
                  color={isDarkMode ? "#FFF" : "#000"}
                />
              ) : (
                <EyeIcon
                  size={22}
                  color={isDarkMode ? "#FFF" : "#000"}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Display password validation errors */}
          {passwordErrors.length > 0 && (
            <View className="mt-2">
              <Text
                fontSize="text-xs"
                fontWeight="font-bold"
                style={{ color: "red" }}
              >
                Your password must include:
              </Text>
              {passwordErrors.map((error, index) => (
                <Text
                  key={index}
                  fontSize="text-xs"
                  fontWeight="font-bold"
                  style={{ color: "red" }}
                >
                  {error}
                </Text>
              ))}
            </View>
          )}

          <View className="py-3">
            <TouchableOpacity
              onPress={handleSavePassword}
              style={{
                backgroundColor: "#635BE8",
                padding: wp("3.5%"),
                alignItems: "center",
                borderRadius: 12,
              }}
            >
              <Text
                fontSize="text-sm"
                fontWeight="font-bold"
                style={{ color: "white" }}
              >
                Verify & Change
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </CustomBottomSheetModal>
    </>
  );
};
export default PersonalDetailsSheet;
