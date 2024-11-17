import { Text } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import { styled } from "nativewind";
import React from "react";
import { Platform, TouchableOpacity, View } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { IOS_CLIENT_ID, WEB_CLIENT_ID } from "@/lib/config";
import { useOAuth } from "@/components/auth/oauth";
import * as Progress from "react-native-progress";

GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID, // client ID of type WEB for your server. Required to get the `idToken` on the user object, and for offline access.
  scopes: ["https://www.googleapis.com/auth/drive.readonly"], // what API you want to access on behalf of the user, default is email and profile
  offlineAccess: true, // if you want to access Google API on behalf of the user FROM YOUR SERVER
  forceCodeForRefreshToken: true, // [Android] related to `serverAuthCode`, read the docs link below *.
  iosClientId: IOS_CLIENT_ID, // [iOS] if you want to specify the client ID of type iOS (otherwise, it is taken from GoogleService-Info.plist)
});

interface ProfilePreAuthProps {
  isDarkMode: boolean;
}
const StyledView = styled(View);
const StyledImage = styled(Image);
const StyledTouchableOpacity = styled(TouchableOpacity);

const ProfilePreAuth: React.FC<ProfilePreAuthProps> = ({ isDarkMode }) => {
  const router = useTypedNavigation();
  const { theme } = useGlobalContext();
  const { googleSignIn, loading, appleSignIn } = useOAuth();
  const isDark = theme === "dark";
  return (
    <>
      <View className="px-4 flex-1 justify-end">
        <View className="justify-center items-center">
          <Text> Enjoy Renit to the fullest...</Text>
        </View>

        <StyledView className=" gap-3 justify-center py-5">
          <StyledTouchableOpacity
            onPress={googleSignIn}
            className={`flex-row justify-center gap-1 items-center ${
              isDark
                ? "bg-[#1A1A1A] border-[#292929]"
                : "bg-white border-[#e6e6e6]"
            } border rounded-lg py-3 px-6 mx-2`}
          >
            {loading ? (
              <Progress.CircleSnail
                size={22}
                color={isDark ? "white" : "black"}
              />
            ) : (
              <>
                <View>
                  <StyledImage
                    className="h-6 w-6"
                    source={require("../../../../assets/auth/google-icon.png")}
                  />
                </View>
                <View>
                  <Text fontWeight="font-bold" className="ml-1">
                    Continue with Google
                  </Text>
                </View>
              </>
            )}
          </StyledTouchableOpacity>

          {Platform.OS === "ios" && (
            <StyledTouchableOpacity
              onPress={appleSignIn}
              className={`flex-row justify-center gap-1 items-center ${
                isDark
                  ? "bg-[#1A1A1A] border-[#292929]"
                  : "bg-white border-[#e6e6e6]"
              } border rounded-lg py-3 px-6 mx-2`}
            >
              {loading ? (
                <Progress.CircleSnail
                  size={22}
                  color={isDark ? "white" : "black"}
                />
              ) : (
                <>
                  <View>
                    <StyledImage
                      className="h-6 w-6"
                      source={
                        isDarkMode
                          ? require("../../../../assets/auth/apple-icon.png")
                          : require("../../../../assets/auth/apple-icon-dark.png")
                      }
                    />
                  </View>
                  <View>
                    <Text fontWeight="font-bold" className="ml-1">
                      Continue with Apple
                    </Text>
                  </View>
                </>
              )}
            </StyledTouchableOpacity>
          )}

          <StyledTouchableOpacity
            onPress={() => router.navigate("Email")}
            className={`flex-row justify-center gap-1 items-center ${
              isDark
                ? "bg-[#1A1A1A] border-[#292929]"
                : "bg-white border-[#e6e6e6]"
            } border rounded-lg py-3 px-6 mx-2`}
          >
            <View>
              <StyledImage
                className="h-6 w-6"
                source={require("../../../../assets/auth/mail-icon.png")}
                contentFit="contain"
              />
            </View>
            <View>
              <Text fontWeight="font-bold" className="ml-1">
                Continue with Email
              </Text>
            </View>
          </StyledTouchableOpacity>
        </StyledView>
      </View>
    </>
  );
};

export default ProfilePreAuth;
