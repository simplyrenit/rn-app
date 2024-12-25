import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import axios from "axios";
import { useState } from "react";
import { APPLE_SIGN_IN_ENDPOINT, GOOGLE_SIGN_IN_ENDPOINT } from "@/lib/config";
import { useGlobalContext } from "@/context/global-context";
import { AuthTokens, useTypedNavigation } from "@/lib/types";
import * as AppleAuthentication from "expo-apple-authentication";
import { useAuthContext } from "@/context/auth-context";
import { useProfile } from "@/backend/profile";

export function useOAuth() {
  const [loading, setLoading] = useState(false);
  const { setAuthTokens, userDetails } = useGlobalContext();
  const router = useTypedNavigation();
  // const { getUser, saveUser } = useAuthContext();
  const { getMyDetails } = useProfile();

  const googleSignIn = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      const userInfo = await GoogleSignin.signIn();
      console.log("Google Sign-In Success:", userInfo);

      if (userInfo?.idToken) {
        try {
          const res = await axios.post<AuthTokens>(GOOGLE_SIGN_IN_ENDPOINT, {
            access_token: userInfo.idToken,
          });

          console.log("Backend Response:", res.data);

          if (res.data.access_token && res.data.refresh_token) {
            setAuthTokens(res.data);
            const user = await getMyDetails(res.data.access_token);
            if (!user?.first_name || !user?.last_name) {
              router.navigate("About");
            } else {
              router.navigate("MainTabs");
            }
            return;
          }
        } catch (backendError) {
          console.error("Backend Error:", backendError);
        }
      }
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log("User cancelled the login flow");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log("Operation in progress");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.log("Play services not available");
      } else {
        console.error("Other error:", error);
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
      if (credential.identityToken) {
        const res = await axios.post<AuthTokens>(APPLE_SIGN_IN_ENDPOINT, {
          data: {
            identityToken: credential.identityToken,
          },
        });

        if (res.data.access_token !== null && res.data.refresh_token !== null) {
          setAuthTokens(res.data);
          const user = await getMyDetails(res.data.access_token);
          if (
            user?.first_name === null ||
            user?.last_name === null ||
            user?.first_name === "" ||
            user?.last_name === ""
          ) {
            router.navigate("About");
          } else {
            router.navigate("MainTabs");
          }
          return;
        }
      } else {
        console.log("sign in was cancelled by user");
      }
    } catch (e: any) {
      console.log("error", e);
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
