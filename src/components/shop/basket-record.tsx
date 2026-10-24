import { captureQueue } from "@/backend/capture-jobs";
import { readKeptShotList, useCaptures, useShotList } from "@/backend/captures";
import { GetHelp } from "@/components/booking/get-help";
import { Notice, Panel, TextButton } from "@/components/booking/parts";
import type { RecordHandle } from "@/components/capture/record-card";
import { Button, Text } from "@/components/core";
import { CheckBox } from "@/components/core/checkbox";
import { LineChip } from "@/components/shop/lines";
import {
  CaptureDraft,
  Moment,
  ShotList,
  recordWanted,
  setIdMatch,
  setReceived,
  startDraft,
  tick,
  waiveReceived,
  withReceived,
} from "@/lib/capture";
import { MIN_TOUCH_TARGET, radius, space } from "@/lib/design-tokens";
import { pluralize } from "@/lib/pluralize";
import type { BookingShop } from "@/lib/shop-booking";
import { BasketItem, ItemShot, basketItems, itemTag, thingsLeft, videoWord } from "@/lib/shop-lines";
import { useTheme } from "@/lib/theme";
import React, { useEffect, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { ArrowPathIcon, CameraIcon, ExclamationTriangleIcon, UserIcon, VideoCameraIcon } from "react-native-heroicons/outline";
import { CheckCircleIcon } from "react-native-heroicons/solid";

/** One shot of an item: done, going up, not sent (tap to send again), or still to take (tap to take it). */
function ShotTile({
  shot,
  last,
  onTake,
  onRetry,
  disabled,
}: {
  shot: ItemShot;
  /** The fourth of its row: no gap after it. */
  last: boolean;
  onTake: () => void;
  onRetry: () => void;
  disabled: boolean;
}) {
  const { color } = useTheme();
  const failed = shot.state === "failed";
  const words = { done: "", uploading: "Uploading", failed: "Tap to retry", missing: shot.label }[shot.state];
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${shot.label}: ${{ done: "in", uploading: "uploading", failed: "not sent, send again", missing: "not taken, take it" }[shot.state]}`}
      disabled={disabled || shot.state === "done" || shot.state === "uploading"}
      activeOpacity={0.7}
      onPress={failed ? onRetry : onTake}
      style={{
        width: "23%",
        marginRight: last ? 0 : "2.66%",
        minHeight: 64,
        padding: 4,
        gap: 2,
        borderRadius: radius.input,
        borderWidth: 1,
        borderColor: failed ? color.danger : shot.state === "missing" ? color.inputLine : "transparent",
        backgroundColor: failed ? color.dangerWash : color.surfaceRaised,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {failed ? <ArrowPathIcon size={18} color={color.danger} /> : shot.state === "uploading" ? <ArrowPathIcon size={18} color={color.info} /> : <CameraIcon size={18} color={color.textBody} />}
      {shot.state === "done" ? (
        <View style={{ position: "absolute", top: 3, right: 3 }}>
          <CheckCircleIcon size={14} color={color.success} />
        </View>
      ) : null}
      <Text fontSize="text-xs" tone={failed ? "danger" : "body"} numberOfLines={2} style={{ textAlign: "center" }}>
        {shot.state === "done" ? shot.label : words}
      </Text>
    </TouchableOpacity>
  );
}

function ItemCard({
  item,
  moment,
  locked,
  onReceived,
  onPart,
  onTake,
  onRetry,
}: {
  item: BasketItem;
  moment: Moment;
  /** The server has the whole record: nothing more is sent from here. */
  locked: boolean;
  onReceived: (on: boolean) => void;
  onPart: (part: string) => void;
  onTake: (shot?: string) => void;
  onRetry: () => void;
}) {
  const { color } = useTheme();
  const tag = moment === "return" && item.received ? ({ label: "Received", tone: "success" } as const) : itemTag(item);
  const ticked = item.parts.filter((p) => p.ticked).length;
  const firstMissing = item.shots.find((s) => s.state === "missing")?.key;
  return (
    <Panel style={{ padding: space.md, gap: space.sm }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.sm }}>
        {moment === "return" ? (
          <CheckBox
            checked={item.received}
            onPress={() => (locked ? undefined : onReceived(!item.received))}
            accessibilityLabel={`${item.title} received`}
          />
        ) : null}
        <View style={{ flex: 1, gap: 2 }}>
          <Text fontSize="text-md" fontWeight="font-bold">
            {item.title}
          </Text>
          <Text fontSize="text-sm" tone="body">
            {`${item.ref} · ${item.done} of ${item.shots.length} shots in`}
          </Text>
        </View>
        {moment === "return" && !item.received && item.word === "not_started" && !locked ? (
          <Button variant="outline" size="compact" onPress={() => onTake(firstMissing)}>
            Record
          </Button>
        ) : (
          <LineChip label={tag.label} tone={tag.tone} />
        )}
      </View>
      {/* A fixed grid of four, so a row doesn't jitter as tiles change state (FIXES-r1 B4 row 18). */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: space.sm }}>
        {item.shots.map((shot, index) => (
          <ShotTile
            key={shot.key}
            shot={shot}
            last={index % 4 === 3}
            disabled={locked}
            onTake={() => onTake(shot.key)}
            onRetry={onRetry}
          />
        ))}
      </View>
      {item.parts.length > 0 ? (
        <View style={{ gap: 2, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: color.line }}>
          <Text fontSize="text-sm" fontWeight="font-bold">
            {`Parts · ${ticked} of ${item.parts.length}`}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: space.md }}>
            {item.parts.map((part) => (
              <View key={part.item} style={{ flexDirection: "row", alignItems: "center", minHeight: MIN_TOUCH_TARGET }}>
                <CheckBox
                  checked={part.ticked}
                  onPress={() => (locked ? undefined : onPart(part.item))}
                  accessibilityLabel={`${item.title}: ${part.label}`}
                />
                <Text fontSize="text-md">{part.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Panel>
  );
}

/**
 * A basket's own record, item by item (MR-06b, MR-09, MR-10): each item's shots and parts from the server's merged list
 * (T11), both of the shop's phones' shots as the server has them, the one video, the ID tick once for the visit, and
 * at the return a Received tick per item (D51). What the code still waits for is listed with its own way on: send
 * again, take the shot, tick. The photos are sent as they go up (`partialDue`), so the code opens once every item's
 * shots are in, while the video may still be uploading (D19). With no list on the phone and no connection a basket
 * can't be started: its keys name each item, so Renit's general list won't do ("Connect to start").
 */
export function BasketRecord({
  booking,
  moment,
  record,
  complete,
  watching,
}: {
  booking: BookingShop;
  moment: Moment;
  record: RecordHandle;
  /** The server has the shop's whole record. */
  complete: boolean;
  watching: boolean;
}) {
  const { color } = useTheme();
  const { number } = booking;
  const first = booking.customer.first_name;
  const query = useShotList(number);
  const [kept, setKept] = useState<ShotList | null>(null);
  useEffect(() => {
    let live = true;
    void readKeptShotList(number).then((found) => live && setKept(found));
    return () => {
      live = false;
    };
  }, [number]);
  const draft = record.draft;
  // Nothing more is sent once the server has the whole record, or the booking no longer takes one (it ended early).
  const locked = complete || !recordWanted(moment, booking);
  const list = draft?.list ?? query.data ?? kept;
  const capture = useCaptures(number, watching && !complete).data?.[moment]?.owner;
  const items = basketItems(list, draft, capture);
  const onServerReceived = capture?.received;

  // Another phone's Received ticks count here too, so this phone can finish the record; they are never sent as its own.
  const draftId = draft?.id;
  const receivedKey = onServerReceived ? onServerReceived.join(",") : null;
  useEffect(() => {
    if (draftId && onServerReceived) captureQueue.update(draftId, (d) => withReceived(d, onServerReceived));
    // Once for each new set of the server's ticks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, receivedKey]);
  // The desk took the return by hand (an item missing, OR12): the record completes without the Received ticks (T11).
  const waived = moment === "return" && booking.stage !== "out";
  useEffect(() => {
    if (draftId && waived) captureQueue.update(draftId, waiveReceived);
  }, [draftId, waived]);

  if (!list) {
    return query.isError ? (
      <View style={{ gap: space.sm }}>
        <Notice tone="warning" icon="warning" title="Connect to start">
          {`Shots for ${pluralize(booking.lines?.length ?? 0, "item")} need the internet.`}
        </Notice>
        <Button onPress={() => void query.refetch()} loading={query.isFetching}>
          Try again
        </Button>
      </View>
    ) : null;
  }

  /** A tick on this screen needs a record to hold it: one is begun from the list when there is none. */
  const change = (fn: (d: CaptureDraft) => CaptureDraft) => {
    const held = draft ?? captureQueue.start(startDraft({ number, moment, side: "owner", list }));
    captureQueue.update(held.id, fn);
  };
  const retry = () => (draft ? captureQueue.retry(draft.id) : undefined);
  const idTick = moment === "handover" && Boolean(list.id_match_required);
  // This phone's own word, once it ticked or unticked; else either phone's tick as the server has it.
  const idTicked = draft?.idTouched ? draft.idMatch : Boolean(draft?.idMatch || capture?.id_match_ticked);
  const video = videoWord(draft, capture);
  const left = locked ? [] : thingsLeft(items, { idTick: idTick && !idTicked, firstName: first, received: moment === "return" && !waived });
  const done = items.filter((i) => (moment === "return" ? i.received && i.word === "recorded" : i.word === "recorded")).length;
  const refusal = draft?.error && !draft.error.retry ? draft.error : null;

  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: 2 }}>
        <Text role="sectionTitle" accessibilityRole="header">
          {moment === "return" ? `Received · ${items.filter((i) => i.received).length} of ${items.length}` : `Each item · ${done} of ${items.length} in`}
        </Text>
        <Text fontSize="text-sm" tone="body">
          {moment === "return"
            ? `Tick and record all ${pluralize(items.length, "item")} to finish the return.`
            : "Record each item as you pack it. Shots save as you go."}
        </Text>
      </View>

      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          moment={moment}
          locked={locked}
          onReceived={(on) => change((d) => setReceived(d, item.id, on))}
          onPart={(part) => change((d) => tick(d, part))}
          onTake={(shot) => (shot ? record.openAt(shot) : record.open())}
          onRetry={retry}
        />
      ))}

      {moment === "return" && !locked && booking.stage === "out" && items.some((i) => !i.received) ? (
        // D51: the return can't be finished with an item unticked. Today's not-returned flow then runs on the booking.
        <View style={{ gap: space.sm }}>
          <Notice tone="warning" icon="warning" title="Something missing? Don't finish">
            {`Leave it unticked. ${first}'s deposit stays held and the booking stays out until Renit sorts it. Call Renit now.`}
          </Notice>
          <Panel>
            <GetHelp booking={booking} title="Call Renit" />
          </Panel>
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        <Text role="sectionTitle" accessibilityRole="header">
          Once for the visit
        </Text>
        <Panel>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md }}>
            <VideoCameraIcon size={22} color={color.text} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text fontSize="text-md" fontWeight="font-bold">
                {`One video of all ${pluralize(items.length, "item")}`}
              </Text>
              <Text fontSize="text-sm" tone="body">
                {video === "uploading"
                  ? moment === "handover"
                    ? "Keep Renit open until the video is in. Your payout waits for it."
                    : "Keep Renit open until the video is in."
                  : "Together, after the items' shots."}
              </Text>
            </View>
            {video === "failed" ? (
              <TextButton label="Retry" onPress={retry} />
            ) : (
              <LineChip
                label={{ not_started: "Not started", uploading: "Uploading", failed: "Not sent", in: "In" }[video]}
                tone={video === "in" ? "success" : video === "uploading" ? "info" : "neutral"}
              />
            )}
          </View>
          {idTick ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.md, borderTopWidth: 1, borderTopColor: color.line }}>
              <CheckBox
                checked={idTicked}
                onPress={() => (locked ? undefined : change((d) => setIdMatch(d, !d.idMatch)))}
                accessibilityLabel={`I checked ${first}'s ID`}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text fontSize="text-md" fontWeight="font-bold">
                  {`I checked ${first}'s ID`}
                </Text>
                <Text fontSize="text-sm" tone="body">
                  One tick for this visit, not per item. At the handover, with the ID in front of you.
                </Text>
              </View>
              <UserIcon size={20} color={color.textDim} />
            </View>
          ) : null}
        </Panel>
      </View>

      {refusal ? (
        // The server's own words and its status (D19: any 400 is shown); a problem on this phone in its own words.
        <Notice tone="danger" icon="warning" title={refusal.status ? "Renit refused this record" : "This record needs you"}>
          {refusal.status ? `Renit said: ${refusal.text} (${refusal.status})` : refusal.text}
        </Notice>
      ) : null}

      {left.length > 0 ? (
        <Panel style={{ padding: space.md, gap: space.xs }}>
          <Text fontSize="text-md" fontWeight="font-bold" accessibilityRole="header">
            {`${moment === "return" ? "Before your code" : "Before the code"} · ${pluralize(left.length, "thing")} left`}
          </Text>
          {left.map((row) => (
            <View key={row.key} style={{ flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: MIN_TOUCH_TARGET }}>
              {row.action === null ? <ArrowPathIcon size={16} color={color.info} /> : <ExclamationTriangleIcon size={16} color={color.textDim} />}
              <Text fontSize="text-sm" style={{ flex: 1 }}>
                {row.text}
              </Text>
              {row.action === "retry" ? <TextButton label="Retry" onPress={retry} /> : null}
              {row.action === "take" && row.shot ? <TextButton label="Take" onPress={() => record.openAt(row.shot!)} /> : null}
            </View>
          ))}
          <View style={{ marginTop: space.xs, borderRadius: radius.card, borderWidth: 1, borderColor: color.line }}>
            <GetHelp booking={booking} title="Call desk" />
          </View>
        </Panel>
      ) : null}

      {!locked && (record.state === "start" || record.state === "continue") ? (
        <Button onPress={record.open}>{record.state === "start" ? "Record the items" : "Continue recording"}</Button>
      ) : null}
    </View>
  );
}
