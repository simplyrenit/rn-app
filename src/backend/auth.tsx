import { useAuthContext } from "@/context/auth-context";
import { useGlobalContext } from "@/context/global-context";
import { DEV_MODE, OTP } from "@/lib/config";
import { getAuthTokens } from "@/lib/auth-fns";
import { acceptOwnerTerms } from "@/backend/terms";
import { emailLogin, otpCheck, phoneLogin, signUp } from "@/backend/sign-in-calls";
import { requestErrorFrom, signUpBody } from "@/lib/sign-in-proof";
import {
  authenticateFirebase,
  initializeAppCheck,
  setPhoneReauthInProgress,
  signOutFirebase,
} from "@/lib/firebase";
import {
  AuthTokens,
  AuthUser,
  OTPResponse,
  PhoneVerificationResponse,
} from "@/lib/types";
import axios from "axios";
import { useState } from "react";

let phoneConfirmation: any | null = null;
// Kept separate from phoneConfirmation (the login flow's) so a profile phone
// change and a login can never clobber each other's confirmation handle.
let phoneChangeConfirmation: any | null = null;

const getFirebaseAuth = () => {
  const { getAuth } = require("@react-native-firebase/auth");
  return getAuth();
};

export interface SignUpError {
  status?: number;
  code?: string;
  message: string;
}

