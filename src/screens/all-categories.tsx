import {
  ParentCategoryTile,
  TileGrid,
} from "@/components/categories/category-tile";
import { EmptyState, Skeleton, SubpageHeader } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { density, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { ExclamationCircleIcon } from "react-native-heroicons/outline";

// The 2.1 All categories frames (2089:24546, 2089:24644): 16 under the top bar,
// then three 106 x 87 tiles 12 apart, with 20 from one row's labels to the next
// row. The error state sits 146 under the top bar (130 past the inset).
const TOP_INSET = 16;
const GAP = 12;
const ROW_GAP = 20;
const RATIO = 106 / 87;
const ERROR_TOP = 130;

/**
 * Every active category, in the API's order, under its full title (ENG-76).
 *
 * The list is the app's category list (loaded at launch and on Home's
 * pull-to-refresh), so a category admin adds or archives shows up here with no
 * release; Home only shows seven of them.
 */
export default function AllCategoriesScreen() {
  const { categories, fetchCategories } = useGlobalContext();
  const { color } = useTheme();
  // An empty list is not yet an error: the launch fetch may still be in flight,
  // and the context does not say. Fetch once more and call it failed only when
  // that settles empty. `fetchCategories` never throws.
  const [loading, setLoading] = useState(categories.length === 0);

  const load = async () => {
    setLoading(true);
    await fetchCategories();
    setLoading(false);
  };

  useEffect(() => {
    if (categories.length === 0) void load();
  }, []);

  return (
    <NonScrollableContainer>
      <SubpageHeader title="All categories" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: TOP_INSET,
          paddingBottom: density.listFooterCompact,
        }}
      >
        {categories.length === 0 && loading ? (
          <TileGrid columns={3} gap={GAP} rowGap={ROW_GAP} ratio={RATIO}>
            {(size) =>
              [0, 1, 2, 3, 4, 5].map((key) => (
                <View key={key} style={{ width: size.cell, alignItems: "center" }}>
                  <Skeleton
                    width={size.width}
                    height={size.height}
                    borderRadius={radius.button}
                  />
                </View>
              ))
            }
          </TileGrid>
        ) : categories.length === 0 ? (
          // The server could not be reached; there is no bundled list of every
          // category to show instead. The frame draws the plain brand-tint circle
          // with a black glyph, not the danger tint, so no `variant="error"`.
          <View style={{ marginTop: ERROR_TOP }}>
            <EmptyState
              icon={<ExclamationCircleIcon color={color.text} strokeWidth={1.5} />}
              title="Couldn’t load categories"
              body="Check your connection and try again."
              actionLabel="Retry"
              onAction={load}
            />
          </View>
        ) : (
          <TileGrid columns={3} gap={GAP} rowGap={ROW_GAP} ratio={RATIO} labelWidth="tile">
            {(size) =>
              categories.map((category) => (
                <ParentCategoryTile
                  key={category.slug ?? category.title}
                  category={category}
                  label={category.title}
                  size={size}
                />
              ))
            }
          </TileGrid>
        )}
      </ScrollView>
    </NonScrollableContainer>
  );
}
