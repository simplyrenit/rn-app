import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { useState } from "react";
import { appleLogin, googleLogin } from "@/backend/sign-in-calls";
import { useGlobalContext } from "@/context/global-context";
import { AuthTokens, useTypedNavigation } from "@/lib/types";
import { requestErrorFrom } from "@/lib/sign-in-proof";
import { toast } from "@/lib/toast";
import { goAfterSignIn } from "@/lib/return-to";
import * as AppleAuthentication from "expo-apple-authentication";
import { useProfile } from "@/backend/profile";
import axiosInstance from "@/lib/networkUtils";

/** Which provider is mid-sign-in, or null. */
export type OAuthProvider = "google" | "apple";

/** A name a provider handed over at sign-in (Apple only does so the first time the person allows the app). */
type GivenName = { first?: string | null; last?: string | null };

const PROVIDER_NAME: Record<OAuthProvider, string> = { google: "Google", apple: "Apple" };

export function useOAuth() {
  // One shared flag put a spinner on both provider buttons at once, so the
  // customer lost track of which one they had chosen.
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null
  );
  const loading = pendingProvider !== null;
  const { setAuthTokens } = useGlobalContext();
  const router = useTypedNavigation();
  const { getMyDetails, updateMyDetails } = useProfile();

  /** Failures used to be swallowed, so the button just stopped spinning. A cancel stays silent. */
  const failed = (provider: OAuthProvider, error: unknown) => {
    const { message } = requestErrorFrom(error as any, "");
    toast.error(`We couldn't sign you in with ${PROVIDER_NAME[provider]}`, {
      message: message || "Try again, or use your mobile number or email.",
    });
  };

  /**
   * The tokens are in: the account needs a name before the customer goes on. A name the provider gave is saved
   * straight away, because Apple gives it only once and a customer who leaves the name step would lose it for good.
   * The name step comes only when there is still none; it sits on the tabs, so Back from it is a signed-in Home.
   */
  const finish = async (tokens: AuthTokens, given: GivenName = {}) => {
    axiosInstance.defaults.headers.Authorization = `Bearer ${tokens.access_token}`;
    setAuthTokens(tokens);
    let me: Awaited<ReturnType<typeof getMyDetails>>;
    try {
      me = await getMyDetails(tokens.access_token);
    } catch {
      // Signed in all the same: the profile is read again on the tabs, and a missing name is asked for at booking.
      goAfterSignIn(router);
      return;
    }
    let first = me.first_name?.trim() ?? "";
    let last = me.last_name?.trim() ?? "";
    const givenFirst = given.first?.trim() ?? "";
    const givenLast = given.last?.trim() ?? "";
    if ((!first || !last) && (givenFirst || givenLast)) {
      const name = { first_name: first || givenFirst, last_name: last || givenLast };
      try {
        await updateMyDetails(me.username, name);
        first = name.first_name;
        last = name.last_name;
      } catch (saveError) {
        console.warn("Saving the provider's name failed; the name step asks for it", saveError);
      }
    }
    if (first && last) {
      goAfterSignIn(router);
      return;
    }
    router.reset({
      index: 1,
      routes: [
        { name: "MainTabs" },
        { name: "YourName", params: { username: me.username, firstName: first || givenFirst, lastName: last || givenLast } },
      ],
    });
  };

  const googleSignIn = async () => {
    if (pendingProvider) return;
    setPendingProvider("google");
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      await GoogleSignin.signOut();
      const response = await GoogleSignin.signIn();
      // Not a success: the customer closed Google's sheet.
      if (!isSuccessResponse(response)) {
        return;
      }
      const userInfo = response.data;
      const googleToken = userInfo?.idToken || (await GoogleSignin.getTokens()).accessToken;
      if (!googleToken) throw new Error("Google didn't confirm the account.");
      const res = await googleLogin(googleToken);
      await finish(res.data, { first: userInfo?.user?.givenName, last: userInfo?.user?.familyName });
    } catch (error: any) {
      if (isErrorWithCode(error) && (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS)) {
        return;
      }
      console.error("Google Sign-In Error:", error);
      failed("google", error);
    } finally {
      setPendingProvider(null);
    }
  };

  const appleSignIn = async () => {
    if (pendingProvider) return;
    setPendingProvider("apple");
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error("Apple didn't confirm the account.");
      const res = await appleLogin(credential.identityToken);
      await finish(res.data, { first: credential.fullName?.givenName, last: credential.fullName?.familyName });
    } catch (e: any) {
      if (e?.code === "ERR_REQUEST_CANCELED") {
        return;
      }
      console.error("Apple Sign-In Error:", e);
      failed("apple", e);
    } finally {
      setPendingProvider(null);
    }
  };

  return { googleSignIn, loading, appleSignIn, pendingProvider };
}
