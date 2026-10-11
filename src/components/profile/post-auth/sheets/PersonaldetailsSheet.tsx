
import { useAuth } from "@/backend/auth";
import { useProfile } from "@/backend/profile";
import { fetchUnlock } from "@/backend/unlock";
import { UnlockSheet, UnlockSheetHandle } from "@/components/bank/unlock-sheet";
import { Button, Text } from "@/components/core";
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
import { apiError } from "@/lib/api-error";
import { needsCurrentNumberCode, noNumberStep, phoneChangeBody, phoneChangeOutcome, unlockNext, unlockStart } from "@/lib/phone-change";
import { EMAIL_HAS_ACCOUNT, emailChangeBody, emailChangeOutcome, emailCodeText, emailProof, sameEmail } from "@/lib/sign-in-proof";
import { toast } from "@/lib/toast";
import { useTheme } from "@/lib/theme";
import { isUnlocked } from "@/lib/unlock";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// A fixed-length mask so the field never leaks the real password's length —
// seven asterisks previously meant "this password is seven characters".
const PASSWORD_MASK = "••••••••";

// Measured off the Figma Personal details sheet: a 37pt grabber row, a 44pt
// title, an 80pt picture row and four 85pt fields (16 above and below a 21pt
// label, 8, and a 24pt value). The delete row below is ours, not the frame's.
const HEADER_HEIGHT = 44;
const ROW_PAD_V = 16;
const AVATAR = 48;
const FIELD_HEIGHT = 85;
const SHEET_HEIGHT =
  37 + HEADER_HEIGHT + (AVATAR + 2 * ROW_PAD_V + 1) + 4 * FIELD_HEIGHT + 1 + MIN_TOUCH_TARGET;

function DetailField({
  label,
  value,
  accessibilityLabel,
  onEdit,
  busy = false,
  error = null,
}: {
  label: string;
  value: string;
  accessibilityLabel: string;
  onEdit: () => void;
  /** A change is being got ready (the unlock is read): the pencil waits, and a second tap does nothing. */
  busy?: boolean;
  /** Why the change could not open, said here in the sheet (a toast is drawn behind a sheet and cannot be seen). */
  error?: string | null;
}) {
  const { color } = useTheme();
  return (
    <View style={{ minHeight: FIELD_HEIGHT, paddingVertical: ROW_PAD_V, paddingHorizontal: SCREEN_GUTTER, gap: 8 }}>
      <Text fontSize="text-sm" fontWeight="font-bold">
        {label}
      </Text>
      <Text fontSize="text-md" numberOfLines={1} style={{ paddingRight: 32 }}>
        {value}
      </Text>
      {error ? (
        <Text fontSize="text-sm" tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ busy, disabled: busy }}
        disabled={busy}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        onPress={onEdit}
        style={{ position: "absolute", top: ROW_PAD_V, right: SCREEN_GUTTER }}
      >
        {busy ? <ActivityIndicator size="small" color={color.brandText} /> : <PencilSquareIcon size={20} color={color.brandText} />}
      </TouchableOpacity>
    </View>
  );
}

interface PersonalDetailsSheetProps {
  bottomSheetModalRef: React.RefObject<any>;
  isDarkMode: boolean;
}

