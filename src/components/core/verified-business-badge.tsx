import { useTheme } from "@/lib/theme";
import { View } from "react-native";
import { ShieldCheckIcon } from "react-native-heroicons/solid";
import { Text } from "./text";

interface Props {
  /** The API's `business_verified`. Anything but `true` draws nothing. */
  verified: boolean | undefined;
  /**
   * `mark`: the shield and "Verified" beside a name (owner profile, product
   * owner row). `chip`: the 2.1 listing-card pill for a photo, the green word
   * alone on the success wash over an opaque surface, so it reads on any picture.
   */
  variant?: "mark" | "chip";
  /** `mark` only: "md" is the owner profile's 14/20 SemiBold word, 4 from the shield (2089:36248). */
  size?: "sm" | "md";
  /** The shield, for `mark`. 18 on the profile, 16 in the product owner row. */
  iconSize?: number;
}

/**
 * "Renit checked this business" (D-26, ENG-73). A ShieldCheck, not the green
 * CheckBadge the Email and Phone rows use, so it cannot be read as "email was
 * confirmed"; and always with the word, so it is not colour alone. One
 * component, so the mark is the same wherever it shows.
 */
export function VerifiedBusinessBadge({ verified, variant = "mark", iconSize = 16, size = "sm" }: Props) {
  const { color } = useTheme();
  if (verified !== true) return null;
  const chip = variant === "chip";
  const md = !chip && size === "md";
  const word = (
    <Text
      fontSize={md ? "text-sm" : "text-xs"}
      fontWeight={chip || md ? "font-semibold" : "font-bold"}
      tone={chip ? "success" : "brand"}
    >
      Verified
    </Text>
  );
  const a11y = { accessible: true, accessibilityRole: "image", accessibilityLabel: "Verified business" } as const;
  if (chip) {
    // The listing-card "Verified chip" (2089:31917): a 24-high success-wash pill,
    // 10 each side. Dark's wash is 16% alpha, so the surface under it keeps the
    // pill opaque on a photo; on light the wash is opaque and the surface is unseen.
    return (
      <View {...a11y} style={{ alignSelf: "flex-start", borderRadius: 999, backgroundColor: color.surface }}>
        <View
          style={{
            height: 24,
            justifyContent: "center",
            paddingHorizontal: 10,
            borderRadius: 999,
            backgroundColor: color.successWash,
          }}
        >
          {word}
        </View>
      </View>
    );
  }
  return (
    <View {...a11y} style={{ flexDirection: "row", alignItems: "center", gap: md ? 4 : 3, flexShrink: 0 }}>
      <ShieldCheckIcon size={iconSize} color={color.brandText} />
      {word}
    </View>
  );
}
