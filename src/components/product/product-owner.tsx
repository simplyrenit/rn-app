import { TouchableOpacity, View } from "react-native";
import { Avatar, Text, usePressFeedback } from "@/components/core";
import { StarIcon } from "react-native-heroicons/solid";
import { StarIcon as StarMini } from "react-native-heroicons/mini";
import { ChevronRightIcon } from "react-native-heroicons/outline";
import { ChevronRightIcon as ChevronRightMini } from "react-native-heroicons/mini";
import { useTypedNavigation } from "@/lib/types";
import { MIN_TOUCH_TARGET, radius } from "@/lib/design-tokens";
import { describeRating } from "@/lib/rating";
import { useTheme } from "@/lib/theme";

interface Props {
  id: string;
  name: string;
  profilePic: string;
  rating: number;
  products: number;
  isDark: boolean;
  /**
   * Opt-in. `detail` is the row as Figma 1:9120 draws it in "About the owner":
   * a 48pt avatar, the meta line set entirely in tertiary, and a mini chevron
   * at full strength. The post wizard's review step keeps `default`.
   */
  variant?: "default" | "detail";
}

/** The frame's avatar, and with it the row's height. */
const DETAIL_AVATAR = 48;
/** A dot, not a bullet glyph: the frame draws 2pt of ink between the two facts. */
const DETAIL_DOT = 2;

export function AboutOwner({
  id,
  name,
  products,
  profilePic,
  rating,
  variant = "default",
}: Props) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const detail = variant === "detail";
  const ratingDisplay = describeRating(rating);
  // The one shared press treatment; this row cannot go through Button or Card.
  const { pressStyle, onPressIn, onPressOut } = usePressFeedback();

  // "Products" on the detail page, where every other heading says product;
  // "listings" is the word the rest of the app uses for the same count.
  const countWord = detail
    ? products === 1
      ? "product"
      : "products"
    : products === 1
    ? "listing"
    : "listings";

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate("UserDetail", { id })}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${ratingDisplay.longLabel}, ${products} ${countWord}`}
      accessibilityHint="Opens this owner's profile"
      activeOpacity={1}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        {
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          minHeight: detail ? DETAIL_AVATAR : MIN_TOUCH_TARGET,
          // The detail page's block owns the space around this row.
          paddingVertical: detail ? 0 : 8,
          gap: detail ? 16 : 10,
        },
        pressStyle,
      ]}
    >
      {/* Every avatar carries a hairline ring so its silhouette holds against
          arbitrary photo content. */}
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: detail ? 8 : 10,
        }}
      >
        <Avatar uri={profilePic} name={name} size={detail ? DETAIL_AVATAR : 52} />
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
              detail ? (
                <StarMini color={color.textDim} size={20} />
              ) : (
                <StarIcon color={color.warning} size={16} />
              )
            ) : null}
            <Text fontSize="text-sm" tone={detail ? "dim" : "body"}>
              {ratingDisplay.label}
            </Text>
            {detail ? (
              <View
                style={{
                  width: DETAIL_DOT,
                  height: DETAIL_DOT,
                  borderRadius: radius.full,
                  backgroundColor: color.textDim,
                }}
              />
            ) : (
              <Text fontSize="text-sm" tone="dim">
                •
              </Text>
            )}
            <Text fontSize="text-sm" tone={detail ? "dim" : "body"}>
              {products} {countWord}
            </Text>
          </View>
        </View>
      </View>
      {detail ? (
        <ChevronRightMini color={color.text} size={24} />
      ) : (
        <ChevronRightIcon color={color.textBody} size={18} />
      )}
    </TouchableOpacity>
  );
}
