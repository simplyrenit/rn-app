import { captureQueue, useCaptureDraft } from "@/backend/capture-jobs";
import { capturesQueryKey, confirmPhoneFallback, readKeptShotList, startPhoneFallback, useShotList } from "@/backend/captures";
import { GetHelp } from "@/components/booking/get-help";
import { BookingLoading, BottomBar, Notice, Panel, TextButton } from "@/components/booking/parts";
import { placeNow, recordVideo, recoverLostShot, takePhoto } from "@/components/capture/camera";
import { CameraOffNotice } from "@/components/capture/camera-off";
import { CODE_LENGTH, CodeInput } from "@/components/capture/code";
import { UploadBar } from "@/components/capture/record-card";
import { Button, SubpageHeader, Text, TextField } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { apiError } from "@/lib/api-error";
import {
  CAMERA_ONLY,
  CaptureDraft,
  DESK_FINISHES,
  FRAME_NOTE,
  PhoneFallback,
  ShotList,
  VIDEO_SECONDS,
  videoHintText,
  addShot,
  reopenForMissing,
  reopenedText,
  canSeal,
  needsSealNumber,
  sealNumberOf,
  setSealNumber,
  captureHeading,
  captureId,
  chooseList,
  codeConfirmed,
  confirmFailure,
  draftState,
  durationLabel,
  fallbackErrorText,
  idMatchWords,
  listSourceNote,
  FILES_KEPT,
  NO_MORE_CODES,
  markCodeDead,
  markNoMoreCodes,
  needsDesk,
  needsIdMatch,
  nextStep,
  noticeRows,
  otherSide,
  seal,
  setIdMatch,
  setVideo,
  shotChip,
  listFor,
  startDraft,
  tick,
  uploadProgress,
  videoLabel,
  withList,
  withShooting,
} from "@/lib/capture";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, darkColors, radius, space } from "@/lib/design-tokens";
import { commitFeedback, tapFeedback } from "@/lib/haptics";
import { pluralize } from "@/lib/pluralize";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { ArrowUturnLeftIcon, CameraIcon, CheckCircleIcon, ClockIcon, EyeIcon } from "react-native-heroicons/outline";
import { CheckIcon } from "react-native-heroicons/solid";
import { useQueryClient } from "react-query";

const NOTICE_ICON = { camera: CameraIcon, eye: EyeIcon, clock: ClockIcon } as const;

