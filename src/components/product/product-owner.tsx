import { TouchableOpacity, View } from "react-native";
import { Avatar, Text, usePressFeedback } from "@/components/core";
import { StarIcon } from "react-native-heroicons/solid";
import { ChevronRightIcon } from "react-native-heroicons/outline";
import { useTypedNavigation } from "@/lib/types";
import { MIN_TOUCH_TARGET } from "@/lib/design-tokens";
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

export function AboutOwner({
  id,
  name,
  products,
  profilePic,
  rating,
}: Props) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const ratingDisplay = describeRating(rating);
  // The one shared press treatment; this row cannot go through Button or Card.
  const { pressStyle, onPressIn, onPressOut } = usePressFeedback();

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate("UserDetail", { id })}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${ratingDisplay.longLabel}, ${products} listings`}
      accessibilityHint="Opens this owner's profile"
      activeOpacity={1}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        {
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          minHeight: MIN_TOUCH_TARGET,
          paddingVertical: 8,
          gap: 10,
        },
        pressStyle,
      ]}
    >
      {/* Every avatar carries a hairline ring so its silhouette holds against
          arbitrary photo content. */}
      <Avatar uri={profilePic} name={name} size={52} />
      <View style={{ flex: 1 }}>
        <Text fontSize="text-md" fontWeight="font-bold" numberOfLines={1}>
          {name}
        </Text>
        {/* A filled star beside the number 0 read as "rated zero out of five"
            — the worst possible host — for every seller who simply had not
            been rated yet. No score, no star. */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginTop: 2,
          }}
        >
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
      <ChevronRightIcon color={color.textBody} size={18} />
    </TouchableOpacity>
  );
}
