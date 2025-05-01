import { TouchableOpacity, View } from "react-native";
import { Text } from "../core";
import { styled } from "nativewind";
import { Image } from "expo-image";
import { StarIcon } from "react-native-heroicons/solid";
import {
  ChevronRightIcon,
  UserCircleIcon,
} from "react-native-heroicons/outline";
import { useTypedNavigation } from "@/lib/types";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";

interface Props {
  id: string;
  name: string;
  profilePic: string;
  rating: number;
  products: number;
  isDark: boolean;
}

const StyledImage = styled(Image);

export function AboutOwner({
  id,
  name,
  products,
  profilePic,
  rating,
  isDark,
}: Props) {
  const navigation = useTypedNavigation();

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate("UserDetail", { id })}
      className="w-full mt-0 h-20 flex flex-row items-center"
    >
      <View className="">
        {profilePic ? (
          <StyledImage
            source={{ uri: profilePic }}
            // className="h-16 w-16 rounded-full"
            style={{ width: wp("14%"), height: wp("14%") }}
            className="rounded-full"
          />
        ) : (
          <UserCircleIcon
            color={"#635BE8"}
            size={wp("14%")}
          />
        )}
      </View>
      <View className="flex-1 ml-2">
        <Text
          fontSize="text-md"
          fontWeight="font-bold"
        >
          {name}
        </Text>
        <View className="flex flex-row items-center space-x-1 mt-1">
          <StarIcon
            color={isDark ? "#FFFFFF80" : "#00000080"}
            size={wp("5%")}
          />
          <Text
            className={`${isDark ? "text-[#FFFFFF80]" : "text-[#00000080]"}`}
          >
            {rating}
          </Text>
          <Text
            className={`${isDark ? "text-[#FFFFFF80]" : "text-[#00000080]"}`}
          >
            ∙
          </Text>
          <Text
            className={`${isDark ? "text-[#FFFFFF80]" : "text-[#00000080]"}`}
          >
            {products} {products === 1 ? "product" : "products"}
          </Text>
        </View>
      </View>
      <View className=" h-full justify-center items-end">
        <ChevronRightIcon
          color={isDark ? "white" : "black"}
          size={wp("5%")}
        />
      </View>
    </TouchableOpacity>
  );
}
