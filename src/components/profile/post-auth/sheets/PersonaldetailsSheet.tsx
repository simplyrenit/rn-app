
import { useAuth } from "@/backend/auth";
import { useKycStatus } from "@/backend/kyc";
import { useProfile } from "@/backend/profile";
import { fetchUnlock } from "@/backend/unlock";
import { UnlockSheet, UnlockSheetHandle, otpBox, otpRow } from "@/components/bank/unlock-sheet";
import { FieldError, SheetFooter, SheetHeader, Text, TextField } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { useGlobalContext } from "@/context/global-context";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import CountryPicker, { DARK_THEME } from "react-native-country-picker-modal";
import {
  CameraIcon,
  CheckIcon,
  ExclamationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSquareIcon,
  PhotoIcon,
  TrashIcon,
} from "react-native-heroicons/outline";
import { ChevronDownIcon } from "react-native-heroicons/mini";
import OTPTextView from "react-native-otp-textinput";
import { ProfileAvatar } from "../profile-img";
import DeleteAccountModal from "./DeleteAccountModal";
import { density, radius, SCREEN_GUTTER } from "@/lib/design-tokens";
import { apiError } from "@/lib/api-error";
import { DeleteProblem, deleteProblem } from "@/lib/delete-account";
import { nameLockNote, nameSaveOutcome } from "@/lib/name-change";
import { needsCurrentNumberCode, noNumberStep, phoneChangeBody, phoneChangeOutcome, unlockNext, unlockStart } from "@/lib/phone-change";
import { EMAIL_HAS_ACCOUNT, emailChangeBody, emailChangeOutcome, emailCodeText, emailProof, sameEmail } from "@/lib/sign-in-proof";
import { toast } from "@/lib/toast";
import { useTheme } from "@/lib/theme";
import { isUnlocked } from "@/lib/unlock";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// A fixed-length mask so the field never leaks the real password's length —
// seven asterisks previously meant "this password is seven characters".
const PASSWORD_MASK = "••••••••";

// The 2.1 frames (2096:27684 …), less the home indicator, which `insets.bottom` stands in for. Every sheet opens with
// the kit Sheet header: the 21pt grabber gorhom draws, a 44 title row, 8 under it.
const SHEET_HEADER = 73;
// Personal details: the 72 picture row, four 70 detail rows, a hairline under each, and the 48 delete row (478).
const PICTURE_ROW = 72;
const FIELD_ROW = 70;
const DELETE_ROW = 48;
const DETAILS_HEIGHT = SHEET_HEADER + PICTURE_ROW + 1 + 4 * (FIELD_ROW + 1) + DELETE_ROW;
// The locked name's note under its value (2096:27788): 2 below the value, and its measured height (two 16pt lines until
// it is measured), so it does not push the delete row out of the bottom.
const NOTE_GAP = 2;
const NOTE_FIRST_GUESS = 2 * 16;
// The kit Sheet footer: a hairline, 16, the 52 Primary, 16 (its `insets.bottom` is the one in the snap).
const FOOTER = 85;
// The edit sheets' content boxes (padded 8 above, 24 below): Full name 80, the email and number steps 108 / 80, a code
// step 156 (label, boxes, Resend OTP), Edit password 200 (two fields 16 apart) or 340 with its rules (2096:30954).
const NAME_CONTENT = 80;
const EMAIL_CONTENT = 108;
const PHONE_CONTENT = 80;
const CODE_CONTENT = 156;
const PASSWORD_CONTENT = 200;
const PASSWORD_RULES = 16 + 124;
// An error line under a field has no frame: room for two 16pt lines and the 8 above them, so Save stays in view.
const ERROR_ROOM = 8 + 2 * 16;
// The kit TextField keeps its form gap below itself; the frames' content boxes end 24 under the field.
const FIELD_GAP_BACK = 24 - density.fieldGap;