export interface OTPResponseMessage {
  message: string;
}

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const { user, clearUser } = useAuthContext();
  const { setAuthTokens } = useGlobalContext();

  // A call made too often (429) says "Too many tries. Wait a few minutes." and is never repeated by itself (T-19).
  const toRequestError = (error: any, fallbackMessage: string): SignUpError => requestErrorFrom(error, fallbackMessage);

  async function sendOTP(email: string): Promise<OTPResponseMessage> {
    setLoading(true);
    try {
      const response = await axios.post<OTPResponseMessage>(OTP, { email });
      return response.data;
    } catch (error: any) {
      const otpError = toRequestError(
        error,
        "Unable to send OTP right now. Please try again."
      );
      console.error("SEND OTP ERROR", otpError);
      throw otpError;
    } finally {
      setLoading(false);
    }
  }

  async function verifyOTP(email: string, otp: string): Promise<OTPResponse> {
    setLoading(true);
    try {
      // Signs an existing account in too, so it says which phone it is (ENG-146).
      const response = await otpCheck(email, otp);
      return response.data;
    } catch (error: any) {
      throw toRequestError(
        error,
        "Unable to verify OTP right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // Phone-number verification for the already-signed-in user, on the DEFAULT
  // Firebase app. It has to be the default app: that is the one the auto-captured
  // APNs token is attached to, and iOS phone auth needs it for real numbers.
  // signInWithPhoneNumber() only sends the SMS — it does NOT touch
  // auth.currentUser, so the custom-token chat session survives this call. Only
  // confirm() (below) swaps the user, and that is restored immediately.
  async function requestPhoneNumberChangeOtp(phone: string): Promise<void> {
    setLoading(true);
    try {
      try {
        await initializeAppCheck();
      } catch (appCheckError) {
        console.warn(
          "App Check init failed before phone-change OTP",
          appCheckError
        );
      }
      const auth = getFirebaseAuth();
      // QA/dev builds: skip APNs/reCAPTCHA app verification. Pairs with Firebase
      // Console test phone numbers; for a real number it just sends real SMS.
      // Never on for PROD. The setter fires a native call it does not await, so
      // await the native module directly to avoid racing signInWithPhoneNumber.
      if (__DEV__ || DEV_MODE === "QA") {
        auth.settings.appVerificationDisabledForTesting = true;
        try {
          await auth.native.setAppVerificationDisabledForTesting(true);
        } catch (settingError) {
          console.warn(
            "Could not confirm appVerificationDisabledForTesting",
            settingError
          );
        }
      }
      phoneChangeConfirmation = await auth.signInWithPhoneNumber(phone);
    } catch (error: any) {
      throw toRequestError(
        error,
        "Unable to send a verification code right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // Confirm the OTP. Unlike verifyPhoneOTP (the login variant) this never calls
  // PHONE_LOGIN — it only proves the user controls the number so the caller can
  // PATCH the profile, or unlock the bank account (ENG-135). Throws on an invalid
  // or expired code. Resolves the Firebase ID token the confirmation made, which
  // is what `POST /api/access/unlock/` wants; the profile sheet ignores it.
  async function verifyPhoneNumberChange(otp: string): Promise<string> {
    setLoading(true);
    try {
      if (!phoneChangeConfirmation) {
        throw new Error("Request a new verification code and try again.");
      }
      // confirm() signs in as the phone identity, replacing the custom-token
      // session chat/Firestore rely on. Flag the window so the chat listener
      // stays quiet, then re-mint the real session right after.
      setPhoneReauthInProgress(true);
      let confirmed = false;
      let idToken = "";
      try {
        const credential = await phoneChangeConfirmation.confirm(otp);
        phoneChangeConfirmation = null;
        confirmed = true;
        // Read before the phone identity is signed out again below.
        idToken = (await credential?.user?.getIdToken?.()) ?? "";
      } finally {
        if (confirmed) {
          try {
            await signOutFirebase();
            const accessToken = (await getAuthTokens())?.access_token;
            if (accessToken) {
              await authenticateFirebase(accessToken);
            }
          } catch (restoreError) {
            console.warn(
              "Failed to restore Firebase session after phone change",
              restoreError
            );
          }
        }
        setPhoneReauthInProgress(false);
      }
      return idToken;
    } catch (error: any) {
      throw toRequestError(
        error,
        "Unable to verify the code right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function sendPhoneOTP(phone: string) {
    setLoading(true);
    try {
      // Phone sign-in happens before the user has an access token, so it never
      // passes through authenticateFirebase() — the only other place App Check
      // gets initialized. Without a token here Firebase rejects the OTP send.
      // A failure to initialize must not block the attempt, though: sending the
      // code may still succeed where App Check is not enforced.
      try {
        await initializeAppCheck();
      } catch (appCheckError) {
        console.warn("App Check initialization failed before OTP send", appCheckError);
      }
      const auth = getFirebaseAuth();
      // QA/dev builds have no APNs or reCAPTCHA app-verification wired; this flag
      // plus a Firebase Console test phone number skips it. Never on for PROD —
      // real verification stays on there.
      if (__DEV__ || DEV_MODE === "QA") {
        auth.settings.appVerificationDisabledForTesting = true;
      }
      if (auth.currentUser) {
        await auth.signOut();
      }
      phoneConfirmation = await auth.signInWithPhoneNumber(phone);
    } catch (error: any) {
      throw toRequestError(
        error,
        "Unable to send a verification code right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyPhoneOTP(
    otp: string
  ): Promise<PhoneVerificationResponse> {
    setLoading(true);
    try {
      if (!phoneConfirmation) {
        throw new Error("Request a new verification code and try again.");
      }
      const credential = await phoneConfirmation.confirm(otp);
      phoneConfirmation = null;
      const idToken = await credential.user.getIdToken();
      const response = await phoneLogin(idToken);
      return response.data;
    } catch (error: any) {
      throw toRequestError(
        error,
        "Unable to verify the code right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function signUpUser(
    overrides?: Partial<AuthUser>
  ): Promise<AuthTokens> {
    setLoading(true);
    try {
      const mergedUser = { ...(user ?? {}), ...(overrides ?? {}) };
      const accountType = mergedUser.account_type ?? "user";
      // The proof token of the emailed code or the phone check goes with it (T-19): without it the server answers
      // 403 `otp_verification_required`, which the sign-up screen turns into "verify again".
      const payload = signUpBody(mergedUser);

      const response: { data: AuthTokens } = await signUp(payload);
      setAuthTokens(response.data);
      // The sign-up is over: its details, the password and the proof token with them, are forgotten (T-19).
      clearUser();

      // The merchant ticked the owner terms on the About step (ENG-122), against
      // the page and the version that screen read before there was an account.
      // That kept version is what is recorded now that the tokens exist. Nothing
      // is recorded without a tick. If it does not land (the version moved on in
      // between, or no network) the sign-up still finishes, and the tick comes up
      // again at the start of the first listing with the page as it now stands.
      if (
        accountType === "merchant" &&
        mergedUser.owner_terms_accepted &&
        mergedUser.owner_terms_version
      ) {
        try {
          await acceptOwnerTerms(mergedUser.owner_terms_version, response.data.access_token);
        } catch (termsError) {
          console.warn("Owner terms acceptance after sign-up failed", termsError);
        }
      }

      return response.data;
    } catch (error: any) {
      const signUpError = toRequestError(error, "Unable to complete signup.");
      console.error("SIGN UP ERROR", signUpError);
      throw signUpError;
    } finally {
      setLoading(false);
    }
  }

  async function loginUser(
    email: string,
    password: string
  ): Promise<AuthTokens | null> {
    setLoading(true);
    try {
      const response: { data: AuthTokens } = await emailLogin(email, password);
      setAuthTokens(response.data);
      return response?.data;
    } catch (error: any) {
      if (!error.response || error.response.status >= 500) {
        console.error("LOGIN ERROR", error.message);
      }
    } finally {
      setLoading(false);
    }
    return null;
  }

  // export async function signInWithGoogle(idToken: string) {
  //   try {
  //     const response = await axios.post(
  //       ${GOOGLE_SIGN_IN_ENDPOINT}?access_token=${idToken}
  //     );
  //   } catch (error: any) {
  //     console.error(error);
  //   }
  // }

  return {
    signUpUser,
    loading,
    sendOTP,
    loginUser,
    verifyOTP,
    sendPhoneOTP,
    verifyPhoneOTP,
    requestPhoneNumberChangeOtp,
    verifyPhoneNumberChange,
    // signInWithGoogle
  };
}
