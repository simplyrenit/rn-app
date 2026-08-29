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
import { Avatar } from "@/components/core";
import { ink } from "@/lib/design-tokens";
import { describeRating } from "@/lib/rating";
import { useTheme } from "@/lib/theme";

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
  const { color } = useTheme();
  const ratingDisplay = describeRating(rating);

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate("UserDetail", { id })}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${ratingDisplay.longLabel}, ${products} listings`}
      className="w-full flex-row items-center py-2"
    >
      {/* Every avatar carries a hairline ring so its silhouette holds against
          arbitrary photo content. */}
      <Avatar uri={profilePic} name={name} size={52} />
      <View className="flex-1 ml-2">
        <Text fontSize="text-md" fontWeight="font-bold">
          {name}
        </Text>
        {/* A filled star beside the number 0 read as "rated zero out of five"
            — the worst possible host — for every seller who simply had not
            been rated yet. No score, no star. */}
        <View className="flex flex-row items-center space-x-1 mt-1">
          {ratingDisplay.rated ? (
            <StarIcon color={color.warning} size={16} />
          ) : null}
          <Text fontSize="text-sm" tone="body">
            {ratingDisplay.label}
          </Text>
          <Text fontSize="text-sm" tone="dim">
            •
          </Text>
          <Text fontSize="text-sm" tone="body">
            {products} {products === 1 ? "listing" : "listings"}
          </Text>
        </View>
      </View>
      <ChevronRightIcon color={ink.text(isDark)} size={18} />
    </TouchableOpacity>
  );
}
