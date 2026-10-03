import {
  ParentCategoryTile,
  TileGrid,
} from "@/components/categories/category-tile";
import { EmptyState, Skeleton, SubpageHeader } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { density, radius } from "@/lib/design-tokens";
import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";

// Measured off the v3 All categories frame (C-10b): 16 under the header, then
// three 106 x 87 tiles 12 apart, with 20 from one row's labels to the next row.
const TOP_INSET = 16;
const GAP = 12;
const ROW_GAP = 20;
const RATIO = 106 / 87;

/**
 * Every active category, in the API's order, under its full title (ENG-76).
 *
 * The list is the app's category list (loaded at launch and on Home's
 * pull-to-refresh), so a category admin adds or archives shows up here with no
 * release; Home only shows seven of them.
 */
export default function AllCategoriesScreen() {
  const { categories, fetchCategories } = useGlobalContext();
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
          // category to show instead.
          <EmptyState
            variant="error"
            title="Couldn’t load categories"
            body="Check your connection and try again."
            actionLabel="Retry"
            onAction={load}
          />
        ) : (
          <TileGrid columns={3} gap={GAP} rowGap={ROW_GAP} ratio={RATIO}>
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
