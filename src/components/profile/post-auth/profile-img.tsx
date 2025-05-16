import { MyDetails, useProfile } from "@/backend/profile";
import { Button, Text } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import Skeleton from "@/components/core/skeleton";
import { styled } from "nativewind";
import { useTypedNavigation } from "@/lib/types";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as Progress from "react-native-progress";
import { useOAuth } from "@/components/auth/oauth";
import { IOS_CLIENT_ID, WEB_CLIENT_ID } from "@/lib/config";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import { Platform, Image, TouchableOpacity, View } from "react-native";
import { PencilSquareIcon } from "react-native-heroicons/outline";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";

const StyledView = styled(View);
const StyledImage = styled(Image);
interface ProfileImgContainerProps {
  isDarkMode: boolean;
  handlePersonalDetailsSheetPress: () => void;
   isAuthenticated: boolean;  // Pass this prop
    handleLoginPress: () => void;  // Function to trigger login flow
}

const ProfileImgContainer: React.FC<ProfileImgContainerProps> = ({
  isDarkMode,
  handlePersonalDetailsSheetPress,
  isAuthenticated,
    handleLoginPress,
}) => {
  const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState<Partial<MyDetails> | null>(null); // Handle null state

  const defaultAvatar =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Default_pfp.svg/2048px-Default_pfp.svg.png";
const router = useTypedNavigation();
  const { getMyDetails } = useProfile();
  const { theme } = useGlobalContext();
    const { googleSignIn, appleSignIn } = useOAuth();
    const isDark = theme === "dark";
  const fetchDetails = async () => {
      try {
        setLoading(true);
        const userDetails = await getMyDetails();
        if (userDetails) {
          setDetails(userDetails);
        } else {
          console.warn("No user details found. Treating as unauthenticated.");
          setDetails(null);
        }
      } catch (error) {
        console.error("Failed to fetch user details:", error);
        setDetails(null);
      } finally {
        setLoading(false);
      }
    };


  useFocusEffect(
    useCallback(() => {
      fetchDetails();
    }, [handlePersonalDetailsSheetPress,isAuthenticated])
  );
     const showUnauthenticatedUI = !isAuthenticated || details === null;
//   return (
//     <View
//       style={{ paddingVertical: wp("6%") }}
//       className="flex-row justify-between items-center"
//     >
//       <View className="flex-row gap-3 items-center w-full">
//         {loading ? <Skeleton height={50} width={50} borderRadius={50} /> : <Image
//           source={{ uri: details.image?.image_url || defaultAvatar }}
//           style={{ width: wp("12%"), height: wp("12%") }}
//           className="rounded-full"
//         />}
//         <View className="w-[85%]">
//           <View className="flex flex-row items-center justify-between">
//             {loading ? <Skeleton height={10} width={60} borderRadius={20} /> : <Text
//               fontSize="text-base"
//               fontWeight="font-bold"
//               style={{ color: isDarkMode ? '#fff' : '#000' }}
//             >
//               {details.first_name + " " + details.last_name}
//             </Text>}
//             {loading ? <Skeleton height={10} width={10} borderRadius={8} /> : <TouchableOpacity onPress={handlePersonalDetailsSheetPress}>
//               <PencilSquareIcon
//                 size={21}
//                 color="#635BE8"
//               />
//             </TouchableOpacity>}
//           </View>
//           {loading ? <Skeleton height={10} width={100} borderRadius={20} className="mt-2" /> : <Text
//             className={`${isDarkMode ? "text-[#FFFFFFB2]" : "text-[#000000B2]"
//               } pt-1`}
//           >
//             {details.email}
//           </Text>}
//         </View>
//       </View>
//     </View>
//   );
//second approach
// return (
//   <View style={{ paddingVertical: wp("6%") }}>
//     <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
//       <View style={{ flexDirection: "row", gap: 3, alignItems: "center", width: "100%" }}>
//         {isAuthenticated ? (
//           <>
//             <Image
//               source={{ uri: defaultAvatar }}
//               style={{ width: wp("12%"), height: wp("12%") }}
//               className="rounded-full"
//             />
//             <View style={{ width: "85%" }}>
//               <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
//                 <Text style={{ fontSize: 16, fontWeight: "bold", color: isDarkMode ? "#fff" : "#000" }}>
//                   User's Name
//                 </Text>
//                 <TouchableOpacity onPress={handlePersonalDetailsSheetPress}>
//                   <PencilSquareIcon size={21} color="#635BE8" />
//                 </TouchableOpacity>
//               </View>
//               <Text style={{ color: isDarkMode ? "#FFFFFFB2" : "#000000B2", paddingTop: 4 }}>
//                 user.email@example.com
//               </Text>
//             </View>
//           </>
//
//         ) : (
//
//           <View style={{ justifyContent: "center", alignItems: "center" }}>
//             <Text>Enjoy Renit to the fullest...</Text>
//           </View>
//
//            </View>
//           </View>
//           </View>
//         <View style={{ gap: 3, justifyContent: "center", paddingVertical: wp("5%") }}>
//           <Button
//             onPress={googleSignIn}
//             style={{
//               flexDirection: "row",
//               justifyContent: "center",
//               gap: 1,
//               alignItems: "center",
//               backgroundColor: isDark ? "#1A1A1A" : "white",
//               borderColor: isDark ? "#292929" : "#e6e6e6",
//               borderWidth: 1,
//               borderRadius: 8,
//               paddingVertical: 12,
//               paddingHorizontal: 24,
//               marginHorizontal: 8,
//             }}
//           >
//             {loading ? (
//               <Progress.CircleSnail size={22} color={isDark ? "white" : "black"} />
//             ) : (
//               <>
//                 <View>
//                   <StyledImage
//                     style={{ height: 24, width: 24 }}
//                     source={require("../../../../assets/auth/google-icon.png")}
//                   />
//                 </View>
//                 <View>
//                   <Text style={{ fontWeight: "bold", marginLeft: 4, transform: [{ translateY: -2 }] }}>
//                     Continue with Google
//                   </Text>
//                 </View>
//               </>
//             )}
//           </Button>
//
//           {Platform.OS === "ios" && (
//             <Button
//               onPress={appleSignIn}
//               style={{
//                 flexDirection: "row",
//                 justifyContent: "center",
//                 gap: 1,
//                 alignItems: "center",
//                 backgroundColor: isDark ? "#1A1A1A" : "white",
//                 borderColor: isDark ? "#292929" : "#e6e6e6",
//                 borderWidth: 1,
//                 borderRadius: 8,
//                 paddingVertical: 12,
//                 paddingHorizontal: 24,
//                 marginHorizontal: 8,
//               }}
//             >
//               {loading ? (
//                 <Progress.CircleSnail size={22} color={isDark ? "white" : "black"} />
//               ) : (
//                 <>
//                   <View>
//                     <StyledImage
//                       style={{ height: 24, width: 24 }}
//                       source={
//                         isDarkMode
//                           ? require("../../../../assets/auth/apple-icon.png")
//                           : require("../../../../assets/auth/apple-icon-dark.png")
//                       }
//                     />
//                   </View>
//                   <View>
//                     <Text style={{ fontWeight: "bold", marginLeft: 4 }}>
//                       Continue with Apple
//                     </Text>
//                   </View>
//                 </>
//               )}
//             </Button>
//           )}
//
//           <Button
//             onPress={() => router.navigate("Email")}
//             style={{
//               flexDirection: "row",
//               justifyContent: "center",
//               gap: 1,
//               alignItems: "center",
//               backgroundColor: isDark ? "#1A1A1A" : "white",
//               borderColor: isDark ? "#292929" : "#e6e6e6",
//               borderWidth: 1,
//               borderRadius: 8,
//               paddingVertical: 12,
//               paddingHorizontal: 24,
//               marginHorizontal: 8,
//             }}
//           >
//             <View>
//               <StyledImage
//                 style={{ height: 24, width: 24 }}
//                 source={require("../../../../assets/auth/mail-icon.png")}
//                 contentFit="contain"
//               />
//             </View>
//             <View>
//               <Text style={{ fontWeight: "bold", marginLeft: 4, transform: [{ translateY: -2 }] }}>
//                 Continue with Email
//               </Text>
//             </View>
//           </Button>
//         </View>
// )}
// );
return (
    <View style={{ paddingVertical: wp("6%") }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", gap: 3, alignItems: "center", width: "100%" }}>
          {!showUnauthenticatedUI  ? (
            <>

                <View
                      style={{ paddingVertical: wp("6%") }}
                      className="flex-row justify-between items-center"
                    >
                      <View className="flex-row gap-3 items-center w-full">
                        {loading ? <Skeleton height={50} width={50} borderRadius={50} /> : <Image
                          source={{ uri: details.image?.image_url || defaultAvatar }}
                          style={{ width: wp("12%"), height: wp("12%") }}
                          className="rounded-full"
                        />}
                        <View className="w-[85%]">
                          <View className="flex flex-row items-center justify-between">
                            {loading ? <Skeleton height={10} width={60} borderRadius={20} /> : <Text
                              fontSize="text-base"
                              fontWeight="font-bold"
                              style={{ color: isDarkMode ? '#fff' : '#000' }}
                            >
                              {details.first_name + " " + details.last_name}
                            </Text>}
                            {loading ? <Skeleton height={10} width={10} borderRadius={8} /> : <TouchableOpacity onPress={() => handlePersonalDetailsSheetPress?.(details)}>
                              <PencilSquareIcon
                                size={21}
                                color="#635BE8"
                              />
                            </TouchableOpacity>}
                          </View>
                          {loading ? <Skeleton height={10} width={100} borderRadius={20} className="mt-2" /> : <Text
                            className={`${isDarkMode ? "text-[#FFFFFFB2]" : "text-[#000000B2]"
                              } pt-1`}
                          >
                            {details.email}
                          </Text>}
                        </View>
                      </View>
                    </View>
            </>
          ) : (
            <View style={{ justifyContent: "center", alignItems: "center", width: "100%" }}>
              <Text>Enjoy Renit to the fullest...</Text>
            </View>

          )}
        </View>
      </View>

      {showUnauthenticatedUI  && (
        <View className=" flex-1 justify-end">
                <StyledView className=" gap-3 justify-center py-5">
                  <Button
                    onPress={googleSignIn}
                    className={`flex-row justify-center gap-1 items-center ${isDark
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
                        <View className="px-6 py-1">
                          <Text
                            fontWeight="font-bold"
                            className="ml-1 -translate-y-0.5"
                          >
                            Continue with Google
                          </Text>
                        </View>
                      </>
                    )}
                  </Button>

                  {Platform.OS === "ios" && (
                    <Button
                      onPress={appleSignIn}
                      className={`flex-row justify-center gap-1 items-center ${isDark
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
                            <Text
                              fontWeight="font-bold"
                              className="ml-1"
                            >
                              Continue with Apple
                            </Text>
                          </View>
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    onPress={() => router.navigate("Email")}
                    className={`flex-row justify-center gap-1 items-center ${isDark
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
                      <Text
                        fontWeight="font-bold"
                        className="ml-1 -translate-y-0.5"
                      >
                        {" "}
                        Continue with Email
                      </Text>
                    </View>
                  </Button>
                </StyledView>
        </View>
      )}
    </View>
  );

};

export default ProfileImgContainer;
