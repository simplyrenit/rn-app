import { draftPhotoQueue, usePhotoJobs } from "@/backend/draft-photo-jobs";
import { fetchAllNeedingPhotos } from "@/backend/draft-photos";
import { BottomBar, EmptyState, Skeleton, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { pickPhotos } from "@/components/list-flow/pick-photos";
import { useGlobalContext } from "@/context/global-context";
import { apiError } from "@/lib/api-error";
import { SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import {
  NeedingDraft,
  PhotoJob,
  Walk,
  currentDraft,
  frameHint,
  jobCounts,
  notAShopText,
  onItsWay,
  retakeWalk,
  skip,
  startWalk,
  stripText,
  took,
  upNext,
  walkProgress,
  walkSkipped,
  walkState,
} from "@/lib/draft-photos";
import { commitFeedback, tapFeedback } from "@/lib/haptics";
import { waitsText } from "@/lib/listing-status";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, TouchableOpacity, View } from "react-native";
import { CameraIcon, CheckCircleIcon, ExclamationTriangleIcon, PhotoIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "react-query";

/**
 * The strip under the progress bar: photos going up, and the ones that did not. A
 * photo that did not go up can be tried again (Retry) or let go of and shot again
 * ("Take again"): one that can never upload, because its file is gone or the server
 * will not take it, must not stay for ever, nor hide its draft (review round 1, finding 4).
 * The screen passes the jobs and both actions, so a design seed can show the strip inert.
 * 2094:22877 / 22940: 36 high, r12, padding 8/16, 14/20; muted, or the warning wash with the links 8 apart.
 */
function UploadStrip({ jobs, onRetry, onTakeAgain }: { jobs: readonly PhotoJob[]; onRetry: () => void; onTakeAgain: () => void }) {
  const { color } = useTheme();
  const counts = jobCounts(jobs);
  const strip = stripText(counts);
  if (!strip) return null;
  const warning = strip.tone === "warning";
  const action = (label: string, onPress: () => void) => (
    // The frame draws the links 20 high in a 36 strip; the slop keeps a usable target.
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={12}>
      <Text fontSize="text-sm" fontWeight="font-semibold" tone="brand">
        {label}
      </Text>
    </Pressable>
  );
  return (
    <View
      accessible={!warning}
      accessibilityLiveRegion="polite"
      accessibilityLabel={strip.text}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: radius.button,
        backgroundColor: warning ? color.warningWash : color.surfaceMuted,
      }}
    >
      <Text fontSize="text-sm" style={{ flex: 1, color: warning ? color.warning : color.textBody }}>
        {strip.text}
      </Text>
      {counts.failed > 0 ? action("Retry", onRetry) : null}
      {warning ? action("Take again", onTakeAgain) : null}
    </View>
  );
}

/** A camera is dark in both themes, as 2094:22877 draws it (#1C1C1E); the hint pill is black at 50%. */
const CAMERA_DARK = "#1C1C1E";
const HINT_SCRIM = "rgba(0,0,0,0.5)";

/**
 * SH-12's viewfinder: the system camera opens on tap, so this holds the frame and the hint.
 * 342×280 r16; a 246×162 dashed guide (2, dash 8 gap 6, r16) 48/40 in with a 36 camera at its centre; a 36 hint
 * pill 16 from the sides and the bottom.
 */
