import { captureQueue, useCaptureDraft } from "@/backend/capture-jobs";
import { useShotList } from "@/backend/captures";
import { GetHelp } from "@/components/booking/get-help";
import { Button, Text } from "@/components/core";
import {
  CaptureDraft,
  CaptureFlags,
  Moment,
  RecordCardView,
  RecordState,
  Side,
  otherSide,
  recordCard,
  recordState,
  recordWanted,
  shouldRelease,
} from "@/lib/capture";
import { DeliveredBy, byRenit } from "@/lib/delivery";
import { radius, space } from "@/lib/design-tokens";
import { clockSkewMs } from "@/lib/server-clock";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React, { useEffect } from "react";
import { View } from "react-native";

/** The bar under a record that is going up. */
export function UploadBar({ fraction }: { fraction: number }) {
  const { color } = useTheme();
  return (
    <View style={{ height: 6, borderRadius: radius.full, backgroundColor: color.surfaceRaised, overflow: "hidden" }}>
      <View style={{ width: `${Math.round(fraction * 100)}%`, height: 6, backgroundColor: color.brand }} />
    </View>
  );
}

/** What a record needs of the booking it belongs to, either side's. */
export interface RecordBookingProps {
  number: string;
  stage: string;
  exit: string;
  can: string[];
  captures?: CaptureFlags | null;
  id_match_required?: boolean;
  /** The shop's booking: the customer, whose full name is shown from Ready on a booking that needs the ID match (T-44). */
  customer?: { full_name?: string | null; first_name?: string; last_initial?: string } | null;
  server_time?: string;
  /** The customer's booking: the booking this one extends. An extension has no handover record. */
  extends?: string | null;
  /** B1: who carries it. `renit` opens the customer's capture as a courier booking's (`Capture`'s `courier`). */
  delivered_by?: DeliveredBy | null;
  /** Cart: the booking's items. A booking of several can't be recorded on Renit's general list (`Capture`'s `basket`). */
  lines?: { state: string }[] | null;
}

export interface RecordProps {
  moment: Moment;
  /** Whose phone this is. */
  role: Side;
  /** The other person's set, recorded on this phone because theirs failed. */
  forOther?: boolean;
  booking: RecordBookingProps;
  /** When the booking's answer arrived: with its `server_time`, the server's clock for the time on each shot. */
  receivedAt: number;
  /** The capture screen's words: the item, and the other person. */
  title: string;
  other: string;
  /** Money still waits on this record (the owner's payout on the handover record). */
  stake?: boolean;
  /** A screen about the whole booking: the return record is offered from it only once begun, or after the return. */
  begunOnly?: boolean;
}

export interface RecordHandle {
  /** The booking's number, for Get help on a card that says the desk has to finish the record. */
  number: string;
  state: RecordState;
  view: RecordCardView | null;
  draft: CaptureDraft | null;
  /** Opens the capture: to begin the record, carry it on, or type the other person's code. */
  open: () => void;
  /** Opens the capture on one shot of the list: to take it, or take it again. */
  openAt: (shot: string) => void;
  retry: () => void;
}

/**
 * One side's record for one moment, as every screen of a booking sees it: where
 * it stands (`recordState`, the one rule), the card that says so, and the two
 * things a person can do about it. It also does the housekeeping a screen that
 * has just read the booking owes the queue: a record the server already has, or
 * that the booking no longer wants, is let go of; and the booking's shot list is
 * read while there is a connection, so the walk can begin later without one.
 */
