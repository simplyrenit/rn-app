import { Card, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { IconButton } from "@/components/core/icon-button";
import { RouteProps } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React from "react";
import { FlatList, Share, View, useWindowDimensions } from "react-native";
import { ShareIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { withSource } from "@/lib/attribution";

// Figma 2089:24680: the sub-line 8 under the top bar, the grid 16 below it,
// 162 cards 18 apart in rows 24 apart, and 24 at the end.
const GRID_GAP = 18;
const ROW_GAP = 24;
const CONTENT_PAD_TOP = 8;
const HEADER_GAP = 16;
const CONTENT_PAD_BOTTOM = 24;

const OwnersProductsScreen: React.FC = () => {
  const { params } = useRoute<RouteProps<"OwnersProducts">>();
  const { products, name, shopUrl } = params;
  const { color } = useTheme();
  // The container leaves the bottom edge to the screen: the last row clears the home indicator here.
  const insets = useSafeAreaInsets();
  /**
   * An exact column width, not a percentage.
   *
   * Two cards at "48.5%" plus the gap comes to more than the row, so the
   * second card overflowed and was clipped on the right edge. Computed per
   * render from the live window, not once at module load, so it follows
   * split-screen, foldables and Android display-size changes.
   */
  const { width: windowWidth } = useWindowDimensions();
  const COLUMN_WIDTH = (windowWidth - SCREEN_GUTTER * 2 - GRID_GAP) / 2;

  const handleShare = async () => {
    const line = `${name}'s listings on Renit — ${products.length} ${
      products.length === 1 ? "item" : "items"
    } to rent${shopUrl ? `\n${withSource(shopUrl, "wa")}` : ""}`;
    try {
      await Share.share({ message: line });
    } catch {
      toast.error("Couldn’t open the share sheet");
    }
  };

  return (
    <NonScrollableContainer>
      {/* Bare-noun heading, the same rule as the profile this came from. */}
      <SubpageHeader
        title="Listings"
        trailing={
          <IconButton
            onPress={handleShare}
            accessibilityLabel={`Share ${name}'s listings`}
            accessibilityHint="Opens the system share sheet"
          >
            <ShareIcon size={24} color={color.text} strokeWidth={1.5} />
          </IconButton>
        }
      />

      <FlatList
        style={{ width: "100%" }}
        data={products}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: CONTENT_PAD_TOP, marginBottom: HEADER_GAP }}>
            <Text fontSize="text-sm" tone="body">
              {`${products.length} ${
                products.length === 1 ? "item" : "items"
              } from ${name}`}
            </Text>
          </View>
        }
        keyExtractor={(item) => item.name}
        numColumns={2}
        columnWrapperStyle={{
          justifyContent: "flex-start",
          paddingHorizontal: SCREEN_GUTTER,
          gap: GRID_GAP,
        }}
        ItemSeparatorComponent={() => <View style={{ height: ROW_GAP }} />}
        contentContainerStyle={{ paddingBottom: CONTENT_PAD_BOTTOM + insets.bottom }}
        showsVerticalScrollIndicator={false}
        // A lone last card keeps its column's width, as the frame draws it.
        renderItem={({ item }) => (
          <Card
            id={item.name}
            image={item.cover_image}
            title={item.title}
            location={item.location}
            price={item.rate}
            plans={item.plans}
            coordinates={item.coordinates}
            width={COLUMN_WIDTH}
          />
        )}
      />
    </NonScrollableContainer>
  );
};

export default OwnersProductsScreen;
