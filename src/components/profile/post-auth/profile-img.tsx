import { MyDetails, useProfile } from "@/backend/profile";
import { Text } from "@/components/core";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import { Image, TouchableOpacity, View } from "react-native";
import { PencilSquareIcon } from "react-native-heroicons/outline";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";

interface ProfileImgContainerProps {
  isDarkMode: boolean;
  handlePersonalDetailsSheetPress: () => void;
}

const ProfileImgContainer: React.FC<ProfileImgContainerProps> = ({
  isDarkMode,
  handlePersonalDetailsSheetPress,
}) => {
  const [details, setDetails] = useState<Partial<MyDetails>>({
    first_name: "",
    last_name: "",
    email: "",
    image: { image_url: "", name: "" },
  });
  const defaultAvatar =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Default_pfp.svg/2048px-Default_pfp.svg.png";

  const { getMyDetails } = useProfile();

  const fetchDetails = async () => {
    const details = await getMyDetails();
    setDetails(details);
  };

  useFocusEffect(
    useCallback(() => {
      fetchDetails();
    }, [handlePersonalDetailsSheetPress])
  );

  return (
    <View
      style={{ paddingVertical: wp("6%") }}
      className="flex-row justify-between items-center"
    >
      <View className="flex-row gap-3 items-center w-full">
        <Image
          source={{ uri: details.image?.image_url || defaultAvatar }}
          style={{ width: wp("12%"), height: wp("12%") }}
          className="rounded-full"
        />
        <View className="w-[85%]">
          <View className="flex flex-row items-center justify-between">
            <Text
              fontSize="text-base"
              fontWeight="font-bold"
            >
              {details.first_name + " " + details.last_name}
            </Text>
            <TouchableOpacity onPress={handlePersonalDetailsSheetPress}>
              <PencilSquareIcon
                size={21}
                color="#635BE8"
              />
            </TouchableOpacity>
          </View>
          <Text
            className={`${
              isDarkMode ? "text-[#FFFFFFB2]" : "text-[#000000B2]"
            } pt-1`}
          >
            {details.email}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default ProfileImgContainer;
