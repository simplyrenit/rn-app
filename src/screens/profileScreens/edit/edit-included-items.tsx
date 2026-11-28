import { useCategoryChecklist } from "@/backend/list-flow/checklist";
import { useProfile } from "@/backend/profile";
import { BottomBar, Button } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { IncludedItemsSection } from "@/components/list-flow/included-items";
import { EditStepHeader } from "@/components/post/edit-step-header";
import { HeldFormNotice } from "@/components/product/listing-status";
import { SCREEN_GUTTER, space } from "@/lib/design-tokens";
import { ListingItems, itemsPayload } from "@/lib/included-items";
import { ListingAnswer, ownerView, readPendingEdit, saveOutcome, waitingCategoryId } from "@/lib/listing-edit";
import { toastSave } from "@/lib/save-toast";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

/**
 * Edit what comes with a listing (ENG-454). It starts from the listing's own lists as its owner sees them (a waiting
 * change laid over, `ownerView`), and a save sends the two lists only when they come out changed: opened and saved as it
 * was, the listing keeps following its category's list.
 */
export default function EditIncludedItems() {
  const navigation = useTypedNavigation();
  const listing = useRoute<RouteProps<"EditIncludedItems">>().params.data;
  const data = ownerView(listing);
  const [start] = useState<ListingItems>(() => ({
    included_items: data.included_items ?? [],
    handover_only_items: data.handover_only_items ?? [],
  }));
  const [items, setItems] = useState<ListingItems>(start);
  const pending = readPendingEdit(listing.pending_edit);
  // A category change that waits is the one the owner sees, and the one these items will go with.
  const categoryId = waitingCategoryId(pending) ?? listing.category?.id ?? null;
  // The section reads the same query: one request.
  const { data: options } = useCategoryChecklist(categoryId);
  const { updateMyProductDetails, loading } = useProfile();

  const save = async () => {
    if (!options) return;
    const body = itemsPayload(options, start, items);
    if (Object.keys(body).length === 0) {
      toastSave({ kind: "nothing", title: "Nothing was changed" });
      navigation.goBack();
      return;
    }
    try {
      const answer = await updateMyProductDetails(listing.name, body);
      toastSave(saveOutcome({ before: listing as unknown as ListingAnswer, sent: body, answer: answer as unknown as ListingAnswer }));
      navigation.goBack();
    } catch {
      toast.error("We couldn't save what comes with it", { message: "Check your connection and try again." });
    }
  };

  return (
    <NonScrollableContainer>
      <EditStepHeader title="What comes with it" />
      {/* Which values are waiting: shown here, and customers still see the earlier ones. */}
      <HeldFormNotice pending={pending} />
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={space.md}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.sm, paddingBottom: space.xl }}
      >
        <IncludedItemsSection categoryId={categoryId} items={items} onChange={setItems} hideTitle />
      </KeyboardAwareScrollView>
      <BottomBar>
        <Button onPress={save} loading={loading} disabled={!options}>
          Save
        </Button>
      </BottomBar>
    </NonScrollableContainer>
  );
}
