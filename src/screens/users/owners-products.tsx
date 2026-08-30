import { BackButton, Card, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { IconButton } from "@/components/core/icon-button";
import { RouteProps } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React from "react";
import { Dimensions, FlatList, Share, View } from "react-native";
import { IOSShareIcon } from "@/icons/share";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";

const GRID_GAP = 14;

/**
 * An exact column width, not a percentage.
 *
 * Two cards at "48.5%" plus a 14pt gap comes to more than the row, so the
 * second card overflowed and was clipped on the right edge.
 */
const COLUMN_WIDTH =
  (Dimensions.get("window").width - SCREEN_GUTTER * 2 - GRID_GAP) / 2;

const OwnersProductsScreen: React.FC = () => {
  const { params } = useRoute<RouteProps<"OwnersProducts">>();
  const { products, name } = params;
  const { color } = useTheme();

  const handleShare = async () => {
    const line = `${name}'s listings on Renit — ${products.length} ${
      products.length === 1 ? "item" : "items"
    } to rent`;
    try {
      await Share.share({ message: line });
    } catch {
      toast.error("Couldn’t open the share sheet");
    }
  };

  return (
    <NonScrollableContainer>
      {/* Bare-noun heading, the same rule as the profile this came from. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 10,
          paddingVertical: 6,
        }}
      >
        <BackButton />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text role="screenTitle" numberOfLines={1}>
            Listings
          </Text>
        </View>
        <IconButton
          onPress={handleShare}
          accessibilityLabel={`Share ${name}'s listings`}
          accessibilityHint="Opens the system share sheet"
        >
          <IOSShareIcon size={20} color={color.text} />
        </IconButton>
      </View>

      <FlatList
        style={{ width: "100%" }}
        data={products}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 4 }}>
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
          marginTop: 16,
          gap: GRID_GAP,
        }}
        contentContainerStyle={{ paddingBottom: hp("10%") }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          // With a catalogue this small a trailing single-item row is the
          // common case, not the edge case. Left at half width it stranded an
          // empty column beside itself; it now takes the row it is in.
          const isTrailingOdd =
            products.length % 2 === 1 && index === products.length - 1;
          return (
            <Card
              id={item.name}
              image={item.cover_image}
              title={item.title}
              location={item.location}
              price={item.rate}
              coordinates={item.coordinates}
              width={isTrailingOdd ? COLUMN_WIDTH * 2 + GRID_GAP : COLUMN_WIDTH}
            />
          );
        }}
      />
    </NonScrollableContainer>
  );
};

export default OwnersProductsScreen;
