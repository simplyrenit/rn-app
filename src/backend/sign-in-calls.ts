import {
  APPLE_SIGN_IN_ENDPOINT,
  GOOGLE_SIGN_IN_ENDPOINT,
  LOGIN,
  OTP,
  PHONE_LOGIN,
  SIGN_UP,
} from "@/lib/config";
import { getDeviceInfo } from "@/lib/device";
import { signInIntent } from "@/lib/return-to";
import axiosInstance from "@/lib/networkUtils";
import { AuthTokens, OTPResponse, PhoneVerificationResponse } from "@/lib/types";
import axios from "axios";

/**
 * The six calls that sign a person in, in one place (API-CONTRACT OE-B, signing in).
 *
 * Every one of them says which phone it is (`device_id`, `device_name`,
 * `platform`): the server makes a session per device, lists the devices, refuses a
 * booking between two accounts on one device, and treats a session with no
 * platform as unknown, which fails closed on the fresh-code rule. The email-code
 * check is a GET, so its fields travel as query parameters; the other five are
 * POSTs and carry them in the body. They live together so a seventh cannot be
 * added without them, and so one test can pin all six. A sign-in asked for by
 * Add to cart also says so (`intent`, cart plan D50).
 */

/** The fields every sign-in call carries beside its own. */
async function signInFields() {
  return { ...(await getDeviceInfo()), ...signInIntent() };
}

/** `GET /api/otp/`: the email code, which also signs an existing account in. */
export async function otpCheck(email: string, otp: string) {
  return axios.get<OTPResponse>(OTP, {
    params: { email, otp, ...(await signInFields()) },
  });
}

/** `POST /api/phone-login/`: a Firebase phone ID token. */
export async function phoneLogin(idToken: string) {
  return axios.post<PhoneVerificationResponse>(PHONE_LOGIN, {
    id_token: idToken,
    ...(await signInFields()),
  });
}

/** `POST /api/login/`: email and password. */
export async function emailLogin(email: string, password: string) {
  return axios.post<AuthTokens>(LOGIN, { email, password, ...(await signInFields()) });
}

/** `POST /api/signup/`: a new account; `payload` is the sign-up body without the device fields. */
export async function signUp(payload: Record<string, unknown>) {
  return axios.post<AuthTokens>(SIGN_UP, { ...payload, ...(await signInFields()) });
}

/** `POST /api/google-login/`. */
export async function googleLogin(accessToken: string) {
  return axios.post<AuthTokens>(GOOGLE_SIGN_IN_ENDPOINT, {
    access_token: accessToken,
    ...(await signInFields()),
  });
}

/**
 * `POST /api/apple-login/`. The identity token sits under `data`, as the server
 * reads it; the device fields sit beside it at the top, where it reads those.
 */
export async function appleLogin(identityToken: string) {
  return axiosInstance.post<AuthTokens>(APPLE_SIGN_IN_ENDPOINT, {
    data: { identityToken },
    ...(await signInFields()),
  });
}
