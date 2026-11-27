import { Text } from "@/components/core/text";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { MapPinIcon } from "react-native-heroicons/outline";

/**
 * One nearby place in Search's "Where?" sheet (Figma 2089:29793): a 64pt row, the MapPin 24 at 60%, 12 to the
 * place's name (16/24 Medium) over its vicinity (14/20 at 60%).
 *
 * Its own file so a test can render it without gorhom, the dropdown, expo-location and maps. The vicinity is in
 * Google's nearbysearch payload already; a place without one shows its name alone.
 */
export function NearbyPlaceRow({
  name,
  vicinity,
  onPress,
}: {
  name: string;
  vicinity?: string;
  onPress: () => void;
}) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={vicinity ? `${name}, ${vicinity}` : name}
      onPress={onPress}
      style={{ minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12 }}
    >
      <MapPinIcon color={color.textDim} size={24} strokeWidth={1.5} />
      <View style={{ flex: 1 }}>
        <Text fontSize="text-md" fontWeight="font-medium" numberOfLines={1}>
          {name}
        </Text>
        {vicinity ? (
          <Text fontSize="text-sm" tone="dim" numberOfLines={1}>
            {vicinity}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