/** BK-15, "Before you record": what is recorded, who can see it, how long it is kept, and what will be shot. */
function Intro({ list, side, lead }: { list: ShotList; side: CaptureDraft["side"]; lead: string | null }) {
  const { color } = useTheme();
  return (
    <>
      {lead ? <Notice tone="brand">{lead}</Notice> : null}
      <Panel style={{ paddingHorizontal: space.md }}>
        {noticeRows(list, side).map((row, index) => {
          const Icon = NOTICE_ICON[row.icon];
          return (
            <View
              key={row.title}
              accessible
              accessibilityLabel={`${row.title}: ${row.body}`}
              style={{
                flexDirection: "row",
                gap: space.md,
                paddingVertical: space.md,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: color.line,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.full,
                  backgroundColor: color.brandPanel,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={20} color={color.brandText} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text fontSize="text-md" fontWeight="font-bold">
                  {row.title}
                </Text>
                <Text fontSize="text-sm" tone="body">
                  {row.body}
                </Text>
              </View>
            </View>
          );
        })}
      </Panel>
      <Notice icon="info">{FRAME_NOTE}</Notice>
      <Text role="sectionTitle" accessibilityRole="header">
        What you'll shoot
      </Text>
      <Panel style={{ paddingHorizontal: space.md }}>
        {[...list.shots.map((shot) => shot.label), `A ${VIDEO_SECONDS}-second video`].map((label, index) => (
          <View
            key={`${index}-${label}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.md,
              minHeight: MIN_TOUCH_TARGET,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: color.line,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: radius.full,
                backgroundColor: color.brandPanel,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text fontSize="text-xs" fontWeight="font-bold" tone="brand">
                {index + 1}
              </Text>
            </View>
            <Text fontSize="text-md" style={{ flex: 1 }}>
              {label}
            </Text>
          </View>
        ))}
      </Panel>
    </>
  );
}

/**
 * BK-16 and BK-17's viewfinder. The system camera opens on a tap, so this holds
 * the chip, the hint and the dashed frame, and shows the photo once it is taken.
 */
function Viewfinder({
  chip,
  hint,
  photo,
  label,
  disabled,
  onPress,
}: {
  chip: string;
  hint: string;
  photo: string | null;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const pill = {
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    borderRadius: radius.full,
    backgroundColor: darkColors.photoScrim,
  } as const;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      activeOpacity={0.9}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 240,
        borderRadius: radius.card,
        // A camera is dark in both themes, as the frames draw it.
        backgroundColor: darkColors.surface,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" accessible={false} />
      ) : (
        <View
          style={{
            width: "76%",
            height: "46%",
            borderRadius: radius.card,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: darkColors.textDim,
          }}
        />
      )}
      <View style={[pill, { position: "absolute", top: space.md, left: space.md, maxWidth: "88%" }]}>
        <Text fontSize="text-sm" fontWeight="font-bold" numberOfLines={1} style={{ color: darkColors.text }}>
          {chip}
        </Text>
      </View>
      {hint ? (
        <View style={[pill, { position: "absolute", bottom: space.md, maxWidth: "88%" }]}>
          <Text fontSize="text-sm" fontWeight="font-bold" style={{ color: darkColors.text, textAlign: "center" }}>
            {hint}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

/** The row of numbered tiles: a tick for a shot taken, the one being shot outlined. A tap picks a shot to take again. */
function ShotTiles({ draft, current, onPick }: { draft: CaptureDraft; current: number | null; onPick: (index: number) => void }) {
  const { color } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ flexGrow: 0 }}>
      {draft.list.shots.map((shot, index) => {
        const taken = Boolean(draft.shots[shot.key]);
        const active = index === current;
        return (
          <TouchableOpacity
            key={shot.key}
            accessibilityRole="button"
            accessibilityLabel={`Photo ${index + 1}, ${shot.label}${taken ? ", taken. Take it again" : ""}`}
            accessibilityState={{ selected: active }}
            activeOpacity={0.7}
            onPress={() => onPick(index)}
            style={{
              width: 48,
              height: 48,
              borderRadius: radius.button,
              borderWidth: active ? 2 : 1,
              borderColor: active ? color.brand : taken ? "transparent" : color.line,
              backgroundColor: active ? color.brandPanel : taken ? color.successWash : color.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {taken && !active ? (
              <CheckIcon size={20} color={color.success} />
            ) : (
              <Text fontSize="text-md" fontWeight="font-bold" tone={active ? "brand" : "body"}>
                {index + 1}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

/** The round button under the viewfinder: brand for a photo, red for the video. */
function Shutter({ kind, disabled, onPress, label }: { kind: "photo" | "video"; disabled: boolean; onPress: () => void; label: string }) {
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
        width: 76,
        height: 76,
        borderRadius: radius.full,
        borderWidth: 4,
        borderColor: color.text,
        backgroundColor: color.canvas,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View
        style={
          kind === "photo"
            ? { width: 56, height: 56, borderRadius: radius.full, backgroundColor: color.brand }
            : { width: 28, height: 28, borderRadius: 8, backgroundColor: color.danger }
        }
      />
    </TouchableOpacity>
  );
}

/** A row that is ticked by tapping anywhere on it. */
function TickRow({ label, sub, ticked, first, onPress }: { label: string; sub?: string; ticked: boolean; first: boolean; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="checkbox"
      accessibilityState={{ checked: ticked }}
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
      activeOpacity={0.7}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        minHeight: MIN_TOUCH_TARGET + 8,
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: color.line,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: radius.full,
          borderWidth: ticked ? 0 : 1.5,
          borderColor: color.inputLine,
          backgroundColor: ticked ? color.brand : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {ticked ? <CheckIcon size={14} color={color.onBrand} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text fontSize="text-md">{label}</Text>
        {sub ? (
          <Text fontSize="text-sm" tone="body">
            {sub}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

/**
 * The capture: one person's record of the item's condition, at the handover or
 * at the return (BK-15 to BK-17; ENG-221). The notice first, then the shots the
 * server's list asks for one by one, the short video, and the ticks for what is
 * included. Camera only. Each file starts uploading as soon as it is taken and
 * the record is finished only when the server has every file; until then it is
 * kept on the phone, so the walk works with no signal and survives a closed app.
 *
 * `forOther`: the other person's phone failed, and this phone records their set
 * too. A code goes to their phone by SMS; they read it out to confirm the set.
 */
export default function CaptureScreen() {
  const { params } = useRoute<RouteProps<"Capture">>();
  const { number, moment, role } = params;
  const forOther = Boolean(params.forOther);
  const side = forOther ? otherSide(role) : role;
  const otherName = params.other || (role === "customer" ? "the shop" : "the customer");
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const queryClient = useQueryClient();
  const { userDetails } = useGlobalContext();
  const username = userDetails?.username;
  // The queue is bound at the app's root. The screen still waits for what an earlier
  // run left on the phone, so it never starts a record over one that is being read back.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!username) return;
    let live = true;
    void captureQueue.init(username).then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, [username]);

  const draft = useCaptureDraft(number, moment, side);
  const listQuery = useShotList(number);
  // The list this record walks: on a courier booking the owner's handover record also asks for the seal (B1).
  const fetched = useMemo(() => listFor(listQuery.data, moment, side), [listQuery.data, moment, side]);
  // The copy of this booking's list the phone kept from an earlier read: undefined until looked for, null when there is none.
  const [kept, setKept] = useState<ShotList | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void readKeptShotList(number).then((found) => live && setKept(found));
    return () => {
      live = false;
    };
  }, [number]);
  // The person will not wait for a read that is not answering.
  const [noWait, setNoWait] = useState(false);
  // A new record begins from the server's list, else the kept copy, else (with no
  // connection) the general list the app carries: a capture can always begin.
  // A basket's keys name each item (cart D18): Renit's general list would be refused, so it waits for a real list.
  const basket = Boolean(params.basket);
  const chosen =
    ready && !draft
      ? chooseList({
          fetched,
          kept: listFor(kept, moment, side),
          offline: !basket && (listQuery.isError || noWait),
          idMatch: Boolean(params.id_match),
        })
      : null;
  const list = draft?.list ?? chosen?.list ?? null;

  // A shot picked to be taken again; null follows the walk.
  const [target, setTarget] = useState<number | null>(null);
  // Opened on one shot (a basket's "Take" or "Take again"): the walk starts there, once.
  const aimed = useRef(false);
  useEffect(() => {
    if (aimed.current || !draft || !params.shot) return;
    aimed.current = true;
    const index = draft.list.shots.findIndex((s) => s.key === params.shot);
    if (index >= 0) setTarget(index);
  }, [draft, params.shot]);
  const [launching, setLaunching] = useState(false);
  const opening = useRef(false);
  // The phone-fallback code: where it went, the digits typed, and the call in flight.
  const [fallback, setFallback] = useState<PhoneFallback | null>(null);
  const [code, setCode] = useState("");
  const [round, setRound] = useState(0);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const id = captureId(number, moment, side);
  const update = (fn: (d: CaptureDraft) => CaptureDraft) => captureQueue.update(id, fn);

  // Staff can change a list without a release: a draft takes the newer one, keeping its photos.
  const fresh = fetched;
  useEffect(() => {
    if (fresh && draft && !draft.done) captureQueue.update(id, (d) => withList(d, fresh));
    // Only when a newer list arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh]);

  // The place is asked for as the walk begins, so its permission prompt never lands on top of the camera.
  const walking = Boolean(draft) && !draft?.sealed;
  useEffect(() => {
    if (walking) void placeNow();
  }, [walking]);

  const heading = captureHeading(moment, forOther, otherName);
  const leave = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("MainTabs"));

  // The queue lets go of a record the booking no longer takes (it ended, or closed without it).
  const had = useRef(false);
  if (draft) had.current = true;
  const dropped = had.current && !draft;
  useEffect(() => {
    if (!dropped) return;
    toast.info("This record is no longer needed", { message: "Renit already has it, or the booking has moved on." });
    leave();
    // Once, when the record goes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropped]);
  const stamp = () => new Date(Date.now() + (params.skew_ms ?? 0)).toISOString();

  // Android may close the app while its camera is in front; the photo is handed back at the next start.
  useEffect(() => {
    if (ready) void recoverLostShot(stamp);
    // Once, when the queue has what an earlier run left.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  /** One go at the camera at a time: a second tap while it opens does nothing. */
  const withCamera = async (work: () => Promise<void>) => {
    if (opening.current) return;
    opening.current = true;
    setLaunching(true);
    try {
      await work();
    } finally {
      opening.current = false;
      setLaunching(false);
    }
  };

  /** Sends the code to the other person. `offline`: the call got no answer at all. */
  const sendCode = async (): Promise<"sent" | "offline" | "refused"> => {
    if (working) return "refused";
    setWorking(true);
    setCodeError(null);
    try {
      setFallback(await startPhoneFallback(number, moment));
      return "sent";
    } catch (error) {
      const failure = apiError(error);
      const text = fallbackErrorText(failure);
      setCodeError(text);
      // Three codes have gone for this booking and no more can be sent: the desk finishes it if the last one fails.
      if (failure?.code === "rate_limited") update(markNoMoreCodes);
      const offline = !failure || failure.status === 0;
      if (!offline) toast.error("We couldn't send the code", { message: text });
      return offline ? "offline" : "refused";
    } finally {
      setWorking(false);
    }
  };

  const start = async () => {
    if (!chosen) return;
    if (forOther) {
      // The server takes the other person's set only once the code has gone to their phone.
      // With no connection the record is still made now; the code is sent before it is.
      const sent = await sendCode();
      if (sent === "refused") return;
      if (sent === "offline") {
        setCodeError(null);
        // Nothing sends the code later: say so, and where to send it once there is a connection.
        toast.info("No connection: record now", {
          message: `${otherName} has not been sent the code yet. When you are back online, open this record and send it.`,
        });
      }
    }
    captureQueue.start(
      startDraft({ number, moment, side, forOther, list: chosen.list, generic: chosen.source === "generic", courier: params.courier })
    );
  };

  const confirmCode = async () => {
    if (working || code.length !== CODE_LENGTH) return;
    setWorking(true);
    setCodeError(null);
    try {
      await confirmPhoneFallback(number, moment, code);
      update(codeConfirmed);
      void queryClient.invalidateQueries(capturesQueryKey(number));
      toast.success("Confirmed");
    } catch (error) {
      const failure = apiError(error);
      const result = confirmFailure(failure);
      // No more codes can be sent and this one is spent or has run out: it can never be confirmed from here.
      if (failure?.code === "code_expired" || (failure?.code === "wrong_code" && failure.details?.tries_left === 0)) {
        update(markCodeDead);
      }
      if (result.kind === "confirmed") {
        // Already complete: a confirm whose answer was lost got through.
        update(codeConfirmed);
        void queryClient.invalidateQueries(capturesQueryKey(number));
      } else if (result.kind === "reopened") {
        // A file never reached Renit's storage: the record is open again for exactly those, and the code is asked for after.
        // What the phone does decides the words: a file it still holds is sent again by itself; one it does not is taken again.
        update((d) => reopenForMissing(d, result.missing));
        setCodeError(reopenedText(draft ? reopenForMissing(draft, result.missing) : { sealed: false }));
      } else {
        setCodeError(result.text);
      }
      setCode("");
      setRound((r) => r + 1);
    } finally {
      setWorking(false);
    }
  };

  // ---- Before the walk: loading, then the notice -------------------------------------------------

  if (!draft || !ready) {
    return (
      <NonScrollableContainer>
        <SubpageHeader title={heading.header} />
        {(!list || !chosen) && basket && listQuery.isError && kept === null ? (
          // MR-09c: no list on the phone and no connection. A basket can't start on the general list.
          <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.md, gap: space.md }}>
            <Notice tone="warning" icon="warning" title="Connect to start">
              {`Shots for ${pluralize(params.items ?? 2, "item")} need the internet.`}
            </Notice>
            <Button onPress={() => void listQuery.refetch()} loading={listQuery.isFetching}>
              Try again
            </Button>
          </View>
        ) : !list || !chosen ? (
          <View style={{ flex: 1 }}>
            <BookingLoading label="Loading what to record" />
            {ready && !basket ? (
              // Never a dead end at a door with no signal: the general list is always on the phone.
              <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.lg }}>
                <TextButton label="No signal? Use Renit's general list" onPress={() => setNoWait(true)} />
              </View>
            ) : null}
          </View>
        ) : (
          <>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.md }}
            >
              <View style={{ gap: 2 }}>
                <Text role="screenTitle" accessibilityRole="header">
                  {heading.title}
                </Text>
                {params.title ? (
                  <Text fontSize="text-md" tone="body">
                    {params.title}
                  </Text>
                ) : null}
              </View>
              {listSourceNote(chosen.source) ? (
                <Notice tone="warning" icon="info">
                  {listSourceNote(chosen.source)}
                </Notice>
              ) : null}
              <CameraOffNotice>Camera access is off for Renit, so the photos and video can't be taken. Allow it in Settings.</CameraOffNotice>
              {params.courier ? (
                // B1: a clip whose camera saved the place is refused (`keepVideo`); say so before it is shot, not after.
                <Notice tone="warning" icon="warning">
                  Turn off location tags in your camera app's settings before you start. A video that saves where you are
                  can't be used, so the shop never learns your address.
                </Notice>
              ) : null}
              <Intro
                list={list}
                side={role}
                lead={
                  forOther
                    ? `Use this when ${otherName}'s phone can't record. We text a code to their phone; they read it out to you at the end to confirm this set.`
                    : null
                }
              />
            </ScrollView>
            <BottomBar>
              {codeError ? (
                <Text fontSize="text-sm" tone="danger" accessibilityRole="alert">
                  {codeError}
                </Text>
              ) : null}
              <Button onPress={() => void start()} loading={working} disabled={working}>
                {forOther ? "Send the code and start" : "Start"}
              </Button>
            </BottomBar>
          </>
        )}
      </NonScrollableContainer>
    );
  }

  // ---- After the walk: the upload, and the code for the other person's set -----------------------

  const state = draftState(draft);
  const step = nextStep(draft);

  if (target === null && step.kind === "upload") {
    const progress = uploadProgress(draft);
    const up = state === "done" || state === "code";
    return (
      <NonScrollableContainer>
        <SubpageHeader title={heading.header} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.lg, gap: space.lg }}
        >
          <View style={{ alignItems: "center", gap: space.sm }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: radius.full,
                backgroundColor: up ? color.successWash : color.brandPanel,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {up ? <CheckCircleIcon size={36} color={color.success} /> : <CameraIcon size={32} color={color.brandText} />}
            </View>
            <Text role="screenTitle" accessibilityRole="header" style={{ textAlign: "center" }}>
              {up ? "Recorded and uploaded" : "Recorded"}
            </Text>
            <Text fontSize="text-md" tone="body" style={{ textAlign: "center" }} accessibilityLiveRegion="polite">
              {up
                ? "Renit has every photo and the video."
                : state === "waiting" || state === "stuck"
                  ? draft.error?.text
                  : "Your photos and video are uploading. You can carry on; they keep going in the background."}
            </Text>
          </View>

          <View style={{ gap: space.sm }}>
            <UploadBar fraction={progress.fraction} />
            <Text fontSize="text-sm" tone="body" style={{ textAlign: "center" }}>
              {/* The video's own size, so nobody is surprised by what a slow connection has to carry. */}
              {up ? progress.text : `${progress.text} · ${videoLabel(draft.video)}`}
            </Text>
          </View>

          {state === "waiting" || state === "stuck" ? (
            <Button variant="outline" onPress={() => captureQueue.retry(draft.id)}>
              Try again
            </Button>
          ) : null}

          {state === "stuck" && draft.forOther && !needsDesk(draft) ? (
            // Saving the other person's set is allowed only while a code is out for it: a new code opens it again.
            <TextButton
              label="Send a new code and try again"
              disabled={working}
              onPress={() => void sendCode().then((sent) => sent === "sent" && captureQueue.retry(draft.id))}
            />
          ) : null}

          {(state === "code" && (draft.desk === "dead" || draft.desk === "files")) || (state === "stuck" && needsDesk(draft)) ? (
            <Panel style={{ padding: space.md, gap: space.md }}>
              <Text fontSize="text-md" fontWeight="font-bold">
                Renit's desk has to finish this record
              </Text>
              <Text fontSize="text-sm" tone="body">
                {draft.desk === "files" ? FILES_KEPT : DESK_FINISHES}
              </Text>
              <GetHelp booking={{ number, can: ["get_help"] }} />
            </Panel>
          ) : state === "code" ? (
            <Panel style={{ padding: space.md, gap: space.md }}>
              <View style={{ gap: 2 }}>
                <Text fontSize="text-md" fontWeight="font-bold">
                  {`Ask ${otherName} for the code`}
                </Text>
                <Text fontSize="text-sm" tone="body">
                  {`We sent a ${CODE_LENGTH}-digit code to their phone${fallback?.sent_to ? ` (${fallback.sent_to})` : ""}. They read it out and you type it here.`}
                </Text>
              </View>
              <CodeInput round={round} onChange={(value) => (setCode(value), setCodeError(null))} disabled={working} />
              {codeError ? (
                <Text fontSize="text-sm" tone="danger" accessibilityRole="alert" style={{ textAlign: "center" }}>
                  {codeError}
                </Text>
              ) : null}
              <Button onPress={() => void confirmCode()} loading={working} disabled={working || code.length !== CODE_LENGTH}>
                Confirm their set
              </Button>
              {draft.desk === "codes" ? (
                // The last code sent may still work, so the box above stays; if it does not, the desk finishes the record.
                <>
                  <Text fontSize="text-sm" tone="body">
                    {NO_MORE_CODES}
                  </Text>
                  <GetHelp booking={{ number, can: ["get_help"] }} />
                </>
              ) : (
                <TextButton label="Send a new code" disabled={working} onPress={() => void sendCode()} />
              )}
            </Panel>
          ) : null}

          {!up ? (
            <Notice icon="info">
              The rental can't be closed, and the owner isn't paid, until this has uploaded. Keep the app open when you have signal.
            </Notice>
          ) : null}
        </ScrollView>
        <BottomBar>
          <Button onPress={leave} variant={state === "code" ? "outline" : "primary"}>
            {state === "code" ? "Back" : "Continue"}
          </Button>
        </BottomBar>
      </NonScrollableContainer>
    );
  }

  // ---- The walk: a shot, the video, the ticks ---------------------------------------------------

  const shotIndex = target ?? (step.kind === "shot" ? step.index : null);
  const shot = shotIndex === null ? null : draft.list.shots[shotIndex];

  const shoot = () =>
    withCamera(async () => {
      if (!shot) return;
      // Which slot the camera is open for is kept with the record first: if the
      // system closes the app under the camera, the photo still finds its place.
      update((d) => withShooting(d, { shot: shot.key }));
      const [uri, place] = await Promise.all([takePhoto({ courier: draft.courier }), placeNow()]);
      if (!uri) {
        update((d) => withShooting(d, null));
        return;
      }
      update((d) => addShot(d, shot.key, { uri, taken_at: stamp(), ...(place ?? {}) }));
      commitFeedback();
      setTarget(null);
    });

  const record = () =>
    withCamera(async () => {
      update((d) => withShooting(d, "video"));
      const video = await recordVideo({ courier: draft.courier });
      if (!video) {
        update((d) => withShooting(d, null));
        return;
      }
      update((d) => setVideo(d, { uri: video.uri, seconds: video.seconds, bytes: video.bytes, taken_at: stamp() }));
      commitFeedback();
    });

  const lastTaken = draft.list.shots.reduce((last, s, i) => (draft.shots[s.key] ? i : last), -1);
  const stuckNote = draft.error && !draft.error.retry ? draft.error.text : null;

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Record condition" />
      {shot && shotIndex !== null ? (
        <View style={{ flex: 1, paddingHorizontal: SCREEN_GUTTER, paddingBottom: space.md, gap: space.md }}>
          {stuckNote ? (
            <Notice tone="warning" icon="warning">
              {stuckNote}
            </Notice>
          ) : null}
          <Viewfinder
            chip={shotChip(draft.list, shotIndex)}
            hint={shot.hint}
            photo={draft.shots[shot.key]?.uri ?? null}
            label={`Take the photo: ${shot.label}`}
            disabled={launching}
            onPress={() => void shoot()}
          />
          <ShotTiles draft={draft} current={shotIndex} onPick={setTarget} />
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1, alignItems: "flex-start" }}>
              {lastTaken >= 0 && lastTaken !== shotIndex ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Take the last photo again"
                  activeOpacity={0.6}
                  onPress={() => setTarget(lastTaken)}
                  style={{ minHeight: MIN_TOUCH_TARGET, flexDirection: "row", alignItems: "center", gap: space.xs }}
                >
                  <ArrowUturnLeftIcon size={18} color={color.brandText} />
                  <Text fontSize="text-md" fontWeight="font-bold" tone="brand">
                    Retake
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Shutter
              kind="photo"
              disabled={launching}
              onPress={() => void shoot()}
              label={draft.shots[shot.key] ? `Take ${shot.label} again` : `Take the photo: ${shot.label}`}
            />
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              {target !== null ? <TextButton label="Carry on" onPress={() => setTarget(null)} /> : null}
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.xs }}>
            <CameraIcon size={16} color={color.textBody} />
            <Text fontSize="text-xs" tone="body">
              {CAMERA_ONLY}
            </Text>
          </View>
        </View>
      ) : step.kind === "video" ? (
        <View style={{ flex: 1, paddingHorizontal: SCREEN_GUTTER, paddingBottom: space.md, gap: space.md }}>
          <Viewfinder
            chip={`Video · up to ${durationLabel(VIDEO_SECONDS)}`}
            hint={videoHintText(draft.list.video_hint)}
            photo={null}
            label="Record the video"
            disabled={launching}
            onPress={() => void record()}
          />
          <ShotTiles draft={draft} current={null} onPick={setTarget} />
          <View style={{ alignItems: "center" }}>
            <Shutter kind="video" disabled={launching} onPress={() => void record()} label="Record the video" />
          </View>
          <Text fontSize="text-xs" tone="body" style={{ textAlign: "center" }}>
            {`Recording stops by itself at ${durationLabel(VIDEO_SECONDS)}. It is sent when you have a connection.`}
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.md }}
          >
            {stuckNote ? (
              <Notice tone="warning" icon="warning">
                {stuckNote}
              </Notice>
            ) : null}
            <View style={{ gap: 2 }}>
              <Text role="screenTitle" accessibilityRole="header">
                What's included
              </Text>
              <Text fontSize="text-md" tone="body">
                {draft.checklist.length > 0
                  ? "Tick what is here with the item. Leave anything that is missing unticked."
                  : "Nothing is listed with this item."}
              </Text>
            </View>
            {draft.checklist.length > 0 ? (
              <Panel>
                {draft.checklist.map((row, index) => (
                  <TickRow
                    key={row.item}
                    label={row.item}
                    ticked={row.ticked}
                    first={index === 0}
                    onPress={() => update((d) => tick(d, row.item))}
                  />
                ))}
              </Panel>
            ) : null}
            {needsIdMatch(draft) ? (
              <Panel>
                <TickRow
                  first
                  label={idMatchWords("", params.id_match_name, null, role === "customer").label}
                  sub={idMatchWords(otherName, params.id_match_name, otherName, role === "customer").sub}
                  ticked={draft.idMatch}
                  onPress={() => update((d) => setIdMatch(d, !d.idMatch))}
                />
              </Panel>
            ) : null}
            {needsSealNumber(draft) ? (
              <View style={{ gap: space.xs }}>
                <Text fontSize="text-sm" fontWeight="font-bold">
                  The seal's number
                </Text>
                <Text fontSize="text-sm" tone="body">
                  Close the bag with the spare seal, then type the number printed on it. The shop checks it is unbroken.
                </Text>
                <TextField
                  value={draft.sealNumber ?? ""}
                  onChangeText={(typed) => update((d) => setSealNumber(d, typed))}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={20}
                  placeholder="R-1042"
                  accessibilityLabel="The seal's number"
                />
              </View>
            ) : null}
            <Text fontSize="text-sm" fontWeight="font-bold">
              Your photos and video
            </Text>
            <ShotTiles draft={draft} current={null} onPick={setTarget} />
            <Text fontSize="text-sm" tone="body">
              {videoLabel(draft.video)}
            </Text>
            <TextButton label="Record the video again" disabled={launching} onPress={() => void record()} />
          </ScrollView>
          <BottomBar>
            {!canSeal(draft) ? (
              <Text fontSize="text-sm" tone="body">
                {needsSealNumber(draft) && !sealNumberOf(draft.sealNumber)
                  ? "Type the seal's number (letters, digits and dashes) to finish."
                  : "Tick the ID check to finish."}
              </Text>
            ) : null}
            <Button disabled={!canSeal(draft)} onPress={() => (commitFeedback(), update(seal))}>
              Done
            </Button>
          </BottomBar>
        </>
      )}
    </NonScrollableContainer>
  );
}
