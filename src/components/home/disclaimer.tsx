import { Button, Text } from "@/components/core";
import { density, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { View } from "react-native";
import { RocketLaunchIcon } from "react-native-heroicons/solid";

export function Disclaimer({ mb }: { mb?: number }) {
  const { color } = useTheme();
  const router = useTypedNavigation();

  return (
    <View
      style={{
        borderWidth: 1,
        borderRadius: radius.group,
        padding: 14,
        marginTop: density.section,
        marginBottom: mb ?? density.section,
        gap: 12,
        backgroundColor: color.brandWash,
        borderColor: color.line,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View
          style={{
            padding: 9,
            borderRadius: radius.card,
            // Was `surface`, which is LIGHTER than the brand wash behind it in
            // light mode and DARKER in dark mode — so the same tile read as
            // raised in one theme and as a hole punched through the card in the
            // other. A brand fill is unambiguous in both.
            backgroundColor: color.brand,
          }}
        >
          <RocketLaunchIcon size={20} color="#FFFFFF" />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text fontSize="text-md" fontWeight="font-bold">
            Don’t see what you need?
          </Text>
          <Text fontSize="text-sm" tone="body">
            Tell us what you’re looking for and we’ll try to get it on Renit.
          </Text>
        </View>
      </View>

      {/* Was "Unavailability form" — a database concept on the home screen, in a
          card whose own body copy already said the right thing in plain words. */}
      {/* A chevron inside a filled button is a disclosure-row pattern; a
          primary action just states what it does. */}
      <Button
        size="compact"
        onPress={() => router.navigate("unavailabilityFormCategories")}
      >
        Request an item
      </Button>
    </View>
  );
}
