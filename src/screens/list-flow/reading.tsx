import { Button, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { RETAKE_WARNINGS, warningHeadline } from "@/components/list-flow/copy";
import { ExtractionChecklist } from "@/components/list-flow/extraction-checklist";
import { FlowHeader } from "@/components/list-flow/flow-header";
import { pickPhotos } from "@/components/list-flow/pick-photos";
import { FoundChip, ScanPanel } from "@/components/list-flow/scan-panel";
import { useListDraft } from "@/context/list-draft-context";
import { categoryDisplayName } from "@/lib/category-icons";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { canRunAgain, warningKey } from "@/lib/list-flow/draft";
import { AI_FIELDS, ListingWarning } from "@/lib/list-flow/types";
import { pluralize } from "@/lib/pluralize";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import { StackActions } from "@react-navigation/native";
import React, { useEffect, useMemo, useRef } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** §8.3: after `done`, hold the finished checklist this long before Review. */
const DONE_HOLD_MS = 600;

/**
 * L-13 Reading your photos (and L-13b), IMPLEMENTATION.md §8.3.
 *
 * The run itself lives in the draft context, not here: leaving this screen
 * ("Skip to review") must not stop it, so Review can keep filling in place.
 */
export default function ListReadingScreen() {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const flow = useListDraft();
  const { draft, run } = flow;
  const shown = useRef(new Set<string>());
  const left = useRef(false);

  const visible = (w: ListingWarning) => !draft?.dismissedWarnings.includes(warningKey(w));
  // A warning with no photo number cannot be retaken — there is no slot to
  // replace — so it never becomes L-13b and never holds the move to Review.
  const unreadable = draft?.warnings.find(
    (w) => w.type === "unreadable" && Boolean(w.photo) && visible(w)
  );
  const retakeWarning = draft?.warnings.find((w) => RETAKE_WARNINGS.includes(w.type) && visible(w));
  const holding = Boolean(unreadable || retakeWarning?.photo);

  const goToReview = () => {
    if (left.current) return;
    left.current = true;
    // Replace, not push: Reading is a pass-through, so Back from Review
    // returns to the photos rather than to a finished scan.
    navigation.dispatch(StackActions.replace("ListReview"));
  };

  // Warnings are counted once, when the owner first sees them.
  useEffect(() => {
    [unreadable, retakeWarning].forEach((w) => {
      if (!w) return;
      const key = warningKey(w);
      if (shown.current.has(key)) return;
      shown.current.add(key);
      flow.track("warning_shown", { type: w.type, photo: w.photo });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadable, retakeWarning]);

  // How the run ended decides where the owner goes next.
  useEffect(() => {
    if (run.status === "done" && !holding) {
      const timer = setTimeout(goToReview, DONE_HOLD_MS);
      return () => clearTimeout(timer);
    }
    if (run.status === "failed" || run.status === "rate_limited") {
      if (run.code === "merchant_not_approved") {
        toast.error("Merchant approval required", {
          message: "You can post listings once your merchant account is approved.",
        });
        navigation.navigate("MainTabs", { screen: "Post" });
        return;
      }
      goToReview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.status, run.code, holding]);

  const chips = useMemo<FoundChip[]>(() => {
    if (!draft) return [];
    const f = draft.fields;
    const list: FoundChip[] = [];
    const add = (key: string, label: string | null | undefined) => {
      if (label && !list.some((c) => c.label.toLowerCase() === label.toLowerCase())) {
        list.push({ key, label });
      }
    };
    if (f.brand_name.source === "ai") add("brand", f.brand_name.value);
    if (f.model_name.source === "ai") add("model", f.model_name.value);
    if (f.category.source === "ai" && f.category.value)
      add("category", categoryDisplayName(f.category.value.title));
    if (unreadable) list.push({ key: "unreadable", label: "Label", dashed: true });
    return list.slice(0, 4);
  }, [draft, unreadable]);

  if (!draft) return <NonScrollableContainer>{null}</NonScrollableContainer>;

  const cover = draft.photos[draft.coverIndex] ?? draft.photos[0];
  const total = Math.max(1, run.photoCount || draft.photos.length);
  const reading = run.status === "running";
  // The model reports fields, not photos, so progress through the photos is
  // estimated from how many fields have arrived.
  const current = reading
    ? Math.min(total, 1 + Math.floor((run.checklist.length * total) / AI_FIELDS.length))
    : total;

  const onRetakeLabel = async () => {
    if (!unreadable?.photo) return;
    flow.track("warning_action", { type: "unreadable", action: "retake" });
    const [picked] = await pickPhotos("camera", 1);
    if (!picked) return;
    flow.replacePhoto(unreadable.photo - 1, picked);
    await flow.waitForUploads();
    flow.startExtraction();
  };

  const onTypeIt = () => {
    if (unreadable) {
      flow.track("warning_action", { type: "unreadable", action: "type_it" });
      flow.dispatch({ type: "dismissWarning", warning: unreadable });
    }
    goToReview();
  };

  const onRetakePhoto = () => {
    if (!retakeWarning?.photo) return;
    flow.track("warning_action", { type: retakeWarning.type, action: "retake" });
    navigation.navigate("ListAddPhotos", { focusPhoto: retakeWarning.photo });
  };

  const onKeep = () => {
    if (!retakeWarning) return;
    flow.track("warning_action", { type: retakeWarning.type, action: "keep" });
    flow.dispatch({ type: "dismissWarning", warning: retakeWarning });
  };

  return (
    <NonScrollableContainer>
      <FlowHeader step={2} title={unreadable ? "One photo needs a retake" : "List an item"} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.md,
          paddingBottom: space.lg,
          gap: space.md,
        }}
      >
        {unreadable ? (
          <Text fontSize="text-xl" fontWeight="font-bold" accessibilityRole="header">
            {warningHeadline(unreadable)}
          </Text>
        ) : null}

        <ScanPanel
          uri={cover ? cover.remoteUrl ?? cover.localUri : null}
          scanning={reading}
          chips={chips}
          status={`Reading photo ${current} of ${total}`}
        />

        <View
          style={{
            padding: space.md,
            borderRadius: radius.group,
            backgroundColor: color.surfaceRaised,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text fontSize="text-md" fontWeight="font-bold">
            Filling in your listing
          </Text>
          <Text fontSize="text-sm" tone="dim">
            {pluralize(total, "photo")}
          </Text>
        </View>

        {retakeWarning && !unreadable ? (
          <View
            style={{
              padding: space.md,
              borderRadius: radius.group,
              backgroundColor: color.brandPanel,
              borderWidth: 1,
              borderColor: color.brandPanelLine,
              gap: space.sm,
            }}
          >
            <Text fontSize="text-sm" fontWeight="font-bold">
              {warningHeadline(retakeWarning)}
            </Text>
            {retakeWarning.reason ? (
              <Text fontSize="text-xs" tone="body">
                {retakeWarning.reason}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", gap: space.sm }}>
              {retakeWarning.photo ? (
                <Button size="compact" style={{ flex: 1 }} onPress={onRetakePhoto}>
                  {`Retake photo ${retakeWarning.photo}`}
                </Button>
              ) : null}
              <Button size="compact" variant="outline" style={{ flex: 1 }} onPress={onKeep}>
                Keep it
              </Button>
            </View>
          </View>
        ) : null}

        <ExtractionChecklist checklist={run.checklist} draft={draft} running={reading} />
      </ScrollView>

      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.sm,
          paddingBottom: insets.bottom + space.sm,
          gap: space.xs,
        }}
      >
        {unreadable ? (
          <>
            {canRunAgain(draft) ? (
              <Button onPress={onRetakeLabel} loading={reading && run.checklist.length === 0}>
                Retake the label photo
              </Button>
            ) : null}
            <Button variant="ghost" onPress={onTypeIt}>
              Leave it blank — I'll type it
            </Button>
          </>
        ) : (
          <Button variant="ghost" onPress={goToReview}>
            {reading ? "Skip to review — we'll keep filling in" : "Go to review"}
          </Button>
        )}
      </View>
    </NonScrollableContainer>
  );
}
