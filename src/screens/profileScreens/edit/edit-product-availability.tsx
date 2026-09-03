import { useProfile } from "@/backend/profile";
import { StaticContainer } from "@/components/core";
import { EditStepHeader } from "@/components/post/edit-step-header";
import {
  DateRange,
  UnavailabilityEditor,
} from "@/components/post/unavailability-editor";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import moment from "moment";
import React, { useMemo } from "react";

/**
 * Editing the unavailability of a product that already exists. The calendar is
 * shared with step 6 of the listing flow; this adapter owns the hydration from
 * the API's shape and the PATCH back to it.
 */
export default function EditProductAvailability() {
  const route = useRoute<RouteProps<"EditProductAvailability">>();
  const { name, dates_blocked } = route.params;
  const navigation = useTypedNavigation();
  const { updateMyProductDetails, loading } = useProfile();

  const initialRanges = useMemo<DateRange[]>(
    () =>
      dates_blocked.map((date) => ({
        startDate: date.start_date,
        endDate: date.end_date,
      })),
    [dates_blocked]
  );

  const onSubmit = async (ranges: DateRange[]) => {
    // The editor already works in `YYYY-MM-DD`, but the hydrated ranges came
    // straight off the API, so they are normalised here rather than trusted.
    const normalised = ranges.map((range) => ({
      startDate: moment(range.startDate).format("YYYY-MM-DD"),
      endDate: moment(range.endDate || range.startDate).format("YYYY-MM-DD"),
    }));

    // Deliberately NOT written into the product context. That context is the
    // *new listing* wizard's draft, and `backend/post.tsx` reads
    // `productAvailability` straight into the create-listing body — so a write
    // here leaked this product's blocked dates into the next listing the owner
    // posted. Nothing clears the draft when the flow is entered; it is cleared
    // only on logout and after a successful post. This screen persists through
    // the PATCH below and has no business touching the draft at all.
    try {
      await updateMyProductDetails(name, {
        blocked_dates: normalised.map((range) => ({
          start_date: range.startDate,
          end_date: range.endDate,
        })),
      });

      toast.success("Your product was updated!");
      navigation.navigate("editProduct", { id: name });
    } catch (error) {
      console.error("Failed to update product details:", error);
      // The PATCH is the only thing that persists this screen, so a failure has
      // to be said out loud; it used to fail into the console and leave the
      // customer looking at an unchanged screen.
      toast.error("We could not save those dates. Please try again.");
    }
  };

  return (
    <StaticContainer width={100}>
      <EditStepHeader title="Edit Unavailability" />

      <UnavailabilityEditor
        initialRanges={initialRanges}
        submitLabel="Update"
        onSubmit={onSubmit}
        submitting={loading}
      />
    </StaticContainer>
  );
}
