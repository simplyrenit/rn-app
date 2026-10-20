import { acceptOwnerTerms, isTermsVersionOld, termsQueryKey, useTerms } from "@/backend/terms";
import { Button, Text } from "@/components/core";
import { OwnerTermsTick } from "@/components/terms/owner-terms-tick";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { RETAKE_WARNINGS, WARNING_TAG, warningHeadline } from "@/components/list-flow/copy";
import { FlowHeader } from "@/components/list-flow/flow-header";
import { useAppear } from "@/components/list-flow/motion";
import { pickPhotos } from "@/components/list-flow/pick-photos";
import { AddPhotoTile, PhotoTile } from "@/components/list-flow/photo-tile";
import { AddPhotoSheet, ResumeDraftSheet } from "@/components/list-flow/sheets";
import { useGlobalContext } from "@/context/global-context";
import { termsGate, termsHold, termsHoldLine } from "@/lib/list-flow/terms-gate";
import { useListDraft } from "@/context/list-draft-context";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import {
  MAX_PHOTOS,
  canRunAgain,
  draftDisplayTitle,
  photosChangedSinceRun,
  uploadedPhotos,
  warningKey,
} from "@/lib/list-flow/draft";
import { ListingWarning, PhotoSource } from "@/lib/list-flow/types";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useRoute } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Linking, ScrollView, useWindowDimensions, View } from "react-native";
import { useQueryClient } from "react-query";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COLUMNS = 3;
const GRID_GAP = 10;

/**
 * L-12 Add photos (and the L-12b stock-photo state), IMPLEMENTATION.md §8.2.
 *
 * Photos upload the moment they are added; extraction waits for Continue, so
 * the model sees every photo at once and runs once per attempt (§1.1).
 */