export function useRecord({ moment, role, forOther = false, booking, receivedAt, title, other, stake, begunOnly }: RecordProps): RecordHandle {
  const navigation = useTypedNavigation();
  const { number } = booking;
  const side = forOther ? otherSide(role) : role;
  const held = useCaptureDraft(number, moment, side);
  // A record for the other side is on this phone only when it was begun here for them.
  const draft = held && held.forOther === forOther ? held : null;
  const onServer = Boolean(booking.captures?.[moment]?.[forOther ? "theirs" : "mine"]);
  const state = recordState({ moment, booking, onServer, draft, stake, forOther, begunOnly });

  // Read, and so kept on the phone, while the booking can still take a record.
  useShotList(number, recordWanted(moment, booking));

  const release = draft ? shouldRelease(draft, booking, onServer) : false;
  const draftId = draft?.id;
  useEffect(() => {
    if (release && draftId) captureQueue.remove(draftId);
  }, [release, draftId]);

  const items = booking.lines?.length ?? 0;
  const open = (shot?: string) =>
    navigation.navigate("Capture", {
      number,
      moment,
      role,
      forOther,
      title,
      other,
      id_match: Boolean(booking.id_match_required),
      id_match_name: booking.customer?.full_name ?? null,
      skew_ms: clockSkewMs(booking.server_time, receivedAt),
      // The customer's set only: it is their home that must not reach the shop.
      ...(byRenit(booking) && side === "customer" ? { courier: true } : {}),
      // Cart: a booking of several items names each item's keys, so it never starts on the general list.
      ...(items > 1 ? { basket: true, items: booking.lines?.filter((l) => l.state === "live").length ?? items } : {}),
      ...(shot ? { shot } : {}),
    });

  return {
    number,
    state,
    view: recordCard({ state, moment, role, forOther, otherName: other, stage: booking.stage, draft, stake }),
    draft,
    open: () => open(),
    openAt: (shot) => open(shot),
    retry: () => draft && captureQueue.retry(draft.id),
  };
}

/**
 * The card for one record: its state in words, what waits on it, how far the
 * upload is, and one button. Drawn on every screen a booking can land on, so a
 * record that is not finished is never out of sight. `skip`: states a screen
 * draws for itself (the day-of screens have their own first button).
 */
export function RecordCardBody({ record, skip = [] }: { record: RecordHandle; skip?: RecordState[] }) {
  const { color } = useTheme();
  const { view } = record;
  if (!view || skip.includes(view.state)) return null;
  const warning = view.tone === "warning";
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        gap: space.sm,
        padding: space.md,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: warning ? color.warning : color.line,
        backgroundColor: warning ? color.warningWash : color.surface,
      }}
    >
      <Text fontSize="text-md" fontWeight="font-bold" accessibilityRole="header">
        {view.title}
      </Text>
      <Text fontSize="text-sm" tone="body">
        {view.text}
      </Text>
      {view.stake ? (
        <Text fontSize="text-sm" fontWeight="font-bold">
          {view.stake}
        </Text>
      ) : null}
      {view.progress && (view.state === "uploading" || view.state === "waiting") ? (
        <UploadBar fraction={view.progress.fraction} />
      ) : null}
      {view.help ? <GetHelp booking={{ number: record.number, can: ["get_help"] }} /> : null}
      {view.button ? (
        <Button
          variant={view.button.action === "open" ? "primary" : "outline"}
          onPress={view.button.action === "open" ? record.open : record.retry}
        >
          {view.button.label}
        </Button>
      ) : null}
    </View>
  );
}

/** A record's card, for a screen that needs nothing else of it. */
export function RecordCard(props: RecordProps & { skip?: RecordState[] }) {
  return <RecordCardBody record={useRecord(props)} skip={props.skip} />;
}

/**
 * Every record of a booking that still needs something, for the screens that are
 * about the booking as a whole (its details, the shop's booking page): this
 * side's handover and return records, and the other person's where this phone
 * recorded theirs. Draws nothing when all is in.
 */
export function Records(props: Omit<RecordProps, "moment" | "forOther"> & { moments?: Moment[] }) {
  const moments = props.moments ?? ["handover", "return"];
  return (
    <>
      {moments.map((moment) => (
        <React.Fragment key={moment}>
          <RecordCard {...props} moment={moment} stake={moment === "handover" ? props.stake : false} begunOnly={moment === "return"} />
          <RecordCard {...props} moment={moment} forOther stake={false} />
        </React.Fragment>
      ))}
    </>
  );
}
