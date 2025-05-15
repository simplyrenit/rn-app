import { useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import { styled } from "nativewind";
import React from "react";
import { Platform, TouchableOpacity, View } from "react-native";
import { Text } from "../core";
import { useGlobalContext } from "@/context/global-context";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { IOS_CLIENT_ID, WEB_CLIENT_ID } from "@/lib/config";
import { useOAuth } from "./oauth";
import * as Progress from "react-native-progress";

// GoogleSignin.configure({
//   webClientId: WEB_CLIENT_ID, // client ID of type WEB for your server. Required to get the `idToken` on the user object, and for offline access.
//   scopes: ["https://www.googleapis.com/auth/drive.readonly"], // what API you want to access on behalf of the user, default is email and profile
//   offlineAccess: true, // if you want to access Google API on behalf of the user FROM YOUR SERVER
//   forceCodeForRefreshToken: true, // [Android] related to `serverAuthCode`, read the docs link below *.
//   iosClientId: IOS_CLIENT_ID, // [iOS] if you want to specify the client ID of type iOS (otherwise, it is taken from GoogleService-Info.plist)
// });

const StyledView = styled(View);
const StyledImage = styled(Image);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface LoginOptionsProps {
  isDarkMode: boolean;
}

export function LoginOptions({ isDarkMode }: LoginOptionsProps): JSX.Element {
  const router = useTypedNavigation();
  const { setHasSeenWelcome, theme } = useGlobalContext();
  const { googleSignIn, appleSignIn, loading } = useOAuth();
  const isDark = theme === "dark";

  const onPress = () => {
    setHasSeenWelcome(true);
    // @ts-ignore
    router.replace("MainTabs");
  };

  return (
    <StyledView className="mb-8">
      <Text fontSize="text-md" className="text-center mb-4">
        Continue with
      </Text>
      <StyledView className="flex-row justify-center mb-4">
        <StyledTouchableOpacity
          onPress={async () => {
            await googleSignIn();
            router.navigate("MainTabs");
          }}
          className={`w-1/4 items-center border rounded-lg py-3 px-6 mx-2 ${
            isDark
              ? "bg-[#1A1A1A] border-[#292929]"
              : "bg-white border-[#e6e6e6]"
          }`}
        >
          {loading ? (
            <Progress.CircleSnail
              size={22}
              color={isDark ? "white" : "black"}
            />
          ) : (
            <StyledImage
              className="h-6 w-6"
              source={require("../../../assets/auth/google-icon.png")}
            />
          )}
        </StyledTouchableOpacity>

        {Platform.OS === "ios" && (
          <StyledTouchableOpacity
            onPress={appleSignIn}
            className={`w-1/4 items-center border rounded-lg py-3 px-6 mx-2 ${
              isDark
                ? "bg-[#1A1A1A] border-[#292929]"
                : "bg-white border-[#e6e6e6]"
            }`}
          >
            {loading ? (
              <Progress.CircleSnail
                size={22}
                color={isDark ? "white" : "black"}
              />
            ) : (
              <StyledImage
                className="h-6 w-6"
                source={
                  isDarkMode
                    ? require("../../../assets/auth/apple-icon.png")
                    : require("../../../assets/auth/apple-icon-dark.png")
                }
              />
            )}
          </StyledTouchableOpacity>
        )}

        <StyledTouchableOpacity
          onPress={() => router.navigate("Email")}
          className={`w-1/4 items-center border rounded-lg py-3 px-6 mx-2 ${
            isDark
              ? "bg-[#1A1A1A] border-[#292929]"
              : "bg-white border-[#e6e6e6]"
          }`}
        >
          <StyledImage
            className="h-6 w-6"
            source={require("../../../assets/auth/mail-icon.png")}
            contentFit="contain"
          />
        </StyledTouchableOpacity>
      </StyledView>
      <StyledTouchableOpacity onPress={onPress}>
        <Text
          fontSize="text-base"
          fontWeight="font-bold"
          className="text-center text-[#4B46B4]"
        >
          Skip
        </Text>
      </StyledTouchableOpacity>
    </StyledView>
  );
}
