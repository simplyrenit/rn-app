import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import axios from "axios";
import { useState } from "react";
import {
  APPLE_SIGN_IN_ENDPOINT,
  GOOGLE_SIGN_IN_ENDPOINT,
} from "@/lib/config";
import { useGlobalContext } from "@/context/global-context";
import { AuthTokens, useTypedNavigation } from "@/lib/types";
import * as AppleAuthentication from "expo-apple-authentication";
import { useProfile } from "@/backend/profile";
import axiosInstance from "@/lib/networkUtils";

/** Which provider is mid-sign-in, or null. */
export type OAuthProvider = "google" | "apple";

export function useOAuth() {
  // One shared flag put a spinner on both provider buttons at once, so the
  // customer lost track of which one they had chosen.
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null
  );
  const loading = pendingProvider !== null;
  const { setAuthTokens } = useGlobalContext();
  const router = useTypedNavigation();
  // const { getUser, saveUser } = useAuthContext();
  const { getMyDetails } = useProfile();

  const googleSignIn = async () => {
    if (pendingProvider) return;
    setPendingProvider("google");
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      await GoogleSignin.signOut();
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) {
        return;
      }
      const userInfo = response.data;
      const googleToken = userInfo?.idToken || (await GoogleSignin.getTokens()).accessToken;

      if (googleToken) {
        try {
          const res = await axios.post<AuthTokens>(GOOGLE_SIGN_IN_ENDPOINT, {
            access_token: googleToken,
          });


          if (res.data.access_token && res.data.refresh_token) {
            axiosInstance.defaults.headers.Authorization = `Bearer ${res.data.access_token}`;
            setAuthTokens(res.data);
            await getMyDetails(res.data.access_token);
            router.navigate("MainTabs");
            return;
          }
        } catch (backendError) {
        }
      }
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      } else if (error.code === statusCodes.IN_PROGRESS) {
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      } else {
        console.error("Other error:", error);
      }
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

      if (credential.identityToken) {
        const res = await axiosInstance.post<AuthTokens>(APPLE_SIGN_IN_ENDPOINT, {
          data: {
            identityToken: credential.identityToken,
          },
        });

        if (res.data.access_token !== null && res.data.refresh_token !== null) {
          axiosInstance.defaults.headers.Authorization = `Bearer ${res.data.access_token}`;
          setAuthTokens(res.data);
          await getMyDetails(res.data.access_token);
          router.navigate("MainTabs");
          return;
        }
      } else {
      }
    } catch (e: any) {
      if (e.code === "ERR_REQUEST_CANCELED") {
      } else {
        // handle other errors
      }
    } finally {
      setPendingProvider(null);
    }
  };

  return { googleSignIn, loading, appleSignIn, pendingProvider };
}