const PASSWORD_RULE_LIST: { text: string; test: (password: string) => boolean }[] = [
  { text: "Password must be at least 8 characters.", test: (p) => p.length >= 8 },
  { text: "Password must include at least 1 special character.", test: (p) => /[!@#$%^&*]/.test(p) },
  { text: "Password must include at least 1 number.", test: (p) => /[0-9]/.test(p) },
];

function Divider() {
  const { color } = useTheme();
  return <View style={{ height: 1, backgroundColor: color.line }} />;
}

/** "Resend OTP": the code steps' tertiary text link (2096:30681), SemiBold 14/20 in a 24 box. */
function TextLink({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={12}
      style={{ alignSelf: "flex-start", paddingTop: 4 }}
    >
      <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} style={{ color: disabled ? color.textDim : color.brandText }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** The code step of the email and number sheets: a label, six boxes, the errors, and Resend OTP. */
function CodeStep({
  onCode,
  wrong,
  error,
  onResend,
  resendDisabled,
}: {
  onCode: (code: string) => void;
  wrong: boolean;
  error: string;
  onResend: () => void;
  resendDisabled: boolean;
}) {
  const { color } = useTheme();
  const { width } = useWindowDimensions();
  return (
    <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 24, gap: 12 }}>
      <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20}>
        Enter verification code
      </Text>
      <OTPTextView
        containerStyle={otpRow}
        textInputStyle={otpBox(width, color)}
        inputCount={6}
        inputCellLength={1}
        tintColor={color.brand}
        offTintColor={color.line}
        keyboardType="number-pad"
        autoFocus
        handleTextChange={onCode}
      />
      {wrong ? <FieldError>Wrong OTP. Try again</FieldError> : null}
      {error ? <FieldError>{error}</FieldError> : null}
      <TextLink label="Resend OTP" onPress={onResend} disabled={resendDisabled} />
    </View>
  );
}

function DetailField({
  label,
  value,
  accessibilityLabel,
  onEdit,
  note = null,
  onNoteHeight,
  busy = false,
  error = null,
}: {
  label: string;
  value: string;
  accessibilityLabel: string;
  /** Left out when the field cannot be changed here: the row has no pencil. */
  onEdit?: () => void;
  /** Why the field cannot be changed, said on the row so nobody is invited to try. */
  note?: string | null;
  /** The note's laid-out height, for a sheet sized to its rows. */
  onNoteHeight?: (height: number) => void;
  /** A change is being got ready (the unlock is read): the pencil waits, and a second tap does nothing. */
  busy?: boolean;
  /** Why the change could not open, said here in the sheet (a toast is drawn behind a sheet and cannot be seen). */
  error?: string | null;
}) {
  const { color } = useTheme();
  // 2096:27684: 70 high, padded 12 / 24; the label 14/20 at 60% over the 16/24 Medium value, and the 20pt pencil
  // centred on the right.
  return (
    <View
      style={{
        minHeight: FIELD_ROW,
        paddingVertical: 12,
        paddingHorizontal: SCREEN_GUTTER,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text fontSize="text-sm" lineHeight={20} tone="dim">
          {label}
        </Text>
        <Text fontSize="text-md" fontWeight="font-medium" lineHeight={24} numberOfLines={1}>
          {value}
        </Text>
        {note ? (
          <Text fontSize="text-xs" lineHeight={16} tone="dim" onLayout={(event) => onNoteHeight?.(event.nativeEvent.layout.height)}>
            {note}
          </Text>
        ) : null}
        {error ? (
          <Text fontSize="text-xs" fontWeight="font-medium" lineHeight={16} accessibilityRole="alert" style={{ color: color.dangerStrong }}>
            {error}
          </Text>
        ) : null}
      </View>
      {onEdit ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ busy, disabled: busy }}
          disabled={busy}
          hitSlop={12}
          onPress={onEdit}
        >
          {busy ? <ActivityIndicator size="small" color={color.brandText} /> : <PencilSquareIcon size={20} color={color.textDim} />}
        </TouchableOpacity>
      ) : null}
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
  const { theme, userDetails } = useGlobalContext();
  const { color } = useTheme();
  // rn-api refuses a changed name while the account is verified or being verified (D-17), so the row
  // does not offer one then. The status is the query the Profile card already keeps warm.
  const { data: kycStatus } = useKycStatus();
  const nameLock = nameLockNote(userDetails?.business_verified, kycStatus?.kyc_status);
  const [noteHeight, setNoteHeight] = useState(NOTE_FIRST_GUESS);
  const insets = useSafeAreaInsets();
  const { sendOTP, verifyOTP, requestPhoneNumberChangeOtp, verifyPhoneNumberChange } =
    useAuth();
  const isDark = theme === "dark";
  const { height: winH } = useWindowDimensions();
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);

  const [details, setDetails] = useState({
    profilePic: "",
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
      // No photo is "": the avatar draws the initials (2096:27684).
      profilePic: details.image?.image_url ?? "",
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
    setPasswordErrors(PASSWORD_RULE_LIST.filter((rule) => !rule.test(password)).map((rule) => rule.text));
  };

  const handleNewPasswordChange = (password: string) => {
    setNewPassword(password);
    validatePassword(password);
  };

  const allValid = Object.values(validatePassword).every(Boolean);

  // Said in the name sheet, where the person is looking (a toast is drawn behind a sheet).
  const [nameError, setNameError] = useState("");
  const openEditNameModal = () => {
    setNameError("");
    editNameModalRef.current?.present();
  };
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
      // A refusal used to leave the sheet open with no word of why (ENG-280).
      const outcome = nameSaveOutcome(apiError(error));
      setNameError(outcome.text);
      if (outcome.restore) setUpdatedName(details.fullName);
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

  // A delete the server refused (T-20: something is still open) or that failed: the person stays signed in and is told why.
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteIssue, setDeleteIssue] = useState<DeleteProblem | null>(null);
  const deleting = useRef(false);

  const handleDeleteAccount = async () => {
    if (deleting.current) return;
    deleting.current = true;
    setDeleteBusy(true);
    setDeleteIssue(null);
    try {
      // Signs out and goes to Welcome only when the account was closed.
      await deleteMyAccount(nameId);
    } catch (error) {
      setDeleteIssue(deleteProblem(apiError(error)));
    } finally {
      deleting.current = false;
      setDeleteBusy(false);
    }
  };

  // Sheets are sized to their content plus the home-indicator inset, once (the footer pads with that same inset).
  // Capped at 90% of the window: on a 640dp Android phone the rows plus the name note came to more than the window,
  // and the sheet's top ran up under the status bar. The rows scroll inside it past that.
  const fit = (height: number) => Math.min(height + insets.bottom, winH * 0.9);
  const detailsHeight =
    DETAILS_HEIGHT + (nameLock ? NOTE_GAP + noteHeight : 0) + (selectedImage ? FOOTER : 0);
  const nameHeight = SHEET_HEADER + NAME_CONTENT + (nameError ? ERROR_ROOM : 0) + FOOTER;
  const emailHeight =
    SHEET_HEADER + (isOtpSent ? CODE_CONTENT : EMAIL_CONTENT) + (emailError || isIncorrect ? ERROR_ROOM : 0) + FOOTER;
  const phoneHeight =
    SHEET_HEADER + (isMobileOtpSent ? CODE_CONTENT : PHONE_CONTENT) + (phoneOtpError || isIncorrect ? ERROR_ROOM : 0) + FOOTER;
  const passwordHeight = SHEET_HEADER + PASSWORD_CONTENT + (passwordErrors.length > 0 ? PASSWORD_RULES : 0) + FOOTER;

  const closePhoneSheet = () => {
    setPhoneOtpError("");
    setIsIncorrect(false);
    setIsMobileOtpSent(false);
    phoneToken.current = "";
    editPhoneModalRef.current?.close();
  };

  return (
    <>
      {deleteAccountModal && <DeleteAccountModal open={deleteAccountModal} busy={deleteBusy} problem={deleteIssue} onDelete={() => void handleDeleteAccount()} onCancel={() => {
        setDeleteAccountModal(false);
        setDeleteIssue(null);
      }} />}
      {!deleteAccountModal && <CustomBottomSheetModal
        ref={bottomSheetModalRef}
        snapPoints={[fit(detailsHeight)]}
        frame
        isDark={isDarkMode}
      >
        <SheetHeader title="Personal details" grabber={false} onClose={() => bottomSheetModalRef.current?.dismiss()} />

        <View
          style={{
            minHeight: PICTURE_ROW,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 12,
            paddingHorizontal: SCREEN_GUTTER,
          }}
        >
          {/* Initials until there is a photo; the picked one shows before it is uploaded (2096:27891). */}
          <ProfileAvatar uri={selectedImage || details.profilePic || undefined} name={details.fullName} />
          <Text fontSize="text-md" fontWeight="font-semibold" lineHeight={24} style={{ flex: 1 }}>
            Profile picture
          </Text>
          {/* Hidden once a picture is picked: the Update button in the footer takes over. */}
          {!selectedImage && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Upload profile picture"
              hitSlop={12}
              onPress={openProfileImageSheet}
            >
              <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} style={{ color: color.brandText }}>
                Upload
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <Divider />
        <DetailField label="Full name" value={details.fullName} accessibilityLabel="Edit full name" onEdit={nameLock ? undefined : openEditNameModal} note={nameLock} onNoteHeight={setNoteHeight} />
        <Divider />
        <DetailField label="Email address" value={details.email} accessibilityLabel="Edit email address" onEdit={openEditEmailModal} busy={opening === "email"} error={openError?.field === "email" ? openError.text : null} />
        <Divider />
        <DetailField label="Phone number" value={details.phone} accessibilityLabel="Edit phone number" onEdit={openEditPhoneModal} busy={opening === "phone"} error={openError?.field === "phone" ? openError.text : null} />
        <Divider />
        <DetailField label="Password" value={details.password} accessibilityLabel="Edit password" onEdit={openEditPasswordModal} />
        <Divider />

        {/* Centred danger text (the frames keep it above the Update button too). */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Delete my account"
          onPress={() => setDeleteAccountModal(true)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minHeight: DELETE_ROW,
            paddingHorizontal: SCREEN_GUTTER,
          }}
        >
          <TrashIcon size={18} color={color.dangerStrong} />
          <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} style={{ color: color.dangerStrong }}>
            Delete my account
          </Text>
        </TouchableOpacity>

        {selectedImage ? (
          <SheetFooter primary={{ label: "Update profile picture", onPress: () => void handleProfileUpdate(), loading }} />
        ) : null}
      </CustomBottomSheetModal>}

      {/* Profile Picture Sheet (2096:28005) */}
      <CustomBottomSheetModal
        snapPoints={[fit(SHEET_HEADER + 200)]}
        ref={profileImageSheetRef}
        isDark={isDark}
      >
        <SheetHeader title="Profile picture" grabber={false} onClose={() => profileImageSheetRef.current?.close()} />
        <View style={{ flexDirection: "row", gap: 12, paddingTop: 8, paddingBottom: 24, paddingHorizontal: SCREEN_GUTTER }}>
          {[
            { label: "Choose from gallery", Icon: PhotoIcon, onPress: pickImageFromGallery },
            { label: "Take a photo", Icon: CameraIcon, onPress: takePhoto },
          ].map(({ label, Icon, onPress }) => (
            <TouchableOpacity
              key={label}
              accessibilityRole="button"
              onPress={onPress}
              style={{
                flex: 1,
                height: 168,
                borderRadius: radius.input,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: color.line,
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <Icon size={24} color={color.textDim} />
              <Text fontSize="text-sm" fontWeight="font-medium" lineHeight={20} tone="body" style={{ textAlign: "center" }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </CustomBottomSheetModal>

      {/* Full Name Modal (2096:28081): the field has no label. */}
      <CustomBottomSheetModal
        ref={editNameModalRef}
        snapPoints={[fit(nameHeight)]}
        isDark={isDarkMode}
      >
        <SheetHeader title="Full name" grabber={false} onClose={() => editNameModalRef.current?.close()} />
        <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: FIELD_GAP_BACK }}>
          <TextField
            value={updatedName}
            onChangeText={(text) => {
              setUpdatedName(text);
              setNameError("");
            }}
            accessibilityLabel="Full name"
            placeholder="Enter your full name"
            error={nameError || undefined}
          />
        </View>
        <SheetFooter primary={{ label: "Save", onPress: () => void handleSaveName(), loading }} />
      </CustomBottomSheetModal>

      {/* Email Modal (2096:30599, then the code, 30681) */}
      <CustomBottomSheetModal
        ref={editEmailModalRef}
        snapPoints={[fit(emailHeight)]}
        isDark={isDarkMode}
      >
        <SheetHeader title="Edit email address" grabber={false} onClose={() => editEmailModalRef.current?.close()} />
        {!isOtpSent ? (
          <>
            <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: FIELD_GAP_BACK }}>
              <TextField
                label="New email address"
                value={updatedEmail}
                onChangeText={setUpdatedEmail}
                editable={!loading}
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                autoCorrect={false}
                placeholder="Enter your new email"
                keyboardType="email-address"
                error={emailError || undefined}
              />
            </View>
            <SheetFooter primary={{ label: "Verify", onPress: () => void handleSendOtp(), loading: isEmailBusy, disabled: isEmailBusy }} />
          </>
        ) : (
          <>
            <CodeStep
              onCode={setVerificationCode}
              wrong={isIncorrect}
              error={emailError}
              onResend={() => void handleSendOtp()}
              resendDisabled={isEmailBusy}
            />
            <SheetFooter primary={{ label: "Done", onPress: () => void handleSubmitOtp(), loading: isEmailBusy, disabled: isEmailBusy }} />
          </>
        )}
      </CustomBottomSheetModal>

      {/* The code to the number the account has now, before a new one is taken (decision T-14). */}
      <UnlockSheet
        ref={unlockSheet}
        layout="sheet"
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

      {/* Phone Modal (2096:30773, then the code, 30862) */}
      <CustomBottomSheetModal
        ref={editPhoneModalRef}
        snapPoints={[fit(phoneHeight)]}
        isDark={isDarkMode}
      >
        <SheetHeader title="Edit phone number" grabber={false} onClose={closePhoneSheet} />
        {!isMobileOtpSent ? (
          <>
            <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: FIELD_GAP_BACK }}>
              {/* The country trigger (100×48: "IN", "+91", a mini chevron) and the number field beside it. */}
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                <CountryPicker
                  {...(isDark && { theme: DARK_THEME })}
                  withFlag
                  withCallingCode
                  renderFlagButton={({ onOpen }) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Country code, +${country.callingCode}`}
                      onPress={onOpen}
                      style={{
                        width: 100,
                        height: 48,
                        borderRadius: radius.input,
                        borderWidth: 1,
                        borderColor: color.line,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <Text fontSize="text-xs" fontWeight="font-semibold" lineHeight={16} tone="dim">
                        {country.cca2}
                      </Text>
                      <Text fontSize="text-md" lineHeight={24}>
                        {`+${country.callingCode}`}
                      </Text>
                      <ChevronDownIcon size={16} color={color.textDim} />
                    </Pressable>
                  )}
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
                <View style={{ flex: 1 }}>
                  <TextField
                    maxLength={10}
                    accessibilityLabel="Phone number"
                    placeholder="Enter phone number"
                    value={updatedPhone}
                    onChangeText={setUpdatedPhone}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              {phoneOtpError ? <FieldError>{phoneOtpError}</FieldError> : null}
            </View>
            <SheetFooter primary={{ label: "Verify", onPress: () => void handleSendOtpToMobile(), loading: isPhoneOtpLoading }} />
          </>
        ) : (
          <>
            <CodeStep
              onCode={setMobileOtpVerificationCode}
              wrong={isIncorrect}
              error={phoneOtpError}
              onResend={() => void handleSendOtpToMobile()}
              resendDisabled={isPhoneOtpLoading}
            />
            <SheetFooter primary={{ label: "Done", onPress: () => void handleSubmitOtpForMobile(), loading: isSavingPhone }} />
          </>
        )}
      </CustomBottomSheetModal>

      {/* Password Modal (2096:30954) */}
      <CustomBottomSheetModal
        ref={editPasswordModalRef}
        snapPoints={[fit(passwordHeight)]}
        isDark={isDarkMode}
      >
        <SheetHeader title="Edit password" grabber={false} onClose={() => editPasswordModalRef.current?.close()} />
        <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 8 }}>
          {[
            {
              label: "Current password",
              value: updatedPassword,
              onChange: setUpdatedPassword,
              shown: showPassword,
              toggle: () => setShowPassword(!showPassword),
              textContentType: "password" as const,
              autoComplete: "current-password" as const,
              placeholder: "Enter your current password",
            },
            {
              label: "New password",
              value: newPassword,
              onChange: handleNewPasswordChange,
              shown: showNewPassoword,
              toggle: () => setShowNewPassword(!showNewPassoword),
              textContentType: "newPassword" as const,
              autoComplete: "new-password" as const,
              placeholder: "Enter your new password",
            },
          ].map((field) => (
            // 16 between the two 76 fields (the TextField keeps its own form gap below it).
            <View key={field.label} style={{ marginBottom: 16 - density.fieldGap }}>
              <TextField
                label={field.label}
                secureTextEntry={!field.shown}
                value={field.value}
                onChangeText={field.onChange}
                textContentType={field.textContentType}
                autoComplete={field.autoComplete}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={field.placeholder}
                // Room for the eye, so the dots never run under it.
                style={{ paddingRight: 16 + 20 + 12 }}
              />
              {/* The eye sits over the field: 20pt, 16 in from its right edge, centred on the 48 box under the label. */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Show or hide password"
                hitSlop={12}
                onPress={field.toggle}
                style={{ position: "absolute", right: 16, top: 42 }}
              >
                {field.shown ? <EyeSlashIcon size={20} color={color.textDim} /> : <EyeIcon size={20} color={color.textDim} />}
              </TouchableOpacity>
            </View>
          ))}

          {/* Every rule, met or not, while the new password misses one. */}
          {passwordErrors.length > 0 && (
            <View style={{ marginBottom: 16, gap: 8 }}>
              <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20}>
                Your password must include:
              </Text>
              {PASSWORD_RULE_LIST.map((rule) => {
                const met = rule.test(newPassword);
                return (
                  <View key={rule.text} style={{ flexDirection: "row", gap: 8 }} accessibilityLabel={`${met ? "Met" : "Not met"}: ${rule.text}`} accessible>
                    <View style={{ paddingTop: 2 }}>
                      {met ? <CheckIcon size={16} color={color.success} /> : <ExclamationCircleIcon size={16} color={color.textDim} />}
                    </View>
                    <Text fontSize="text-sm" lineHeight={20} tone={met ? "body" : "dim"} style={{ flex: 1 }}>
                      {rule.text}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
        <SheetFooter primary={{ label: "Verify & change", onPress: handleSavePassword }} />
      </CustomBottomSheetModal>
    </>
  );
};
export default PersonalDetailsSheet;
