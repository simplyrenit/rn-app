import { Button, Text, useButtonLabelColor } from "@/components/core";
import { density, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { View } from "react-native";
import { ChevronRightIcon, RocketLaunchIcon } from "react-native-heroicons/mini";

// Measured off the Figma request card: 16pt padding and gap, a 16pt radius, a
// 36pt icon tile on an 8pt radius, and a 44pt button whose label is the 14pt
// bold role with a 20pt chevron.
const PANEL_PADDING = 16;
const TILE_SIZE = 36;
const TILE_RADIUS = 8;

function ButtonLabel() {
  const labelColor = useButtonLabelColor("primary");
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Text fontSize="text-sm" fontWeight="font-bold" style={{ color: labelColor }}>
        Unavailability form
      </Text>
      <ChevronRightIcon size={20} color={labelColor} />
    </View>
  );
}

export function Disclaimer({ mb, mt }: { mb?: number; mt?: number }) {
  const { color } = useTheme();
  const router = useTypedNavigation();

  return (
    <View
      style={{
        borderWidth: 1,
        borderRadius: radius.card,
        padding: PANEL_PADDING,
        marginTop: mt ?? density.section,
        marginBottom: mb ?? density.section,
        gap: PANEL_PADDING,
        backgroundColor: color.brandPanel,
        borderColor: color.brandPanelLine,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <View
          style={{
            width: TILE_SIZE,
            height: TILE_SIZE,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: TILE_RADIUS,
            borderWidth: 1,
            borderColor: color.line,
            backgroundColor: color.surface,
          }}
        >
          <RocketLaunchIcon size={20} color={color.brandText} />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text fontSize="text-md" fontWeight="font-bold">
            Don’t see what you need?
          </Text>
          <Text fontSize="text-md" tone="body">
            Request a product &amp; we’ll do our best to get it on Renit for you!
          </Text>
        </View>
      </View>

      <Button onPress={() => router.navigate("unavailabilityFormCategories")}>
        <ButtonLabel />
      </Button>
    </View>
  );
}
