import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import axios from "axios";
import { useState } from "react";
import { GOOGLE_SIGN_IN_ENDPOINT } from "@/lib/config";
import { useGlobalContext } from "@/context/global-context";
import { AuthTokens, useTypedNavigation } from "@/lib/types";
import * as AppleAuthentication from "expo-apple-authentication";

export function useOAuth() {
  const [loading, setLoading] = useState(false);
  const { setAuthTokens } = useGlobalContext();
  const router = useTypedNavigation();

  const googleSignIn = async () => {
    setLoading(true);
    try {
      console.log("checking play services");
      await GoogleSignin.hasPlayServices();
      console.log("signing in");
      const response = await GoogleSignin.signIn();
      console.log("response", response);
      if (isSuccessResponse(response)) {
        const res = await axios.post<AuthTokens>(GOOGLE_SIGN_IN_ENDPOINT, {
          access_token: response.data.idToken,
        });

        if (res.data.access_token !== null && res.data.refresh_token !== null) {
          setAuthTokens(res.data);
          //   router.navigate("MainTabs");
          return;
        }
      } else {
        console.log("sign in was cancelled by user");
      }
    } catch (error: any) {
      console.log("error", error);
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.IN_PROGRESS:
            // operation (eg. sign in) already in progress
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            // Android only, play services not available or outdated
            break;
          default:
          // some other error happened
        }
      } else {
        // an error that's not related to google sign in occurred
        console.log("error", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const appleSignIn = async () => {
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log("credential", credential);
      // signed in
    } catch (e: any) {
      if (e.code === "ERR_REQUEST_CANCELED") {
        console.log("user cancelled");
      } else {
        // handle other errors
        console.log("ERROR", e);
      }
    } finally {
      setLoading(false);
    }
  };

  return { googleSignIn, loading, appleSignIn };
}
