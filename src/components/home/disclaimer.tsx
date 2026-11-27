import { Button, Text, useButtonLabelColor } from "@/components/core";
import { radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { View } from "react-native";
import { ChevronRightIcon, RocketLaunchIcon } from "react-native-heroicons/mini";

// The 2.1 request card (Home 2083:15120 "Request card", Search results
// 2089:32165 "Request card (compact)"): a #EDEDFC r16 panel with 16 padding and
// gap, a white 36 r8 tile holding the mini rocket, 16/24 SemiBold title over a
// 14/20 body, and the neutral Secondary 44 with a 24 chevron.
const PANEL_PADDING = 16;
const TILE_SIZE = 36;
const TILE_RADIUS = 8;
// Search results draws the compact card 16 under the empty state above it.
const CLASSIC_TOP = 16;

function ButtonLabel() {
  const labelColor = useButtonLabelColor("outline", "neutral");
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} style={{ color: labelColor }}>
        Request an item
      </Text>
      <ChevronRightIcon size={24} color={labelColor} />
    </View>
  );
}

function RequestCard({ body, mb, mt }: { body: string; mb?: number; mt?: number }) {
  const { color } = useTheme();
  const router = useTypedNavigation();

  return (
    <View
      style={{
        borderRadius: radius.card,
        padding: PANEL_PADDING,
        marginTop: mt,
        marginBottom: mb,
        gap: PANEL_PADDING,
        backgroundColor: color.brandPanel,
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
            backgroundColor: color.surface,
          }}
        >
          <RocketLaunchIcon size={20} color={color.brandText} />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text fontSize="text-md" fontWeight="font-semibold">
            Don’t see what you need?
          </Text>
          <Text fontSize="text-sm" tone="body">
            {body}
          </Text>
        </View>
      </View>

      <Button
        variant="outline"
        tone="neutral"
        size="compact"
        accessibilityLabel="Request an item"
        onPress={() => router.navigate("unavailabilityFormCategories")}
      >
        <ButtonLabel />
      </Button>
    </View>
  );
}

interface DisclaimerProps {
  mb?: number;
  mt?: number;
  /**
   * The Home tab's copy ("Request a product & we’ll do our best…"). Off by
   * default: Search results keeps its compact copy. Both draw the same card.
   */
  card?: boolean;
}

export function Disclaimer({ mb, mt, card = false }: DisclaimerProps) {
  return card ? (
    <RequestCard
      body="Request a product & we’ll do our best to get it on Renit for you!"
      mb={mb}
      mt={mt}
    />
  ) : (
    <RequestCard
      body="Tell us what you’re looking for and we’ll try to get it on Renit."
      mb={mb}
      mt={CLASSIC_TOP}
    />
  );
}
