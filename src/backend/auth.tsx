import { useAuthContext } from "@/context/auth-context";
import { useGlobalContext } from "@/context/global-context";
import { GOOGLE_SIGN_IN_ENDPOINT, LOGIN, OTP, SIGN_UP } from "@/lib/config";
import { AuthTokens, OTPResponse } from "@/lib/types";
import axios from "axios";
import { useState } from "react";

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuthContext();
  const { setAuthTokens } = useGlobalContext();

  async function sendOTP(email: string) {
    setLoading(true);
    try {
      const response = await axios.post(`${OTP}?email=${email}`, { email });
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOTP(email: string, otp: string): Promise<OTPResponse> {
    setLoading(true);
    try {
      const response = await axios.get<OTPResponse>(
        `${OTP}?email=${email}&otp=${otp}`
      );
      console.log(`${OTP}?email=${email}&otp=${otp}`);
      console.log(response.data, "response.data");

      return response.data;
    } catch (error: any) {
      console.error(JSON.stringify(error));
    } finally {
      setLoading(false);
    }

    return {
      access: null,
      refresh: null,
      is_verified: false,
      message: "",
    };
  }

  async function signUpUser(): Promise<AuthTokens | null> {
    setLoading(true);
    try {
      console.log("USER", user);
      const response: { data: AuthTokens } = await axios.post(SIGN_UP, user);
      setAuthTokens(response.data);

      return response.data;
    } catch (error: any) {
      console.error("SIGN UP ERROR", error.response.data);
    } finally {
      setLoading(false);
    }

    return null;
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
      if (error.response) {
        console.error("LOGIN ERROR", error.response.data);
      } else {
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
    // signInWithGoogle
  };
}