function Viewfinder({ title, disabled, onPress }: { title: string; disabled: boolean; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Take a photo of ${title}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      activeOpacity={0.9}
      onPress={onPress}
      style={{ height: 280, borderRadius: radius.card, backgroundColor: CAMERA_DARK, alignItems: "center", overflow: "hidden" }}
    >
      <View
        style={{
          marginTop: 40,
          width: 246,
          height: 162,
          borderRadius: radius.card,
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: color.onPhoto,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CameraIcon size={36} color={color.onPhoto} />
      </View>
      <View
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 16,
          height: 36,
          paddingHorizontal: 16,
          borderRadius: radius.full,
          backgroundColor: HINT_SCRIM,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text fontSize="text-sm" fontWeight="font-semibold" style={{ color: color.onPhoto }}>
          {frameHint()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/** An 80 ring (4, the text colour) on the canvas, holding a 58 brand disc. */
function Shutter({ disabled, onPress, label }: { disabled: boolean; onPress: () => void; label: string }) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        width: 80,
        height: 80,
        borderRadius: radius.full,
        borderWidth: 4,
        borderColor: color.text,
        backgroundColor: color.canvas,
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View style={{ width: 58, height: 58, borderRadius: radius.full, backgroundColor: color.brand }} />
    </TouchableOpacity>
  );
}

/**
 * One of three equal cards (2094:22877): 1px `line`, r12, padding 8, gap 4; a 56-high muted thumb (r8, as wide as
 * the card) — drawn here, as `booking/parts` Thumb is square — then the title 14/20 SemiBold, two lines, and the
 * code 12/16 `textBody`.
 */
function UpNextCard({ draft }: { draft: NeedingDraft }) {
  const { color } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`Up next: ${draft.title}${draft.shop_code ? `, ${draft.shop_code}` : ""}`}
      style={{ flex: 1, gap: 4, padding: 8, borderRadius: radius.button, borderWidth: 1, borderColor: color.line }}
    >
      <View style={{ height: 56, borderRadius: 8, backgroundColor: color.surfaceMuted }} />
      <Text fontSize="text-sm" fontWeight="font-semibold" numberOfLines={2} style={{ minHeight: 40 }}>
        {draft.title}
      </Text>
      {draft.shop_code ? (
        <Text fontSize="text-xs" tone="body" numberOfLines={1}>
          {draft.shop_code}
        </Text>
      ) : null}
    </View>
  );
}

/** Dev-only design seed (ENG-435): the walk and the upload jobs as the frame shows them. Only DevFixture passes it. */
type DraftPhotosDesign = { walk?: Walk; jobs?: PhotoJob[] };

/**
 * SH-12, the photo walk-through: "42 drafts need photos", one by one. The shop
 * shoots the draft on screen with the system camera, the photo goes up in the
 * background (`draftPhotoQueue`: it survives a dead connection, a closed app and
 * this screen being left), and the next draft comes up. "Skip for now" puts a draft
 * at the back; the skipped ones can be gone through again at the end, and any draft
 * left without a photo is still on the list the next time. Nothing here holds a
 * verdict about what the server has: the count and the drafts are the server's.
 */
export default function DraftPhotosScreen() {
  const navigation = useTypedNavigation();
  const route = useRoute();
  const design = __DEV__ ? (route.params as { design?: DraftPhotosDesign } | undefined)?.design : undefined;
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const { userDetails } = useGlobalContext();
  const username = userDetails?.username;
  const realJobs = usePhotoJobs();
  const jobs = design?.jobs ?? realJobs;
  // Under a seed the queue is never initialised here (the root hook in nav.tsx still runs, on the fixture's own
  // `design_…` key): a seeded walk needs no read, and a seed without one reads at once (2094:23035's error).
  const [ready, setReady] = useState(!!design && !design.walk);
  const [walk, setWalk] = useState<Walk | null>(design?.walk ?? null);
  const [launching, setLaunching] = useState(false);
  const opening = useRef(false);

  // The queue takes back what an earlier visit left, before the walk is worked out from it.
  useEffect(() => {
    if (design || !username) return;
    let live = true;
    void draftPhotoQueue.init(username).then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, [design, username]);

  const query = useQuery(["draft-photos-walk"], fetchAllNeedingPhotos, {
    enabled: ready,
    staleTime: 0,
    cacheTime: 0,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Worked out once, from the server's list; after that the walk is this screen's own.
  useEffect(() => {
    if (!query.data || walk) return;
    setWalk(startWalk(query.data.drafts, query.data.total, onItsWay(jobs)));
    // `jobs` is read once, as the walk begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, walk]);

  const draft = walk ? currentDraft(walk) : null;

  const shoot = async (source: "camera" | "gallery") => {
    if (design || !draft || opening.current) return;
    opening.current = true;
    setLaunching(true);
    try {
      const [photo] = await pickPhotos(source, 1);
      if (!photo) return;
      await draftPhotoQueue.enqueue({
        name: draft.name,
        title: draft.title,
        shop_code: draft.shop_code,
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
      });
      commitFeedback();
      setWalk((w) => (w ? took(w) : w));
    } finally {
      opening.current = false;
      setLaunching(false);
    }
  };

  const retry = () => {
    if (design) return;
    draftPhotoQueue.retryAll();
  };

  /** Lets go of the photos that did not go up, files included, and offers their drafts again. */
  const takeAgain = () => {
    if (design) return;
    const removed = draftPhotoQueue.removeFailed();
    if (removed.length > 0) setWalk((w) => (w ? retakeWalk(w, removed) : w));
  };

  const done = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("MainTabs"));
  const header = <SubpageHeader title={walk && walkState(walk) === "walking" ? walkProgress(walk).title : "Photos for drafts"} />;
  const strip = <UploadStrip jobs={jobs} onRetry={retry} onTakeAgain={takeAgain} />;

  if (!walk) {
    const failure = query.isError ? apiError(query.error) : null;
    const notShop = notAShopText(failure);
    return (
      <NonScrollableContainer>
        {header}
        {query.isError ? (
          // 2094:23035: top-aligned, 32 into the content; a brand chip and the compact Primary (no other fill here).
          <View style={{ paddingTop: 32 }}>
            <EmptyState
              icon={<ExclamationTriangleIcon size={32} color={color.brandText} />}
              title={notShop ? "This is for shops" : "We couldn't load your drafts"}
              body={notShop ?? "Check your connection and try again."}
              actionLabel={notShop ? undefined : "Try again"}
              onAction={notShop ? undefined : () => void query.refetch()}
              actionTone="primary"
            />
          </View>
        ) : (
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Loading your drafts"
            accessibilityState={{ busy: true }}
            style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 16, gap: 16 }}
          >
            <Skeleton width="100%" height={16} />
            <Skeleton width="60%" height={32} />
            <Skeleton width="100%" height={280} />
          </View>
        )}
      </NonScrollableContainer>
    );
  }

  const state = walkState(walk);
  const progress = walkProgress(walk);

  if (state !== "walking") {
    const nothing = walk.total === 0 && walk.taken === 0 && state === "finished";
    const skippedLeft = walk.skipped.length;
    return (
      <NonScrollableContainer>
        {header}
        {/* 2094:22940 / 22989: the empty state 32 into the content (full width: it pads its own 24), the strip 16
            under it on the gutter, then the kit bottom bar. */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 32, paddingBottom: 24, gap: 16 }}>
          <EmptyState
            icon={
              nothing ? (
                <PhotoIcon size={32} color={color.brandText} />
              ) : (
                <CheckCircleIcon size={32} color={color.brandText} />
              )
            }
            title={
              nothing
                ? "No drafts need photos"
                : state === "skipped_left"
                ? `${skippedLeft} ${skippedLeft === 1 ? "draft" : "drafts"} skipped for now`
                : "That's all of them"
            }
            body={
              nothing
                ? "Drafts that have a photo are ready to publish on the dashboard."
                : state === "skipped_left"
                ? "Go through them now, or come back to them later: they stay on the list."
                : "The photos are on their way to your drafts. Publish them from the dashboard."
            }
          />
          <View style={{ paddingHorizontal: SCREEN_GUTTER }}>{strip}</View>
        </ScrollView>
        {state === "skipped_left" ? (
          <BottomBar
            layout="cta-text"
            primary={{ label: "Go through the skipped ones", onPress: () => setWalk((w) => (w ? walkSkipped(w) : w)) }}
            secondary={{ label: "Done", onPress: done }}
          />
        ) : (
          <BottomBar layout="full-cta" primary={{ label: "Done", onPress: done }} />
        )}
      </NonScrollableContainer>
    );
  }

  const next = upNext(walk);
  // 2094:22877: padding 8 above and 24 below the content, 16 between its blocks.
  return (
    <NonScrollableContainer>
      {header}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: 8,
          paddingBottom: insets.bottom + 24,
          gap: 16,
        }}
      >
        <View style={{ gap: 4 }}>
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`${progress.done}, ${progress.left}`}
            style={{ height: 6, borderRadius: radius.full, backgroundColor: color.surfaceMuted, overflow: "hidden" }}
          >
            <View
              style={{
                width: `${progress.fraction * 100}%`,
                height: 6,
                borderRadius: radius.full,
                backgroundColor: color.brand,
              }}
            />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text fontSize="text-sm" tone="body">
              {progress.done}
            </Text>
            <Text fontSize="text-sm" tone="body">
              {progress.left}
            </Text>
          </View>
        </View>

        {strip}

        {draft ? (
          <>
            <View style={{ gap: 8 }}>
              <Text role="screenTitle" accessibilityRole="header">
                {draft.title}
              </Text>
              {draft.shop_code ? (
                <View
                  style={{
                    alignSelf: "flex-start",
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    backgroundColor: color.surfaceMuted,
                  }}
                >
                  <Text fontSize="text-sm" fontWeight="font-semibold" tone="body">
                    {draft.shop_code}
                  </Text>
                </View>
              ) : null}
              {waitsText(draft.waits_for_text) ? (
                <Text fontSize="text-sm" tone="body">
                  {waitsText(draft.waits_for_text)}
                </Text>
              ) : null}
            </View>

            <Viewfinder title={draft.title} disabled={launching} onPress={() => void shoot("camera")} />
            <Shutter disabled={launching} label={`Take a photo of ${draft.title}`} onPress={() => void shoot("camera")} />

            {/* "Skip for now" 16/24 in a 48 box (12/24 padding), then "Choose a photo instead" 14/20 in a 28 box, 4 apart. */}
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text
                fontSize="text-md"
                fontWeight="font-semibold"
                tone="brand"
                accessibilityRole="button"
                onPress={() => {
                  if (design || launching) return;
                  tapFeedback();
                  setWalk((w) => (w ? skip(w) : w));
                }}
                style={{ paddingVertical: 12, paddingHorizontal: 24 }}
              >
                Skip for now
              </Text>
              <Text
                fontSize="text-sm"
                fontWeight="font-semibold"
                tone="brand"
                accessibilityRole="button"
                onPress={() => void shoot("gallery")}
                style={{ paddingVertical: 4 }}
              >
                Choose a photo instead
              </Text>
            </View>
          </>
        ) : null}

        {next.length > 0 ? (
          <View style={{ gap: 12 }}>
            <Text role="groupHeader">Up next</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {next.map((d) => (
                <UpNextCard key={d.name} draft={d} />
              ))}
              {/* Keeps one or two cards the width of three, as the frame draws them. */}
              {Array.from({ length: 3 - next.length }, (_, i) => (
                <View key={`blank-${i}`} style={{ flex: 1 }} />
              ))}
            </View>
          </View>
        ) : null}

        <Text fontSize="text-sm" tone="dim" style={{ textAlign: "center" }}>
          One photo is enough to publish. Add more later.
        </Text>
      </ScrollView>
    </NonScrollableContainer>
  );
}
