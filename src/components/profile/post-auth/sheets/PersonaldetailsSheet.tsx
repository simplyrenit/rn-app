
import { useAuth } from "@/backend/auth";
import { useProfile } from "@/backend/profile";
import { Button, IconButton, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { useGlobalContext } from "@/context/global-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import CountryPicker, { DARK_THEME, Flag } from "react-native-country-picker-modal";
import {
  ArrowLeftIcon,
  CameraIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSquareIcon,
  PhoneIcon,
  PhotoIcon,
  TrashIcon,
} from "react-native-heroicons/outline";
import OTPTextView from "react-native-otp-textinput";
import DeleteAccountModal from "./DeleteAccountModal";
import {
  ink,
  colors,
  radius,
  fontSize,
  MIN_TOUCH_TARGET,
  space,
  SCREEN_GUTTER,
} from "@/lib/design-tokens";
import { toast } from "@/lib/toast";

// A fixed-length mask so the field never leaks the real password's length —
// seven asterisks previously meant "this password is seven characters".
const PASSWORD_MASK = "••••••••";

interface PersonalDetailsSheetProps {
  bottomSheetModalRef: React.RefObject<any>;
  isDarkMode: boolean;
}

const PersonalDetailsSheet: React.FC<PersonalDetailsSheetProps> = ({
  bottomSheetModalRef,
  isDarkMode,
}) => {
  const { theme } = useGlobalContext();
  const { sendOTP, requestPhoneNumberChangeOtp, verifyPhoneNumberChange } =
    useAuth();
  const isDark = theme === "dark";
  const { width: winW, height: winH } = useWindowDimensions();
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);

  const [details, setDetails] = useState({
    profilePic: "https://via.placeholder.com/150",
    fullName: "Garvit Babel",
    email: "garvit.babel200@gmail.com",
    phone: "9999999999",
    password: PASSWORD_MASK,
  });
  const [nameId, setNameId] = useState("");

  const { getMyDetails, updateMyProfileImage, updateMyDetails, loading, deleteMyAccount } =
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
      password: PASSWORD_MASK,
    });
    setUpdatedName(details.first_name + " " + details.last_name);
    setUpdatedEmail(details.email);
    setUpdatedPhone(details.phone.slice(-10));
    setUpdatedPassword(PASSWORD_MASK);
  };

  useEffect(() => {
    fetchDetails();
  }, []);

  const [updatedName, setUpdatedName] = useState(details.fullName);
  const [updatedEmail, setUpdatedEmail] = useState(details.email);
  const [updatedPhone, setUpdatedPhone] = useState(details.phone.slice(-10));
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
      // await sendOTP(updatedEmail);
    }
  };

  const [isPhoneOtpLoading, setIsPhoneOtpLoading] = useState(false);
  // A failed send only fired a toast, which renders behind this bottom sheet and
  // so was invisible — the button looked dead. Surface it inline instead.
  const [phoneOtpError, setPhoneOtpError] = useState("");

  // Firebase phone auth wants E.164; callingCode lands here without the "+".
  const fullPhone = `+${country.callingCode}${updatedPhone}`;

  const handleSendOtpToMobile = async () => {
    if (!updatedPhone) {
      return;
    }
    setPhoneOtpError("");
    setIsIncorrect(false);
    setIsPhoneOtpLoading(true);
    try {
      await requestPhoneNumberChangeOtp(fullPhone);
      setIsMobileOtpSent(true);
    } catch (error: any) {
      const message =
        error?.message ||
        "Unable to send the code right now. Please try again.";
      setPhoneOtpError(message);
      toast.error(message);
    } finally {
      setIsPhoneOtpLoading(false);
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
      } catch (error) {
        console.error("Error updating email:", error);
        toast.error("Could not update your email. Please try again.");
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
    if (mobileOtpVerificationCode.length !== 6) {
      return;
    }

    setIsIncorrect(false);
    try {
      // Throws on a wrong/expired code. Runs on an isolated Firebase app, so it
      // does not touch the login/chat session.
      await verifyPhoneNumberChange(mobileOtpVerificationCode);

      const nextPhone = "+" + country.callingCode + "-" + updatedPhone;
      await updateMyDetails(nameId, { phone: nextPhone });

      setDetails((prevDetails) => ({
        ...prevDetails,
        phone: nextPhone,
      }));

      editPhoneModalRef.current?.close();
      setIsMobileOtpSent(false);
    } catch (error: any) {
      console.error("Error verifying phone number:", error);
      setIsIncorrect(true);
    }
  };

  const styles = StyleSheet.create({
    emailInput: {
      backgroundColor: ink.surfaceRaised(theme === "dark"),
      color: ink.text(isDark),
      padding: space.md,
      borderWidth: 1,
      borderRadius: radius.input,
      marginVertical: space.md,
      borderColor: ink.inputLine(theme === "dark"),
    },
    otpInputContainer: {
      marginHorizontal: -5,
    },
    otpInput: {
      backgroundColor: ink.surface(isDark),
      borderRadius: radius.input,
      borderWidth: 3,
      color: ink.text(isDark),
    },
    input: {
      fontSize: fontSize.md,
      borderColor: ink.line(true),
      borderWidth: 1,
      padding: space.sm,
      marginVertical: space.md,
      borderRadius: radius.group,
    },
    saveButton: {
      backgroundColor: colors.dark.brand,
      padding: space.md,
      alignItems: "center",
      borderRadius: radius.card,
    },
    textInputContainer: {
      marginHorizontal: -5,
    },
    roundedTextInput: {
      backgroundColor: ink.surface(isDark),
      borderRadius: radius.input,
      borderWidth: 3,
      color: ink.text(isDark),
    },
  });
  // roundedTextInput's width is proportional to the viewport, so it can't
  // live inside StyleSheet.create (which can't see the useWindowDimensions
  // hook). Compose it in the component body instead.
  const roundedTextInputStyle = useMemo(
    () => ({ ...styles.roundedTextInput, width: winW * 0.125 }),
    [isDark, winW]
  );
  const handleProfileUpdate = async () => {
    if (selectedImage) {
      try {
        await updateMyProfileImage(nameId, selectedImage);
        setDetails((prevDetails) => ({
          ...prevDetails,
          profilePic: selectedImage,
        }));
        setSelectedImage(null);
        profileImageSheetRef.current?.close();
      } catch (error) {
        console.error("Error updating profile image:", error);
      }
    } else {
    }
  };

  // IMAGE
  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      toast.error("Photo library access is needed to choose an image");
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
      toast.error("Camera access is needed to take a photo");
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

  const handleDeleteAccount = () => {
    deleteMyAccount(nameId);
  }

  return (
    <>
      {deleteAccountModal && <DeleteAccountModal open={deleteAccountModal} onDelete={handleDeleteAccount} onCancel={() => {
        setDeleteAccountModal(false);
      }} />}
      {!deleteAccountModal && <CustomBottomSheetModal
        ref={bottomSheetModalRef}
        // Five static rows and a destructive action never needed 90% of the
        // screen — that read as ~350pt of dead space below the content. The
        // filter sheet in search-results.tsx tunes its snap point to what it
        // actually holds; this does the same instead of over-reserving.
        snapPoints={["62%"]}
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
          style={{ paddingVertical: SCREEN_GUTTER }}
          className={`flex-row justify-between items-center border-b-[1px] ${isDark ? "border-input-line-dark" : "border-input-line-light"
            } p-4`}
        >
          <View className="flex-row space-x-3 items-center justify-center">
            <View>
              <Image
                source={{ uri: selectedImage || details.profilePic }}
                style={{ width: winW * 0.12, height: winW * 0.12 }}
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
          {/* One edit affordance for one action: the pencil icon used by every
              row below, not a second "Upload" text link doing the same job. */}
          {!selectedImage && (
            <IconButton
              accessibilityLabel="Edit profile picture"
              onPress={openProfileImageSheet}
            >
              <PencilSquareIcon size={20} color={colors.dark.brand} />
            </IconButton>
          )}
        </View>

        {/* Full Name */}
        <View className="p-4">
          <View
            style={{ paddingVertical: SCREEN_GUTTER }}
            className="flex-row justify-between items-center "
          >
            <View className="flex-row space-x-3 items-center justify-center">
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
            <IconButton accessibilityLabel="Edit full name" onPress={openEditNameModal}>
              <PencilSquareIcon
                size={20}
                color={colors.dark.brand}
              />
            </IconButton>
          </View>

          {/* Email Address */}
          <View
            style={{ paddingVertical: SCREEN_GUTTER }}
            className="flex-row justify-between items-center "
          >
            <View className="flex-row space-x-3 items-center justify-center">
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
            <IconButton accessibilityLabel="Edit email address" onPress={openEditEmailModal}>
              <PencilSquareIcon
                size={20}
                color={colors.dark.brand}
              />
            </IconButton>
          </View>

          {/* Phone Number */}
          <View
            style={{ paddingVertical: SCREEN_GUTTER }}
            className="flex-row justify-between items-center "
          >
            <View className="flex-row space-x-3 items-center justify-center">
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
            <IconButton accessibilityLabel="Edit phone number" onPress={openEditPhoneModal}>
              <PencilSquareIcon
                size={20}
                color={colors.dark.brand}
              />
            </IconButton>
          </View>

          {/* Password */}
          <View
            style={{ paddingVertical: SCREEN_GUTTER }}
            className="flex-row justify-between items-center "
          >
            <View className="flex-row space-x-3 items-center justify-center">
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
            <IconButton accessibilityLabel="Edit password" onPress={openEditPasswordModal}>
              <PencilSquareIcon
                size={20}
                color={colors.dark.brand}
              />
            </IconButton>
          </View>
        </View>

        <View className="px-gutter">
          {selectedImage && (
            <TouchableOpacity
              onPress={handleProfileUpdate}
              style={[styles.saveButton, { marginTop: space.xl }]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
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

        {/* Delete account used to float unbounded below the last row with no
            container of its own. A top separator and a proper 44pt row read
            as an intentional, contained destructive action instead. */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: ink.line(isDark),
            marginTop: 8,
            paddingHorizontal: space.md,
          }}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Delete my account"
            onPress={() => setDeleteAccountModal(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              minHeight: MIN_TOUCH_TARGET,
            }}
          >
            <TrashIcon size={18} color={ink.danger(isDark)} />
            <Text fontWeight="font-semibold" style={{ color: ink.danger(isDark) }}>
              Delete my account
            </Text>
          </TouchableOpacity>
        </View>
      </CustomBottomSheetModal>}

      {/* Profile Picture Sheet */}
      <CustomBottomSheetModal
        snapPoints={["40%"]}
        ref={profileImageSheetRef}
        isDark={isDark}
      >
        <View className="w-full px-gutter py-2 flex flex-col justify-start flex-1">
          <View className="py-4 flex-row items-center justify-between space-x-5">
            <TouchableOpacity
              onPress={pickImageFromGallery}
              className=" flex-1 space-y-4"
              style={{
                borderStyle: "dashed",
                borderColor: ink.line(false),
                borderWidth: 1,
                height: winH * 0.20,
                borderRadius: radius.input,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PhotoIcon
                size={24}
                color={isDark ? ink.line(false) : ink.line(true)}
              />
              <Text
                className={`${isDark ? "text-muted-dark" : "text-muted-light"
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
                borderColor: ink.line(false),
                borderWidth: 1,
                height: winH * 0.20,
                borderRadius: radius.input,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CameraIcon
                size={24}
                color={isDark ? ink.line(false) : ink.line(true)}
              />
              <Text
                className={`${isDark ? "text-muted-dark" : "text-muted-light"
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
          style={{ paddingVertical: SCREEN_GUTTER }}
        >
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
            className="items-start"
            onPress={() => {
              editNameModalRef.current?.close();
            }}
          >
            <ArrowLeftIcon
              size={26}
              color={ink.body(isDarkMode)}
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
        <View className="p-4 space-y-4">
          <TextInput
            className={`rounded-card border p-3 ${isDark
              ? "border-input-line-dark text-white"
              : "border-input-line-light text-black"
              }`}
            placeholderTextColor={ink.dim(isDark)}
            value={updatedName}
            onChangeText={setUpdatedName}
            placeholder="Enter your full name"
          />
          <TouchableOpacity
            onPress={handleSaveName}
            style={styles.saveButton}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
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
          style={{ paddingVertical: SCREEN_GUTTER }}
        >
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
            className="items-start"
            onPress={() => {
              editEmailModalRef.current?.close();
            }}
          >
            <ArrowLeftIcon
              size={26}
              color={ink.body(isDarkMode)}
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

        <View className="p-4 space-y-4">
          {!isOtpSent ? (
            <>
              <TextInput
                className={`rounded-button border p-3 ${isDark
                  ? "border-input-line-dark text-white"
                  : "border-input-line-light text-black"
                  }`}
                placeholderTextColor={ink.dim(isDark)}
                value={updatedEmail}
                onChangeText={setUpdatedEmail}
                editable={!loading}
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                autoCorrect={false}
                accessibilityLabel="New email address"
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
                  textInputStyle={roundedTextInputStyle}
                  // @ts-ignore
                  placeholder="*"
                  placeholderTextColor={
                    ink.dim(isDark)
                  }
                  inputCount={6}
                  inputCellLength={1}
                  tintColor={colors.dark.brand}
                  offTintColor={ink.line(isDark)}
                  keyboardType="number-pad"
                  autoFocus
                  handleTextChange={setVerificationCode}
                />
              </View>

              {isIncorrect && (
                <View className="flex mt-2 flex-row items-center space-x-2">
                  <Text tone="danger"
                    fontSize="text-sm"
                    fontWeight="font-bold"
                  >
                    Wrong OTP. Try again
                  </Text>
                </View>
              )}

              <View className=" flex-row space-x-3 ">
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
          style={{ paddingVertical: SCREEN_GUTTER }}
        >
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
            className="items-start"
            onPress={() => {
              setPhoneOtpError("");
              setIsIncorrect(false);
              setIsMobileOtpSent(false);
              editPhoneModalRef.current?.close();
            }}
          >
            <ArrowLeftIcon
              size={26}
              color={ink.body(isDarkMode)}
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

        <View className="p-4 space-y-4  flex-1">
          {!isMobileOtpSent ? (
            <>
              <View className="flex-row space-x-2 ">
                <View
                  className={` rounded-card flex-[0.5] border h-12  flex-row items-center justify-center ${isDark
                    ? "border-input-line-dark text-white"
                    : "border-input-line-light text-black"
                    }`}
                >
                  <CountryPicker
                    {...(isDark && { theme: DARK_THEME })}
                    withFlag
                    withCallingCode
                    renderFlagButton={({ onOpen }) => <Pressable onPress={onOpen}>
                      <Flag countryCode={country.cca2} flagSize={16} />
                    </Pressable>
                    }
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
                      color={ink.text(isDark)}
                      className="mt-1"
                    />
                  </View>
                </View>

                <View
                  className={`flex-row items-center rounded-card flex-1 border px-3 h-12 ${isDark
                    ? "border-input-line-dark text-white"
                    : "border-input-line-light text-black"
                    }`}
                >
                  <View className="pr-2 items-center justify-center">
                    <Text>
                      +{country.callingCode}
                    </Text>
                  </View>
                  <View>
                    <TextInput
                      maxLength={10}
                      placeholder="Enter phone number"
                      value={updatedPhone}
                      onChangeText={setUpdatedPhone}
                      keyboardType="number-pad"
                      placeholderTextColor={ink.dim(isDark)}
                      className={`flex-1 h-12 p-3 pl-0  ${isDark ? "text-white" : "text-black"
                        }`}
                    />
                  </View>
                </View>
              </View>
              <Button onPress={handleSendOtpToMobile} loading={isPhoneOtpLoading}>
                <Text
                  fontSize="text-sm"
                  fontWeight="font-bold"
                  className="text-white"
                >
                  Verify
                </Text>
              </Button>
              {phoneOtpError ? (
                <View className="flex mt-2 flex-row items-center space-x-2">
                  <Text
                    tone="danger"
                    fontSize="text-sm"
                    fontWeight="font-bold"
                  >
                    {phoneOtpError}
                  </Text>
                </View>
              ) : null}
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
                  textInputStyle={roundedTextInputStyle}
                  // @ts-ignore
                  placeholder="*"
                  placeholderTextColor={
                    ink.dim(isDark)
                  }
                  inputCount={6}
                  inputCellLength={1}
                  tintColor={colors.dark.brand}
                  offTintColor={ink.line(isDark)}
                  keyboardType="number-pad"
                  autoFocus
                  handleTextChange={setMobileOtpVerificationCode}
                />
              </View>

              {isIncorrect && (
                <View className="flex mt-2 flex-row items-center space-x-2">
                  <Text tone="danger"
                    fontSize="text-sm"
                    fontWeight="font-bold"
                  >
                    Wrong OTP. Try again
                  </Text>
                </View>
              )}

              {phoneOtpError ? (
                <View className="flex mt-2 flex-row items-center space-x-2">
                  <Text
                    tone="danger"
                    fontSize="text-sm"
                    fontWeight="font-bold"
                  >
                    {phoneOtpError}
                  </Text>
                </View>
              ) : null}

              <View className=" flex-row space-x-3 ">
                <View className="flex-1">
                  <Button
                    variant="outline"
                    onPress={handleSendOtpToMobile}
                    loading={isPhoneOtpLoading}
                  >
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
          style={{ paddingVertical: SCREEN_GUTTER }}
        >
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
            className="items-start"
            onPress={() => editPasswordModalRef.current?.close()}
          >
            <ArrowLeftIcon
              size={26}
              color={ink.body(isDarkMode)}
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

        <View className="p-4 space-x-4">
          <Text
            fontSize="text-base"
            fontWeight="font-bold"
          >
            Current Password
          </Text>
          <View
            className={`flex flex-row items-center border mt-2 rounded-button p-2 h-12  ${isDark
              ? "border-input-line-dark text-white"
              : "border-input-line-light text-black"
              }`}
          >
            <TextInput
              className="flex-1"
              secureTextEntry={!showPassword}
              value={updatedPassword}
              onChangeText={setUpdatedPassword}
              textContentType="password"
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Current password"
              placeholder="Enter your current password"
              placeholderTextColor={ink.dim(isDark)}
              style={{ color: ink.text(isDarkMode) }}
            />
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Show or hide password" onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <EyeSlashIcon
                  size={22}
                  color={ink.text(isDarkMode)}
                />
              ) : (
                <EyeIcon
                  size={22}
                  color={ink.text(isDarkMode)}
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
            className={`flex flex-row items-center border mt-2 rounded-button p-2 h-12  ${isDark
              ? "border-input-line-dark text-white"
              : "border-input-line-light text-black"
              }`}
          >
            <TextInput
              className="flex-1"
              secureTextEntry={!showNewPassoword}
              value={newPassword}
              onChangeText={handleNewPasswordChange}
              textContentType="newPassword"
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="New password"
              placeholder="Enter your new password"
              style={{ color: ink.text(isDarkMode) }}
              placeholderTextColor={ink.dim(isDark)}
            />
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Show or hide password"
              onPress={() => setShowNewPassword(!showNewPassoword)}
            >
              {showNewPassoword ? (
                <EyeSlashIcon
                  size={22}
                  color={ink.text(isDarkMode)}
                />
              ) : (
                <EyeIcon
                  size={22}
                  color={ink.text(isDarkMode)}
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
                style={{ color: ink.danger(isDark) }}
              >
                Your password must include:
              </Text>
              {passwordErrors.map((error, index) => (
                <Text
                  key={index}
                  fontSize="text-xs"
                  fontWeight="font-bold"
                  style={{ color: ink.danger(isDark) }}
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
                backgroundColor: colors.dark.brand,
                padding: space.md,
                alignItems: "center",
                borderRadius: radius.card,
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
