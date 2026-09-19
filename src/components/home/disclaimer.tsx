import { Button, Text, useButtonLabelColor } from "@/components/core";
import { density, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { View } from "react-native";
import { ChevronRightIcon, RocketLaunchIcon } from "react-native-heroicons/mini";
import { RocketLaunchIcon as RocketLaunchSolid } from "react-native-heroicons/solid";

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

function RequestCard({ mb, mt }: { mb?: number; mt?: number }) {
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

function ClassicDisclaimer({ mb }: { mb?: number }) {
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
          <RocketLaunchSolid size={20} color={color.onBrand} />
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

interface DisclaimerProps {
  mb?: number;
  mt?: number;
  /**
   * The Home tab's request card, drawn to its Figma frame: brand panel, 36pt
   * bordered icon tile, the design's copy and an "Unavailability form ›" button.
   * Off by default, so Search results keeps the compact card it has always had
   * until it has a frame of its own to be matched against.
   */
  card?: boolean;
}

export function Disclaimer({ mb, mt, card = false }: DisclaimerProps) {
  return card ? <RequestCard mb={mb} mt={mt} /> : <ClassicDisclaimer mb={mb} />;
}
