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
import { useProfile } from "@/backend/profile";
import axiosInstance from "@/lib/networkUtils";

export function useOAuth() {
  const [loading, setLoading] = useState(false);
  const { setAuthTokens } = useGlobalContext();
  const router = useTypedNavigation();
  // const { getUser, saveUser } = useAuthContext();
  const { getMyDetails } = useProfile();

  const googleSignIn = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      const { data: userInfo } = await GoogleSignin.signIn().catch(err => {
      });

      if (userInfo?.idToken) {
        try {
          const res = await axios.post<AuthTokens>(GOOGLE_SIGN_IN_ENDPOINT, {
            access_token: userInfo.idToken,
          });


          if (res.data.access_token && res.data.refresh_token) {
            axiosInstance.defaults.headers.Authorization = `Bearer ${res.data.access_token}`;
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

      if (credential.identityToken) {
        const res = await axiosInstance.post<AuthTokens>(APPLE_SIGN_IN_ENDPOINT, {
          data: {
            identityToken: credential.identityToken,
          },
        });

        if (res.data.access_token !== null && res.data.refresh_token !== null) {
          axiosInstance.defaults.headers.Authorization = `Bearer ${res.data.access_token}`;
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
      }
    } catch (e: any) {
      if (e.code === "ERR_REQUEST_CANCELED") {
      } else {
        // handle other errors
      }
    } finally {
      setLoading(false);
    }
  };

  return { googleSignIn, loading, appleSignIn };
}
