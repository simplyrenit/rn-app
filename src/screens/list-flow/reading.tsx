import { BottomBar, Button, StepProgress, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { RETAKE_WARNINGS, warningHeadline } from "@/components/list-flow/copy";
import { ExtractionChecklist } from "@/components/list-flow/extraction-checklist";
import { FLOW_STEPS, FlowHeader } from "@/components/list-flow/flow-header";
import { useAppear } from "@/components/list-flow/motion";
import { pickPhotos } from "@/components/list-flow/pick-photos";
import { FoundChip, ScanPanel } from "@/components/list-flow/scan-panel";
import { useListDraft } from "@/context/list-draft-context";
import { categoryDisplayName } from "@/lib/category-icons";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { canRunAgain, warningKey } from "@/lib/list-flow/draft";
import { AI_FIELDS, ListingWarning } from "@/lib/list-flow/types";
import { pluralize } from "@/lib/pluralize";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import type { ListFlowDesign } from "@/dev/list-flow-seed";
import { StackActions, useRoute } from "@react-navigation/native";
import React, { useEffect, useMemo, useRef } from "react";
import { ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";

// Dev builds only: the listing-flow design seed (ENG-435 plan §2a). Release bundles drop the require.
const seed: typeof import("@/dev/list-flow-seed") | null = __DEV__ ? require("@/dev/list-flow-seed") : null;

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
  const route = useRoute();
  const real = useListDraft();
  // A design fixture's seed (dev only): the frame's draft and run, every action a no-op, and every handler below
  // and the run-ending effect return early, so a seed never leaves this screen (plan §0.2, §0.3).
  const design = __DEV__ ? (route.params as { design?: ListFlowDesign } | undefined)?.design : undefined;
  const seeded = useMemo(() => (design && seed ? seed.seededFlow(design) : null), [design]);
  const flow = seeded ?? real;
  const { draft, run } = flow;
  const appear = useAppear();
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
    if (design) return;
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
    // Only what this run has delivered: until the server accepts a run on new
    // photos, the draft still holds the old photos' AI values, and those must
    // not appear as "found" on the new cover.
    const found = new Set(
      run.checklist.filter((row) => row.status === "filled").map((row) => row.field)
    );
    const list: FoundChip[] = [];
    const add = (key: string, label: string | null | undefined) => {
      if (label && !list.some((c) => c.label.toLowerCase() === label.toLowerCase())) {
        list.push({ key, label });
      }
    };
    if (found.has("brand_name") && f.brand_name.source === "ai") add("brand", f.brand_name.value);
    if (found.has("model_name") && f.model_name.source === "ai") add("model", f.model_name.value);
    if (found.has("category") && f.category.source === "ai" && f.category.value)
      add("category", categoryDisplayName(f.category.value.title));
    if (unreadable) list.push({ key: "unreadable", label: "Label", dashed: true });
    return list.slice(0, 4);
  }, [draft, unreadable, run.checklist]);

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
    if (design || !unreadable?.photo) return;
    flow.track("warning_action", { type: "unreadable", action: "retake" });
    const [picked] = await pickPhotos("camera", 1);
    if (!picked) return;
    flow.replacePhoto(unreadable.photo - 1, picked);
    await flow.waitForUploads();
    flow.startExtraction();
  };

  const onTypeIt = () => {
    if (design) return;
    if (unreadable) {
      flow.track("warning_action", { type: "unreadable", action: "type_it" });
      flow.dispatch({ type: "dismissWarning", warning: unreadable });
    }
    goToReview();
  };

  const onRetakePhoto = () => {
    if (design || !retakeWarning?.photo) return;
    flow.track("warning_action", { type: retakeWarning.type, action: "retake" });
    navigation.navigate("ListAddPhotos", { focusPhoto: retakeWarning.photo });
  };

  const onSkip = () => {
    if (design) return;
    goToReview();
  };

  const onKeep = () => {
    if (design || !retakeWarning) return;
    flow.track("warning_action", { type: retakeWarning.type, action: "keep" });
    flow.dispatch({ type: "dismissWarning", warning: retakeWarning });
  };

  const retakeCard = retakeWarning && !unreadable ? retakeWarning : null;

  return (
    <NonScrollableContainer>
      <FlowHeader title={unreadable ? "One photo needs a retake" : "List an item"} />

      {/* figma/10 2095:24471: the Stepper 8 down, then the panel and the checklist group 24 apart. */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: 8,
          paddingBottom: 24,
          gap: 24,
        }}
      >
        <StepProgress step={2} total={FLOW_STEPS} showLabel={false} />

        {unreadable ? (
          <Animated.View entering={appear.entering} exiting={appear.exiting}>
            <Text role="screenTitle" accessibilityRole="header">
              {warningHeadline(unreadable)}
            </Text>
          </Animated.View>
        ) : null}

        <Animated.View layout={appear.layout}>
          <ScanPanel
            uri={cover ? cover.remoteUrl ?? cover.localUri : null}
            scanning={reading}
            chips={chips}
            status={`Reading photo ${current} of ${total}`}
            // 200 beside a warning (2095:24375, 24471), 256 on its own (01 2082:14565).
            size={unreadable || retakeCard ? "compact" : "tall"}
            still={Boolean(design)}
          />
        </Animated.View>

        <Animated.View layout={appear.layout} style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            {/* Wraps before the count does: at 360dp and a large font the count was pushed out of the row. */}
            <Text role="sectionTitle" style={{ flexShrink: 1 }}>
              Filling in your listing
            </Text>
            <Text fontSize="text-sm" lineHeight={20} tone="dim">
              {pluralize(total, "photo")}
            </Text>
          </View>

          {retakeCard ? (
            <Animated.View
              key={warningKey(retakeCard)}
              entering={appear.entering}
              exiting={appear.exiting}
              layout={appear.layout}
              style={{ padding: 16, borderRadius: 12, backgroundColor: color.brandPanel, gap: 12 }}
            >
              <View style={{ gap: 4 }}>
                <Text fontSize="text-sm" lineHeight={20} fontWeight="font-semibold">
                  {warningHeadline(retakeCard)}
                </Text>
                {retakeCard.reason ? (
                  <Text fontSize="text-xs" lineHeight={16} tone="body">
                    {retakeCard.reason}
                  </Text>
                ) : null}
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button size="compact" variant="outline" style={{ flex: 1 }} onPress={onKeep}>
                  Keep it
                </Button>
                {retakeCard.photo ? (
                  <Button size="compact" style={{ flex: 1 }} onPress={onRetakePhoto}>
                    {`Retake photo ${retakeCard.photo}`}
                  </Button>
                ) : null}
              </View>
            </Animated.View>
          ) : null}

          <ExtractionChecklist checklist={run.checklist} draft={draft} running={reading} still={Boolean(design)} />
        </Animated.View>
      </ScrollView>

      {/* The actions cross-fade into the retake state instead of swapping
          in one frame. Keyed on that alone: remounting on every phase
          change also dropped the screen reader's focus. */}
      <Animated.View key={unreadable ? "unreadable" : "default"} entering={appear.entering}>
        {unreadable ? (
          <BottomBar
            layout="cta-text"
            primary={
              canRunAgain(draft)
                ? {
                    label: "Retake the label photo",
                    onPress: onRetakeLabel,
                    loading: reading && run.checklist.length === 0,
                  }
                : undefined
            }
            secondary={{ label: "Leave it blank — I'll type it", onPress: onTypeIt }}
          />
        ) : (
          // The frame's one full-width outline action (2095:24471, 01 2082:14565).
          <BottomBar
            layout="secondary-primary"
            secondary={{
              label: reading ? "Skip to review — we'll keep filling in" : "Go to review",
              onPress: onSkip,
            }}
          />
        )}
      </Animated.View>
    </NonScrollableContainer>
  );
}
