import { useAuthContext } from "@/context/auth-context";
import { useGlobalContext } from "@/context/global-context";
import { LOGIN, OTP, PHONE_LOGIN, SIGN_UP } from "@/lib/config";
import { initializeAppCheck } from "@/lib/firebase";
import {
  AuthTokens,
  AuthUser,
  OTPResponse,
  PhoneVerificationResponse,
} from "@/lib/types";
import axios from "axios";
import { useState } from "react";

let phoneConfirmation: any | null = null;

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
  const { user } = useAuthContext();
  const { setAuthTokens } = useGlobalContext();

  const toRequestError = (error: any, fallbackMessage: string): SignUpError => {
    if (error?.response) {
      return {
        status: error.response.status,
        code: error.response.data?.code,
        message:
          error.response.data?.error ||
          error.response.data?.message ||
          fallbackMessage,
      };
    }

    return {
      message: error?.message || fallbackMessage,
    };
  };

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
      const response = await axios.get<OTPResponse>(OTP, {
        params: { email, otp },
      });
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
      const response = await axios.post<PhoneVerificationResponse>(PHONE_LOGIN, {
        id_token: idToken,
      });
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
      const signupPayload = {
        email: mergedUser.email,
        first_name: mergedUser.first_name,
        last_name: mergedUser.last_name,
        password: mergedUser.password,
        phone: mergedUser.phone,
        country: mergedUser.country,
        account_type: accountType,
        business_name:
          accountType === "merchant" ? mergedUser.business_name : undefined,
        coordinates: mergedUser.coordinates,
        date_of_birth: mergedUser.date_of_birth,
        email_verified: mergedUser.email_verified,
      };
      const payload = Object.fromEntries(
        Object.entries(signupPayload).filter(
          ([, value]) => value !== undefined && value !== null && value !== ""
        )
      );

      const response: { data: AuthTokens } = await axios.post(SIGN_UP, payload);
      setAuthTokens(response.data);

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
      const response: { data: AuthTokens } = await axios.post(LOGIN, {
        email,
        password,
      });
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
    // signInWithGoogle
  };
}
