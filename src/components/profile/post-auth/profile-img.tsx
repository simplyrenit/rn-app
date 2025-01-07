import { MyDetails, useProfile } from "@/backend/profile";
import { Text } from "@/components/core";
import Skeleton from "@/components/core/skeleton";
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
  const [loading, setLoading] = useState(true);
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
    setLoading(false);
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
            {loading ? <Skeleton height={10} width={10} borderRadius={8} /> : <TouchableOpacity onPress={handlePersonalDetailsSheetPress}>
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
  );
};

export default ProfileImgContainer;