export default function ListAddPhotosScreen() {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProps<"ListAddPhotos">>();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const flow = useListDraft();
  const tileMotion = useAppear();
  const { draft, hydrated, resumable, run } = flow;

  const addSheet = useRef<BottomSheetModal>(null);
  const resumeSheet = useRef<BottomSheetModal>(null);
  const decided = useRef(false);
  /** Set while the sheet is open to replace a photo rather than add one. */
  const replaceIndex = useRef<number | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [resumeTitle, setResumeTitle] = useState("last");

  // The owner terms (ENG-122): asked at the start of a listing until accepted.
  // Ordinarily, while the terms are loading, or if they cannot be read, nothing is
  // held back: the server refuses a submit without them and Preview brings the
  // owner back here. Once it has (`termsNeeded`), this step holds Continue until the
  // terms have been read, and says so while they cannot be.
  const termsQuery = useTerms();
  const { data: terms } = termsQuery;
  const termsRefused = Boolean(route.params?.termsNeeded);
  const { userDetails } = useGlobalContext();
  const queryClient = useQueryClient();
  const [ownerTermsTick, setOwnerTermsTick] = useState(false);
  const ownerTerms = terms?.owner;
  const gate = termsGate({
    accepted: ownerTerms?.accepted,
    read: Boolean(ownerTerms),
    failed: termsQuery.isError && !ownerTerms,
    fetching: termsQuery.isFetching,
    refused: termsRefused,
  });
  const needsOwnerTerms = gate === "tick";
  const termsFailed = gate === "failed";
  const termsHeld = termsHold(gate, ownerTermsTick, termsRefused);
  const shownWarnings = useRef(new Set<string>());

  // ---- Opening: fresh draft or the resume sheet ------------------------------

  useEffect(() => {
    if (!hydrated || decided.current) return;
    if (resumable) {
      setResumeTitle(draftDisplayTitle(resumable));
      resumeSheet.current?.present();
      return;
    }
    decided.current = true;
    flow.startFresh();
    flow.track("listing_started", { resumed_draft: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, resumable]);

  const onResume = () => {
    decided.current = true;
    resumeSheet.current?.dismiss();
    flow.resume();
    flow.track("listing_started", { resumed_draft: true });
    // A draft that already reached Review goes back there, with its fields.
    const target = resumable;
    if (target && (target.extractionRuns > 0 || target.fields.title.value || target.fields.plans.value)) {
      navigation.navigate("ListReview");
    }
  };

  const onDiscard = () => {
    decided.current = true;
    resumeSheet.current?.dismiss();
    flow.discard();
    flow.startFresh();
    flow.track("listing_started", { resumed_draft: false });
  };

  // Swiping the sheet away is not a choice to lose work: keep the draft.
  const onResumeDismiss = () => {
    if (!decided.current) onResume();
  };

  // ---- L-12b -----------------------------------------------------------------

  const focusPhoto = route.params?.focusPhoto;
  const focusWarning: ListingWarning | undefined = draft?.warnings.find(
    (w) =>
      w.photo === focusPhoto &&
      RETAKE_WARNINGS.includes(w.type) &&
      !draft.dismissedWarnings.includes(warningKey(w))
  );

  useEffect(() => {
    if (!focusWarning) return;
    const key = warningKey(focusWarning);
    if (shownWarnings.current.has(key)) return;
    shownWarnings.current.add(key);
    flow.track("warning_shown", { type: focusWarning.type, photo: focusWarning.photo });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusWarning]);

  // ---- Photos ----------------------------------------------------------------

  const photos = draft?.photos ?? [];
  const tileSize = Math.floor((width - SCREEN_GUTTER * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS);
  const doneCount = draft ? uploadedPhotos(draft).length : 0;

  const openAddSheet = (replace: number | null = null) => {
    replaceIndex.current = replace;
    addSheet.current?.present();
  };

  const onPick = async (source: PhotoSource) => {
    addSheet.current?.dismiss();
    const replace = replaceIndex.current;
    replaceIndex.current = null;
    if (replace !== null) {
      const [picked] = await pickPhotos(source, 1);
      if (picked) flow.replacePhoto(replace, picked);
      return;
    }
    const picked = await pickPhotos(source, MAX_PHOTOS - photos.length);
    if (picked.length) flow.addPhotos(picked);
  };

  const onTileLongPress = (id: string, index: number) => {
    const isCover = draft?.coverIndex === index;
    Alert.alert(`Photo ${index + 1}`, undefined, [
      ...(isCover
        ? []
        : [{ text: "Set as cover", onPress: () => flow.dispatch({ type: "setCover", id }) }]),
      { text: "Remove", style: "destructive" as const, onPress: () => flow.removePhoto(id) },
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  // ---- Continue --------------------------------------------------------------

  // `proceed` runs after awaiting uploads, so it reads the context through a
  // ref: the `flow` this render closed over would be the pre-wait draft.
  const flowRef = useRef(flow);
  flowRef.current = flow;

  const proceed = () => {
    const { draft: current, run: currentRun } = flowRef.current;
    if (!current) return;
    const shouldRun =
      current.extractionRuns === 0 || (photosChangedSinceRun(current) && canRunAgain(current));
    if (shouldRun) {
      flowRef.current.startExtraction();
      navigation.navigate("ListReading");
    } else if (currentRun.status === "running") {
      navigation.navigate("ListReading");
    } else {
      navigation.navigate("ListReview");
    }
  };

  /** Sends the tick if one is owed. False means stay here: the owner has been told why. */
  const recordOwnerTerms = async () => {
    if (!needsOwnerTerms || !ownerTerms) return true;
    try {
      const updated = await acceptOwnerTerms(ownerTerms.version);
      queryClient.setQueryData(termsQueryKey(userDetails?.username), updated);
      // A later version asks again, with an empty box.
      setOwnerTermsTick(false);
      navigation.setParams({ termsNeeded: undefined });
      return true;
    } catch (error) {
      if (isTermsVersionOld(error)) {
        // The terms moved on while the box was open. What was ticked was the old
        // page, so the box is emptied and the new page is read again.
        void queryClient.invalidateQueries(termsQueryKey(userDetails?.username));
        setOwnerTermsTick(false);
        toast.warning("The owner terms were updated", { message: "Read them and tick again." });
        return false;
      }
      toast.error("We couldn't save your acceptance", {
        message: "Check your connection and try again.",
      });
      return false;
    }
  };

  const openOwnerTerms = () => {
    // The owner terms page and nothing else, as at sign-up: what is recorded with the
    // tick is an acceptance of this page, so the app's general Terms screen is no
    // stand-in for it. If the page cannot be opened, the owner is told so.
    const couldNotOpen = () =>
      toast.error("We couldn't open the owner terms", { message: "Check your connection and try again." });
    if (!ownerTerms?.url) {
      couldNotOpen();
      return;
    }
    Linking.openURL(ownerTerms.url).catch(couldNotOpen);
  };

  const onContinue = async () => {
    setContinuing(true);
    try {
      if (!(await recordOwnerTerms())) return;
      await flow.waitForUploads();
    } finally {
      setContinuing(false);
    }
    proceed();
  };

  const onManual = async () => {
    setContinuing(true);
    try {
      if (!(await recordOwnerTerms())) return;
    } finally {
      setContinuing(false);
    }
    flow.track("manual_path_chosen", { from: "L-12" });
    navigation.navigate("ListReview", { manual: true });
  };

  const onRetake = () => {
    if (!focusWarning?.photo) return;
    flow.track("warning_action", { type: focusWarning.type, action: "retake" });
    openAddSheet(focusWarning.photo - 1);
  };

  const onKeep = () => {
    if (!focusWarning) return;
    flow.track("warning_action", { type: focusWarning.type, action: "keep" });
    flow.dispatch({ type: "dismissWarning", warning: focusWarning });
    navigation.setParams({ focusPhoto: undefined });
    if (run.status === "running") navigation.navigate("ListReading");
    else navigation.navigate("ListReview");
  };

  const tagFor = (index: number) => {
    const warning = draft?.warnings.find(
      (w) =>
        w.photo === index + 1 &&
        RETAKE_WARNINGS.includes(w.type) &&
        !draft.dismissedWarnings.includes(warningKey(w))
    );
    return warning && index + 1 === focusPhoto ? WARNING_TAG[warning.type] ?? null : null;
  };

  return (
    <NonScrollableContainer>
      <FlowHeader step={1} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.md,
          paddingBottom: space.lg,
        }}
      >
        <Text fontSize="text-xl" fontWeight="font-bold" accessibilityRole="header">
          {"Snap it.\nWe'll write the listing."}
        </Text>
        <Text tone="body" fontSize="text-md" style={{ marginTop: space.sm }}>
          Start with one photo — it becomes your cover. Add more if you like.
        </Text>
        <Text fontSize="text-xs" tone="dim" style={{ marginTop: space.xs }}>
          Photos are read by AI to fill in your listing.
        </Text>

        <View
          style={{
            marginTop: space.lg,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: GRID_GAP,
          }}
        >
          {/* Tiles fade up as they arrive and fade out when removed, and the
              rest glide into place instead of snapping. */}
          {photos.map((photo, index) => (
            <Animated.View
              key={photo.id}
              entering={tileMotion.entering}
              exiting={tileMotion.exiting}
              layout={tileMotion.layout}
            >
              <PhotoTile
                photo={photo}
                index={index}
                size={tileSize}
                isCover={draft?.coverIndex === index}
                warningTag={tagFor(index)}
                onLongPress={() => onTileLongPress(photo.id, index)}
                onRetry={() => flow.retryPhoto(photo.id)}
              />
            </Animated.View>
          ))}
          {photos.length < MAX_PHOTOS ? (
            <Animated.View key="add" layout={tileMotion.layout}>
              <AddPhotoTile
                size={tileSize}
                label={photos.length ? "Add more · up to 5" : "Add a photo · up to 5"}
                onPress={() => openAddSheet(null)}
              />
            </Animated.View>
          ) : null}
        </View>

        <View
          style={{
            marginTop: space.lg,
            padding: space.md,
            borderRadius: radius.group,
            backgroundColor: focusWarning ? color.brandPanel : color.surfaceRaised,
            borderWidth: focusWarning ? 1 : 0,
            borderColor: color.brandPanelLine,
          }}
        >
          {focusWarning ? (
            <>
              <Text fontSize="text-sm" fontWeight="font-bold">
                {warningHeadline(focusWarning)}
              </Text>
              {focusWarning.reason ? (
                <Text fontSize="text-xs" tone="body" style={{ marginTop: 2 }}>
                  {focusWarning.reason}
                </Text>
              ) : null}
            </>
          ) : (
            <Text fontSize="text-sm" tone="body">
              Tip: a clear shot of the label helps the AI get the exact model right.
            </Text>
          )}
        </View>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.sm,
          paddingBottom: insets.bottom + space.sm,
          gap: space.xs,
        }}
      >
        {focusWarning?.photo ? (
          <>
            <Button onPress={onRetake}>{`Retake photo ${focusWarning.photo}`}</Button>
            <Button variant="ghost" onPress={onKeep}>
              Keep it and continue
            </Button>
          </>
        ) : (
          <>
            {needsOwnerTerms ? (
              <>
                <OwnerTermsTick
                  checked={ownerTermsTick}
                  onChange={setOwnerTermsTick}
                  onOpenTerms={openOwnerTerms}
                />
                {termsHoldLine(gate, ownerTermsTick) ? (
                  <Text tone="dim" fontSize="text-sm" accessibilityLiveRegion="polite">
                    {termsHoldLine(gate, ownerTermsTick)}
                  </Text>
                ) : null}
              </>
            ) : termsFailed ? (
              // The read failed: say so, with a way to try again, rather than showing
              // nothing about terms at all.
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm }}>
                <Text tone={termsRefused ? "danger" : "dim"} fontSize="text-sm" style={{ flex: 1 }}>
                  {termsRefused
                    ? "We couldn't load the owner terms, and they are needed to submit."
                    : "We couldn't check the owner terms."}
                </Text>
                <Button variant="outline" size="compact" loading={termsQuery.isFetching} onPress={() => void termsQuery.refetch()}>
                  Try again
                </Button>
              </View>
            ) : gate === "checking" ? (
              <Text tone="dim" fontSize="text-sm" accessibilityLiveRegion="polite">
                Checking the owner terms…
              </Text>
            ) : null}
            <Button
              disabled={doneCount === 0 || termsHeld}
              loading={continuing}
              onPress={onContinue}
            >
              Continue
            </Button>
            <Button
              variant="ghost"
              disabled={continuing || termsHeld}
              onPress={onManual}
            >
              I'll fill it in myself
            </Button>
          </>
        )}
      </View>

      <AddPhotoSheet ref={addSheet} onPick={onPick} />
      <ResumeDraftSheet
        ref={resumeSheet}
        title={resumeTitle}
        onContinue={onResume}
        onDiscard={onDiscard}
        onDismiss={onResumeDismiss}
      />
    </NonScrollableContainer>
  );
}
