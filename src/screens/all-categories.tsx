import {
  ParentCategoryTile,
  TileGrid,
} from "@/components/categories/category-tile";
import { EmptyState, SubpageHeader } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { density } from "@/lib/design-tokens";
import React, { useState } from "react";
import { ScrollView } from "react-native";

// Measured off the v3 All categories frame (C-10b): 16 under the header, then
// three 106 x 87 tiles 12 apart, with 20 from one row's labels to the next row.
const TOP_INSET = 16;
const GAP = 12;
const ROW_GAP = 20;
const RATIO = 106 / 87;

/**
 * Every active category, in the API's order, under its full title (ENG-76).
 *
 * The list is the one the app loads at launch, so a category admin adds or
 * archives shows up here with no release; Home only shows seven of them.
 */
export default function AllCategoriesScreen() {
  const { categories, fetchCategories } = useGlobalContext();
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    await fetchCategories();
    setRetrying(false);
  };

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
        {categories.length === 0 ? (
          // Launch could not reach the server; there is no bundled list of
          // every category to show instead.
          <EmptyState
            variant="error"
            title="Couldn’t load categories"
            body="Check your connection and try again."
            actionLabel={retrying ? "Loading" : "Retry"}
            onAction={retrying ? undefined : retry}
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
