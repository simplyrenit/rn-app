import { draftPhotoQueue, usePhotoJobs } from "@/backend/draft-photo-jobs";
import { fetchAllNeedingPhotos } from "@/backend/draft-photos";
import { Thumb } from "@/components/booking/parts";
import { Button, EmptyState, Skeleton, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { pickPhotos } from "@/components/list-flow/pick-photos";
import { useGlobalContext } from "@/context/global-context";
import { apiError } from "@/lib/api-error";
import { SCREEN_GUTTER, darkColors, radius, space } from "@/lib/design-tokens";
import {
  NeedingDraft,
  Walk,
  currentDraft,
  frameHint,
  jobCounts,
  notAShopText,
  pendingJobs,
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
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { CameraIcon, CheckCircleIcon, ExclamationTriangleIcon, PhotoIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "react-query";

/** The strip under the progress bar: photos going up, and the ones that did not, with Retry. */
function UploadStrip() {
  const { color } = useTheme();
  const jobs = usePhotoJobs();
  const strip = stripText(jobCounts(jobs));
  if (!strip) return null;
  const warning = strip.tone === "warning";
  return (
    <View
      accessible={!warning}
      accessibilityLiveRegion="polite"
      accessibilityLabel={strip.text}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        borderRadius: radius.button,
        backgroundColor: warning ? color.warningWash : color.surfaceRaised,
      }}
    >
      <Text fontSize="text-sm" style={{ flex: 1, color: warning ? color.warning : color.textBody }}>
        {strip.text}
      </Text>
      {warning ? (
        <Text
          fontSize="text-sm"
          fontWeight="font-bold"
          tone="brand"
          accessibilityRole="button"
          accessibilityLabel="Try the photos again"
          onPress={() => draftPhotoQueue.retryAll()}
          style={{ paddingVertical: space.xs, paddingLeft: space.sm }}
        >
          Retry
        </Text>
      ) : null}
    </View>
  );
}

/** SH-12's viewfinder: the system camera opens on tap, so this holds the frame and the hint. */
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
      style={{
        height: 280,
        borderRadius: radius.card,
        // A camera is dark in both themes, as the frame draws it.
        backgroundColor: darkColors.surface,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: "72%",
          height: "58%",
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
          left: space.md,
          right: space.md,
          bottom: space.md,
          paddingVertical: space.sm,
          borderRadius: radius.full,
          backgroundColor: color.photoScrim,
          alignItems: "center",
        }}
      >
        <Text fontSize="text-sm" fontWeight="font-bold" style={{ color: color.onPhoto }}>
          {frameHint()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

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

function UpNextCard({ draft }: { draft: NeedingDraft }) {
  const { color } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`Up next: ${draft.title}${draft.shop_code ? `, ${draft.shop_code}` : ""}`}
      style={{
        flex: 1,
        gap: space.xs,
        padding: space.sm,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: color.line,
        backgroundColor: color.surface,
      }}
    >
      <Thumb />
      <Text fontSize="text-sm" fontWeight="font-bold" numberOfLines={2}>
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
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const { userDetails } = useGlobalContext();
  const username = userDetails?.username;
  const jobs = usePhotoJobs();
  const [ready, setReady] = useState(false);
  const [walk, setWalk] = useState<Walk | null>(null);
  const [launching, setLaunching] = useState(false);
  const opening = useRef(false);

  // The queue takes back what an earlier visit left, before the walk is worked out from it.
  useEffect(() => {
    if (!username) return;
    let live = true;
    void draftPhotoQueue.init(username).then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, [username]);

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
    const onItsWay = new Set(pendingJobs(jobs).map((j) => j.name));
    setWalk(startWalk(query.data.drafts, query.data.total, onItsWay));
    // `jobs` is read once, as the walk begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, walk]);

  const draft = walk ? currentDraft(walk) : null;

  const shoot = async (source: "camera" | "gallery") => {
    if (!draft || opening.current) return;
    opening.current = true;
    setLaunching(true);
    try {
      const [photo] = await pickPhotos(source, 1);
      if (!photo) return;
      draftPhotoQueue.enqueue({
        name: draft.name,
        title: draft.title,
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

  const done = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("MainTabs"));
  const header = <SubpageHeader title={walk && walkState(walk) === "walking" ? walkProgress(walk).title : "Photos for drafts"} />;

  if (!walk) {
    const failure = query.isError ? apiError(query.error) : null;
    const notShop = notAShopText(failure);
    return (
      <NonScrollableContainer>
        {header}
        {query.isError ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <EmptyState
              variant="error"
              icon={<ExclamationTriangleIcon size={28} color={color.danger} />}
              title={notShop ? "This is for shops" : "We couldn't load your drafts"}
              body={notShop ?? "Check your connection and try again."}
              actionLabel={notShop ? undefined : "Try again"}
              onAction={notShop ? undefined : () => void query.refetch()}
            />
          </View>
        ) : (
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Loading your drafts"
            accessibilityState={{ busy: true }}
            style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.md, gap: space.md }}
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.xl, gap: space.md }}
        >
          <EmptyState
            icon={
              nothing ? (
                <PhotoIcon size={28} color={color.brandText} />
              ) : (
                <CheckCircleIcon size={28} color={color.success} />
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
          <UploadStrip />
          <View style={{ gap: space.sm, paddingBottom: insets.bottom + space.lg }}>
            {state === "skipped_left" ? (
              <Button onPress={() => setWalk((w) => (w ? walkSkipped(w) : w))}>Go through the skipped ones</Button>
            ) : null}
            <Button variant={state === "skipped_left" ? "outline" : "primary"} onPress={done}>
              Done
            </Button>
          </View>
        </ScrollView>
      </NonScrollableContainer>
    );
  }

  const next = upNext(walk);
  return (
    <NonScrollableContainer>
      {header}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.sm,
          paddingBottom: insets.bottom + space.lg,
          gap: space.md,
        }}
      >
        <View style={{ gap: space.xs }}>
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`${progress.done}, ${progress.left}`}
            style={{ height: 6, borderRadius: radius.full, backgroundColor: color.surfaceRaised, overflow: "hidden" }}
          >
            <View
              style={{
                width: `${Math.round(progress.fraction * 100)}%`,
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

        <UploadStrip />

        {draft ? (
          <>
            <View style={{ gap: space.sm }}>
              <Text role="screenTitle" accessibilityRole="header">
                {draft.title}
              </Text>
              {draft.shop_code ? (
                <View
                  style={{
                    alignSelf: "flex-start",
                    paddingHorizontal: space.sm,
                    paddingVertical: 3,
                    borderRadius: radius.button / 2,
                    backgroundColor: color.surfaceRaised,
                  }}
                >
                  <Text fontSize="text-sm" fontWeight="font-bold" tone="body">
                    {draft.shop_code}
                  </Text>
                </View>
              ) : null}
            </View>

            <Viewfinder title={draft.title} disabled={launching} onPress={() => void shoot("camera")} />
            <Shutter disabled={launching} label={`Take a photo of ${draft.title}`} onPress={() => void shoot("camera")} />

            <View style={{ alignItems: "center" }}>
              <Text
                fontSize="text-md"
                fontWeight="font-bold"
                tone="brand"
                accessibilityRole="button"
                onPress={() => {
                  if (launching) return;
                  tapFeedback();
                  setWalk((w) => (w ? skip(w) : w));
                }}
                style={{ paddingVertical: space.md, paddingHorizontal: space.lg }}
              >
                Skip for now
              </Text>
              <Text
                fontSize="text-sm"
                fontWeight="font-bold"
                tone="brand"
                accessibilityRole="button"
                onPress={() => void shoot("gallery")}
                style={{ paddingVertical: space.xs }}
              >
                Choose a photo instead
              </Text>
            </View>
          </>
        ) : null}

        {next.length > 0 ? (
          <View style={{ gap: space.sm }}>
            <Text role="groupHeader">Up next</Text>
            <View style={{ flexDirection: "row", gap: space.sm }}>
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