const PersonalDetailsSheet: React.FC<PersonalDetailsSheetProps> = ({
  bottomSheetModalRef,
  isDarkMode,
}) => {
  const { theme } = useGlobalContext();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const { sendOTP, verifyOTP, requestPhoneNumberChangeOtp, verifyPhoneNumberChange } =
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

  /**
   * Reads the account. With `accountOnly` only what the sheet shows of the account is refreshed (the rows, and the
   * number the code goes to): the boxes a change is being typed in keep what the person typed, so a new address with
   * its proof held is never overwritten by the account's current one (review app-6 r2 #5).
   */
  const fetchDetails = async (accountOnly = false) => {
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
    if (accountOnly) return;
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
  // Changing the email needs the same two proofs as the number (decisions T-14, T-19): the code to the
  // CURRENT number first, when the account has one, and then the emailed code to the NEW address, whose
  // proof token goes with the change. It is below, with the number's: they share the one unlock sheet.
  const openEditEmailModal = () =>
    void openChange("email", () => {
      setEmailError("");
      setIsIncorrect(false);
      setIsOtpSent(false);
      emailToken.current = "";
      editEmailModalRef.current?.present();
    });
  // Changing the number needs two proofs (decision T-14): a code sent to the CURRENT number
  // first, when the account has one (it unlocks this phone for a while, as for the bank
  // account), and the code sent to the NEW number, whose ID token goes with the change.
  const unlockSheet = useRef<UnlockSheetHandle>(null);
  /** What to do once the unlock is done, and what a forced one may do if it cannot be (never repeat a save on its own). */
  const pending = useRef<{ then: () => void; force: boolean; onFail?: (text: string) => void } | null>(null);
  // True while the unlock is being read, so a second tap does not open the sheet and send a second text.
  const askingForCode = useRef(false);
  const [codeGoesTo, setCodeGoesTo] = useState({ phoneMasked: "", minutes: 30 });
  /** The Firebase ID token of the new number, kept after the code is spent so a failed save is repeated alone. */
  const phoneToken = useRef("");
  const savingPhone = useRef(false);
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  /**
   * Runs `then` once this phone is unlocked: at once if it already is, and with no
   * code at all when this phone believes the account has no number yet (a first number is the save alone).
   * `force` is for when the server has just said it is locked (403 `fresh_code_required`): the server is always
   * asked, the shortcut is never taken, and nothing is done for the person if the unlock cannot be made; `onFail`
   * says why, in the place the person is looking. A save is repeated only after a new unlock or a press, never
   * on its own (review app-6 r1 #2).
   */
  const askForCode = async (then: () => void, opts: { force?: boolean; onFail?: (text: string) => void } = {}) => {
    const { force = false, onFail } = opts;
    if (askingForCode.current) return;
    const believesNumber = needsCurrentNumberCode(details.phone);
    if (unlockStart({ force, believesNumber }) === "carry_on") {
      then();
      return;
    }
    askingForCode.current = true;
    try {
      const state = await fetchUnlock();
      const next = unlockNext({ force, believesNumber, unlocked: isUnlocked(state) });
      if (next === "carry_on") {
        then();
        return;
      }
      if (next === "stale_copy") {
        // The server has a number this phone's copy of the account does not (set on another phone): the copy is read
        // again, and the person tries once more with it, instead of a save that would be refused again.
        void fetchDetails(true).catch(() => undefined);
        onFail?.("Your account has a phone number this phone didn't know about. Your details are updated: try again.");
        return;
      }
      setCodeGoesTo({ phoneMasked: state.phone_masked, minutes: state.minutes });
      pending.current = { then, force, onFail };
      // Sends the code to the number the account has, as it opens.
      unlockSheet.current?.open();
    } catch (error) {
      if (apiError(error)?.code === "phone_required") {
        // The server says the account has no number after all: nothing to confirm first, unless it has just asked for it.
        if (noNumberStep(force) === "carry_on") {
          then();
          return;
        }
        onFail?.("Your account has no phone number to send a code to. Add one in your profile first.");
        return;
      }
      onFail?.("We couldn't check your code. Check your connection and try again.");
    } finally {
      askingForCode.current = false;
    }
  };

  /** Which row is being got ready (the unlock is read), and why it could not open: both shown on the row itself. */
  const [opening, setOpening] = useState<"email" | "phone" | null>(null);
  const [openError, setOpenError] = useState<{ field: "email" | "phone"; text: string } | null>(null);

  const openChange = async (field: "email" | "phone", present: () => void) => {
    if (opening) return;
    setOpenError(null);
    // The real number is needed to know whether a code comes first: not before the details have loaded.
    if (!nameId) {
      setOpenError({ field, text: "Still loading your details. Try again in a moment." });
      return;
    }
    setOpening(field);
    try {
      await askForCode(present, { onFail: (text) => setOpenError({ field, text }) });
    } finally {
      setOpening(null);
    }
  };

  const openEditPhoneModal = () => void openChange("phone", () => editPhoneModalRef.current?.present());
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

  const [emailError, setEmailError] = useState("");
  const [isEmailBusy, setIsEmailBusy] = useState(false);
  /** The proof token of the emailed code, kept after the code is spent so a failed save is repeated alone. */
  const emailToken = useRef("");
  const savingEmail = useRef(false);

  /** Sends (or sends again) the code to the NEW address. A new code makes the one confirmed before it worthless. */
  const handleSendOtp = async () => {
    if (!updatedEmail.trim() || savingEmail.current) return;
    if (sameEmail(updatedEmail, details.email)) {
      setEmailError("That is already your email address.");
      return;
    }
    savingEmail.current = true;
    setIsEmailBusy(true);
    setEmailError("");
    setIsIncorrect(false);
    emailToken.current = "";
    try {
      // The server limits how often codes are asked for (429): said plainly, never retried by itself.
      await sendOTP(updatedEmail.trim());
      setIsOtpSent(true);
    } catch (error: any) {
      setEmailError(emailCodeText(error, "send"));
    } finally {
      savingEmail.current = false;
      setIsEmailBusy(false);
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
    // A new code makes the one that was confirmed before it worthless.
    phoneToken.current = "";
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
  /**
   * Sends the new address with the proof that this person reads its mail (decision T-19). The answers are said
   * in plain words; the proof is kept for the ones that leave it good, so a lost answer is repeated alone.
   */
  const saveEmail = async () => {
    try {
      const saved = await updateMyDetails(nameId, emailChangeBody(updatedEmail, emailToken.current));
      emailToken.current = "";
      setDetails((prevDetails) => ({ ...prevDetails, email: saved?.email || updatedEmail.trim() }));
      editEmailModalRef.current?.close();
      setIsOtpSent(false);
    } catch (error) {
      const outcome = emailChangeOutcome(apiError(error));
      setEmailError(outcome.text);
      if (outcome.next === "unlock") {
        // The unlock ran out while the code was typed: confirm the current number again, then save.
        void askForCode(() => void saveEmail(), { force: true, onFail: setEmailError });
      } else if (outcome.next === "new_code") {
        emailToken.current = "";
      } else if (outcome.next === "new_email") {
        // Another address is needed: back to typing one, with the reason under the box.
        emailToken.current = "";
        setIsOtpSent(false);
      }
    }
  };

  const handleSubmitOtp = async () => {
    if (verificationCode.length !== 6 || savingEmail.current) return;
    savingEmail.current = true;
    setIsEmailBusy(true);
    setIsIncorrect(false);
    setEmailError("");
    try {
      if (!emailToken.current) {
        let proof;
        try {
          // The check answers `proof_token` for an address that has no account of its own. If it answers tokens
          // instead, the address already belongs to an account: say so and stop, and keep nothing.
          proof = emailProof(await verifyOTP(updatedEmail.trim(), verificationCode));
        } catch (error: any) {
          if (error?.status === 401) setIsIncorrect(true);
          else setEmailError(emailCodeText(error, "check"));
          return;
        }
        if (proof.kind === "has_account") {
          setEmailError(EMAIL_HAS_ACCOUNT);
          setIsOtpSent(false);
          return;
        }
        if (proof.kind === "none") {
          setEmailError("We couldn't confirm that code. Send a new one and try again.");
          return;
        }
        emailToken.current = proof.token;
      }
      await saveEmail();
    } finally {
      savingEmail.current = false;
      setIsEmailBusy(false);
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
  /**
   * Sends the new number with the proof that this person holds it (decision T-14). The
   * backend refuses a number another account has (`phone_taken`), a code confirmed more
   * than five minutes ago, and a phone that has not been unlocked with its current number.
   * Each is said in plain words, and the proof is kept for the answers that leave it good,
   * so a lost answer is repeated alone and does not ask for another text.
   */
  const savePhone = async () => {
    try {
      const saved = await updateMyDetails(nameId, phoneChangeBody(fullPhone, phoneToken.current));
      phoneToken.current = "";
      setDetails((prevDetails) => ({ ...prevDetails, phone: saved?.phone || fullPhone }));
      editPhoneModalRef.current?.close();
      setIsMobileOtpSent(false);
    } catch (error) {
      const outcome = phoneChangeOutcome(apiError(error));
      setPhoneOtpError(outcome.text);
      if (outcome.next === "unlock") {
        // The unlock ran out while the code was being typed: confirm the current number again, then save.
        void askForCode(() => void savePhone(), { force: true, onFail: setPhoneOtpError });
      } else if (outcome.next === "new_code") {
        phoneToken.current = "";
      } else if (outcome.next === "new_number") {
        // Another number is needed: back to typing one, with the reason under the box.
        phoneToken.current = "";
        setIsMobileOtpSent(false);
      }
    }
  };

  const handleSubmitOtpForMobile = async () => {
    if (mobileOtpVerificationCode.length !== 6 || savingPhone.current) {
      return;
    }
    savingPhone.current = true;
    setIsSavingPhone(true);
    setIsIncorrect(false);
    setPhoneOtpError("");
    try {
      if (!phoneToken.current) {
        try {
          // Throws on a wrong/expired code. Runs on an isolated Firebase app, so it
          // does not touch the login/chat session. Gives the ID token of the new number.
          phoneToken.current = await verifyPhoneNumberChange(mobileOtpVerificationCode);
        } catch (error: any) {
          console.error("Error verifying phone number:", error);
          setIsIncorrect(true);
          return;
        }
        if (!phoneToken.current) {
          setPhoneOtpError("We couldn't confirm that code. Send a new one and try again.");
          return;
        }
      }
      await savePhone();
    } finally {
      savingPhone.current = false;
      setIsSavingPhone(false);
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
        // The frame's sheet is exactly its rows tall; a fixed point (plus the
        // home-indicator inset it draws outside the sheet) keeps the bottom
        // from reading as dead space, which "62%" left on shorter phones.
        snapPoints={[SHEET_HEIGHT + insets.bottom]}
        frame
        isDark={isDarkMode}
      >
        <View style={{ height: HEADER_HEIGHT, alignItems: "center", justifyContent: "center" }}>
          <Text accessibilityRole="header" fontSize="text-base" fontWeight="font-bold">
            Personal details
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: ROW_PAD_V,
            paddingHorizontal: SCREEN_GUTTER,
            borderBottomWidth: 1,
            borderBottomColor: color.line,
          }}
        >
          <Image
            source={{ uri: selectedImage || details.profilePic }}
            style={{ width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 }}
          />
          <Text fontSize="text-sm" fontWeight="font-bold" style={{ flex: 1 }}>
            Profile picture
          </Text>
          {/* Hidden once a picture is picked: the Update button below takes over. */}
          {!selectedImage && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Upload profile picture"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={openProfileImageSheet}
            >
              <Text fontSize="text-sm" fontWeight="font-bold" style={{ color: color.brandText }}>
                Upload
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <DetailField label="Full name" value={details.fullName} accessibilityLabel="Edit full name" onEdit={openEditNameModal} />
        <DetailField label="Email address" value={details.email} accessibilityLabel="Edit email address" onEdit={openEditEmailModal} busy={opening === "email"} error={openError?.field === "email" ? openError.text : null} />
        <DetailField label="Phone number" value={details.phone} accessibilityLabel="Edit phone number" onEdit={openEditPhoneModal} busy={opening === "phone"} error={openError?.field === "phone" ? openError.text : null} />
        <DetailField label="Password" value={details.password} accessibilityLabel="Edit password" onEdit={openEditPasswordModal} />

        {selectedImage && (
          <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
            <TouchableOpacity
              onPress={handleProfileUpdate}
              style={[styles.saveButton, { marginTop: space.md }]}
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
          </View>
        )}

        {/* The frame has no delete action; it stays as a contained destructive
            row under the fields rather than being dropped. */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: color.line,
            paddingHorizontal: SCREEN_GUTTER,
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

              <Button onPress={handleSendOtp} loading={isEmailBusy} disabled={isEmailBusy}>
                <Text
                  fontSize="text-sm"
                  fontWeight="font-bold"
                  className="text-white"
                >
                  Verify
                </Text>
              </Button>
              {emailError ? (
                <Text tone="danger" fontSize="text-sm" fontWeight="font-bold" accessibilityRole="alert">
                  {emailError}
                </Text>
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

              {emailError ? (
                <Text tone="danger" fontSize="text-sm" fontWeight="font-bold" accessibilityRole="alert">
                  {emailError}
                </Text>
              ) : null}

              <View className=" flex-row space-x-3 ">
                <View className="flex-1">
                  <Button variant="outline" onPress={handleSendOtp} disabled={isEmailBusy}>
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
                  <Button onPress={handleSubmitOtp} loading={isEmailBusy} disabled={isEmailBusy}>
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

      {/* The code to the number the account has now, before a new one is taken (decision T-14). */}
      <UnlockSheet
        ref={unlockSheet}
        phoneMasked={codeGoesTo.phoneMasked}
        minutes={codeGoesTo.minutes}
        phone={details.phone}
        // The server says the account has no number: a first number needs no code first. Whichever change asked
        // carries on as itself (not always the number's sheet); one that was told to unlock again does not carry on.
        onPhoneRequired={() => {
          const next = pending.current;
          pending.current = null;
          if (next && noNumberStep(next.force) === "carry_on") next.then();
          else next?.onFail?.("Your account has no phone number to send a code to. Add one in your profile first.");
        }}
        onUnlocked={() => {
          unlockSheet.current?.close();
          const next = pending.current;
          pending.current = null;
          next?.then();
        }}
      />

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
              phoneToken.current = "";
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
                  <Button onPress={handleSubmitOtpForMobile} loading={isSavingPhone}>
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
