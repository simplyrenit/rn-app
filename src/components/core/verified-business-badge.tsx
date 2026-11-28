import { useTheme } from "@/lib/theme";
import { View } from "react-native";
import { ShieldCheckIcon } from "react-native-heroicons/solid";
import { Text } from "./text";

interface Props {
  /** The API's `business_verified`. Anything but `true` draws nothing. */
  verified: boolean | undefined;
  /**
   * `mark`: the shield and "Verified" beside a name (owner profile, product
   * owner row). `chip`: the same on a solid brand fill, for a photo (search
   * results), where the bare mark would vanish into the picture.
   */
  variant?: "mark" | "chip";
  /** The shield, for `mark`. 18 on the profile, 16 in the product owner row. */
  iconSize?: number;
  /** ENG-449: an individual owner whose ID check (KYC) is valid: "Verified owner", not a business. */
  owner?: boolean;
}

/**
 * "Renit checked this business" (D-26, ENG-73). A ShieldCheck, not the green
 * CheckBadge the Email and Phone rows use, so it cannot be read as "email was
 * confirmed"; and always with the word, so it is not colour alone. One
 * component, so the mark is the same wherever it shows.
 */
export function VerifiedBusinessBadge({ verified, variant = "mark", iconSize = 16, owner = false }: Props) {
  const { color } = useTheme();
  if (verified !== true) return null;
  const chip = variant === "chip";
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={owner ? "Verified owner" : "Verified business"}
      style={[
        { flexDirection: "row", alignItems: "center", gap: 3, flexShrink: 0 },
        chip && {
          alignSelf: "flex-start",
          backgroundColor: color.brand,
          borderRadius: 999,
          paddingVertical: 3,
          paddingLeft: 6,
          paddingRight: 8,
        },
      ]}
    >
      <ShieldCheckIcon size={chip ? 12 : iconSize} color={chip ? color.onBrand : color.brandText} />
      <Text fontSize="text-xs" fontWeight="font-bold" tone={chip ? "onBrand" : "brand"}>
        {owner ? "Verified owner" : "Verified"}
      </Text>
    </View>
  );
}
