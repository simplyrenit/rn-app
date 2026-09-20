import { StaticContainer } from "@/components/core";
import { PostProductHeader } from "@/components/post/header";
import {
  DateRange,
  UnavailabilityEditor,
} from "@/components/post/unavailability-editor";
import { useProductContext } from "@/context/product-context";
import { useTypedNavigation } from "@/lib/types";
import React from "react";

/**
 * Step 6 of the listing flow. The calendar itself is shared with the edit
 * screen; this adapter owns only where the flow goes next.
 */
export default function ProductAvailability() {
  const navigation = useTypedNavigation();
  const { product, saveDetails } = useProductContext();

  const onSubmit = (ranges: DateRange[]) => {
    saveDetails({ productAvailability: ranges });
    navigation.navigate("ReviewProduct");
  };

  return (
    <StaticContainer width={100}>
      <PostProductHeader
        heading="Product Unavailability"
        step={6}
        showBackArrow
      />

      <UnavailabilityEditor
        // Stepping back from the review screen used to drop everything marked
        // here: the flow held the ranges in context and then started the
        // calendar empty anyway.
        initialRanges={product?.productAvailability}
        submitLabel="Next"
        onSubmit={onSubmit}
      />
    </StaticContainer>
  );
}
