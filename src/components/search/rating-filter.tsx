import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useState } from "react";
import { View } from "react-native";
import { StarIcon as StarOutline } from "react-native-heroicons/outline";
import { StarIcon as StarSolid } from "react-native-heroicons/solid";
import StarRating from "react-native-star-rating-widget";
import { Text } from "../core";

interface Props {
  productRating: number;
  ownerRating: number;
  onSelect: (productRating: number, ownerRating: number) => void;
  closeSheet: () => void;
  isLoading: boolean;
}

// 2089:35166: 28pt stars 8 apart, solid brand when on and a 1.5 outline at 60%
// when off, with the value 8 after the last one. The widget spaces its stars
// by a margin either side, so the row is pulled back by one margin.
const STAR = 28;
const HALF_GAP = 4;

type StarProps = { size: number; color: string; type: "full" | "half" | "empty" };

/** The heroicons stars; a half star is the outline under the solid one's left half. */
function Star({ size, color, type }: StarProps) {
  if (type === "full") return <StarSolid size={size} color={color} />;
  if (type === "empty") return <StarOutline size={size} strokeWidth={1.5} color={color} />;
  return (
    <View style={{ width: size, height: size }}>
      <StarOutline size={size} strokeWidth={1.5} color={color} />
      <View style={{ position: "absolute", left: 0, top: 0, width: size / 2, height: size, overflow: "hidden" }}>
        <StarSolid size={size} color={color} />
      </View>
    </View>
  );
}

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text role="fieldLabel">{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: HALF_GAP }}>
        {/* Half steps by tap or swipe, as the react-native-ratings control before
            it; onChange also carries the screen reader's increment/decrement. */}
        <StarRating
          rating={value}
          onChange={onChange}
          starSize={STAR}
          color={color.brand}
          emptyColor={color.textDim}
          starStyle={{ marginHorizontal: HALF_GAP }}
          style={{ marginLeft: -HALF_GAP }}
          StarIconComponent={Star}
        />
        <Text fontSize="text-md" fontWeight="font-semibold">
          {/* One decimal once set ("4.0", "3.5"), a bare "0" when not, as the frame prints them (2089:35166). */}
          {value ? value.toFixed(1) : 0}
        </Text>
      </View>
    </View>
  );
}

export function RatingFilter({ productRating, ownerRating, onSelect }: Props) {
  const [rating, setRating] = useState({
    product: productRating,
    owner: ownerRating,
  });

  return (
    <View style={{ flex: 1, paddingVertical: 16, paddingHorizontal: SCREEN_GUTTER, gap: 20 }}>
      <RatingRow
        label="Product review"
        value={rating.product}
        onChange={(product) => {
          setRating((prev) => ({ ...prev, product }));
          // As before the 2.1 restyle, the product row hands its new value over
          // in the owner slot. ENG-427 reports it; a look-only story does not change it.
          onSelect(rating.product, product);
        }}
      />
      <RatingRow
        label="Owner review"
        value={rating.owner}
        onChange={(owner) => {
          setRating((prev) => ({ ...prev, owner }));
          onSelect(rating.product, owner);
        }}
      />
    </View>
  );
}
