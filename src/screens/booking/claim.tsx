import { bookingQueryKey, fetchBooking } from "@/backend/bookings";
import { ClaimRead, claimQueryKey, fetchClaim, replyToClaim, useClaim } from "@/backend/claims";
import { GetHelp } from "@/components/booking/get-help";
import { BookingLoadError, BookingLoading, Notice, Panel } from "@/components/booking/parts";
import { useAppActive } from "@/components/booking/use-app-active";
import { PaymentsList } from "@/components/booking/payments-list";
import { useServerNow } from "@/components/booking/use-server-now";
import { EvidenceStrip } from "@/components/claims/evidence";
import { Button, SubpageHeader, Text, TextField } from "@/components/core";
import { ConfirmSheet } from "@/components/core/confirm-sheet";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { EvidencePhoto, PhotoRow, discardEvidence, uploadPhotos } from "@/components/handover/photo-row";
import { useGuardedTap } from "@/components/handover/parts";
import { apiError } from "@/lib/api-error";
import { SLOW_POLL_MS, momentLabel } from "@/lib/booking";
import {
  Claim,
  againstMe,
  amountLines,
  claimBookingLine,
  deadlineLabel,
  effectRows,
  faultReturnLine,
  kindLabel,
  otherName,
  raisedByLine,
  replyAlreadyIn,
  replyErrorText,
  replyHold,
  replyView,
  sideOf,
  statusBanner,
} from "@/lib/claims";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { failedPhotosText, forgetAddresses, refusedFiles, urlsOf } from "@/lib/evidence";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useIsFocused, useRoute } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { CheckCircleIcon, ClockIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "react-query";

/** The longest reply sent. The server may be stricter and then says so in its own words. */
const MAX_REPLY = 1000;

/** A titled card: the heading, then what is under it. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel style={{ padding: space.md, gap: space.sm }}>
      <Text fontSize="text-md" fontWeight="font-bold" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </Panel>
  );
}

/**
 * The one reply, by the side the claim is against, the customer or the shop (N12: "the customer sees the claim
 * and the evidence and can reply once"; an owner who is not a merchant has no dashboard, so the phone replies for
 * both). The form shows only while the server says the caller may reply
 * and the deadline, counted against the server's clock, has not passed. Sending is
 * asked about first, because there is no second try, and is held while it goes. If
 * the answer never comes, the claim is read again: a reply that is there means it
 * got through, so the person is never invited to send it twice.
 */
function ReplyForm({ claim, due, now }: { claim: Claim; due: string; now: Date }) {
  const queryClient = useQueryClient();
  const confirm = useRef<BottomSheetModal>(null);
  const { running, run } = useGuardedTap();
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<EvidencePhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sending = running !== null;
  const hold = replyHold(text);

  const sent = (made: ClaimRead, uploaded: EvidencePhoto[]) => {
    discardEvidence(uploaded);
    setPhotos([]);
    setText("");
    queryClient.setQueryData(claimQueryKey(claim.id), made);
    toast.success("Reply sent", { message: "Renit decides from both sides." });
  };

  const send = () =>
    run("reply", async () => {
      setError(null);
      const up = await uploadPhotos(photos, `claim-${claim.id}-reply`);
      setPhotos(up.photos);
      if (up.failed > 0) {
        setError(failedPhotosText(up.failed, up.photos.length));
        return;
      }
      try {
        sent(await replyToClaim(claim.id, text, urlsOf(up.photos) ?? []), up.photos);
      } catch (failure) {
        const refused = apiError(failure);
        if (refused && refused.status > 0) {
          setError(replyErrorText(refused));
          // A file the server did not take (not on Renit's storage, too large) is uploaded afresh at the next press.
          if (refusedFiles(refused, "evidence")) setPhotos(forgetAddresses(up.photos));
          // The claim moved on (a reply is already in, it was decided, the time ran out): show it as it is.
          if (replyAlreadyIn(refused) || refused.code === "reply_late") void queryClient.invalidateQueries(claimQueryKey(claim.id));
          return;
        }
        // No answer at all: did it get through? A reply is for once, so ask before another send is allowed.
        try {
          const now = await fetchClaim(claim.id);
          if (now.claim.reply) sent(now, up.photos);
          else setError("Your reply did not go through. Check your connection and try again.");
        } catch {
          setError("We could not tell whether your reply went through. Check this claim again in a moment before you send it again.");
        }
      }
    });

  return (
    <Section title="Reply to this claim">
      <Text fontSize="text-sm" tone="body">
        {`You can reply once, by ${deadlineLabel(due, now)}. Say what happened and add photos if you have them.`}
      </Text>
      <TextField
        value={text}
        onChangeText={setText}
        multiline
        maxLength={MAX_REPLY}
        editable={!sending}
        placeholder="For example: the remote was in the bag's side pocket."
        accessibilityLabel="Your reply"
        style={{ minHeight: 110 }}
      />
      <PhotoRow photos={photos} onChange={setPhotos} addLabel={photos.length > 0 ? "Add another photo" : "Add a photo"} disabled={sending} />
      {error ? (
        <Text fontSize="text-sm" tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button loading={sending} disabled={sending || hold !== null} onPress={() => confirm.current?.present()}>
        Send reply
      </Button>
      {hold ? (
        <Text fontSize="text-xs" tone="body" style={{ textAlign: "center" }}>
          {hold}
        </Text>
      ) : null}
      <ConfirmSheet
        ref={confirm}
        title="Send your reply?"
        body="You can reply only once. Renit reads it, and the photos, when it decides. You can't change it afterwards."
        confirmLabel="Send reply"
        loading={sending}
        onConfirm={() => {
          confirm.current?.dismiss();
          void send();
        }}
      />
    </Section>
  );
}

function ClaimBody({ read, receivedAt }: { read: ClaimRead; receivedAt: number }) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  // Every deadline is counted against the claim's own `server_time`.
  const now = useServerNow(read.serverTime, receivedAt, 30_000);
  const { claim } = read;
  // Which side the person is on: the claim says (`my_side`), the screen that opened it does not have to.
  const role = sideOf(claim);
  const banner = statusBanner(claim, role, now);
  const reply = replyView(claim, role, now, Boolean(read.serverTime));
  const rows = effectRows(claim);
  const amounts = amountLines(claim);
  const other = otherName(claim, role);
  // What a refund did and where it went (N16): the customer's payments list says so, with the days to expect.
  const refunded = role === "customer" && claim.effects.some((e) => e.kind === "refund");
  const bookingNumber = claim.booking.number;
  // Only the customer's own read of the booking: the shop's booking is another endpoint, and the shop sees no payments list here.
  // A fault report is also read against it, to know whether the item is still out.
  const booking = useQuery(bookingQueryKey(bookingNumber), () => fetchBooking(bookingNumber), {
    enabled: refunded || (role === "customer" && claim.kind === "fault"),
    staleTime: 0,
    retry: 1,
  });
  // A fault report sends the item back first: "bring it back by…" only while the booking still says it is out.
  const stillOut = booking.data?.stage === "out" && !booking.data.exit;
  const returnLine = role === "customer" ? faultReturnLine(claim, stillOut, now) : null;
  const raised = claim.created_at ? momentLabel(claim.created_at, now) : "";

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.md, paddingBottom: insets.bottom + space.lg }}
    >
      <View style={{ gap: 2 }}>
        <Text role="screenTitle" accessibilityRole="header">
          {kindLabel(claim.kind)}
        </Text>
        <Text fontSize="text-md" tone="body">
          {claimBookingLine(claim)}
        </Text>
      </View>

      <View
        accessible
        accessibilityLabel={banner.sub ? `${banner.title}. ${banner.sub}` : banner.title}
        style={{
          flexDirection: "row",
          gap: space.md,
          padding: space.md,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: banner.tone === "brand" ? color.brandPanelLine : color.line,
          backgroundColor: banner.tone === "brand" ? color.brandPanel : color.surfaceRaised,
        }}
      >
        {claim.status === "open" ? <ClockIcon size={24} color={color.brandText} /> : <CheckCircleIcon size={24} color={color.textBody} />}
        <View style={{ flex: 1, gap: 2 }}>
          <Text fontSize="text-md" fontWeight="font-bold">
            {banner.title}
          </Text>
          {banner.sub ? (
            <Text fontSize="text-sm" tone="body">
              {banner.sub}
            </Text>
          ) : null}
        </View>
      </View>

      <Section title="What was reported">
        <Text fontSize="text-sm" tone="body">
          {[raisedByLine(claim, role), raised ? `Sent ${raised}.` : null].filter(Boolean).join(" ")}
        </Text>
        {claim.statement ? <Text fontSize="text-md">{claim.statement}</Text> : null}
        {amounts.map((line) => (
          <Text key={line} fontSize="text-md" fontWeight="font-bold">
            {line}
          </Text>
        ))}
        <EvidenceStrip urls={claim.evidence} label="Photo" />
      </Section>

      {returnLine ? (
        <Notice tone="warning" icon="clock">
          {returnLine}
        </Notice>
      ) : null}

      {reply.kind === "sent" ? (
        <Section title={againstMe(claim, role) ? "Your reply" : `${other[0].toUpperCase()}${other.slice(1)}'s reply`}>
          <Text fontSize="text-md">{reply.reply.text}</Text>
          {reply.reply.at ? (
            <Text fontSize="text-xs" tone="body">
              {`Sent ${momentLabel(reply.reply.at, now)}`}
            </Text>
          ) : null}
          <EvidenceStrip urls={reply.reply.evidence} label="Reply photo" />
        </Section>
      ) : reply.kind === "form" ? (
        <ReplyForm claim={claim} due={reply.due} now={now} />
      ) : reply.kind === "late" ? (
        <Notice tone="warning" icon="clock">
          {`The time to reply has passed (${deadlineLabel(reply.due, now)}). Renit decides from what it has.`}
        </Notice>
      ) : reply.kind === "waiting" ? (
        <Text fontSize="text-sm" tone="body">
          {`${other[0].toUpperCase()}${other.slice(1)} can reply once, until ${deadlineLabel(reply.due, now)}.`}
        </Text>
      ) : reply.kind === "none_sent" ? (
        <Text fontSize="text-sm" tone="body">
          No reply was sent.
        </Text>
      ) : null}

      {claim.status === "decided" || claim.decision_note ? (
        <Section title={claim.status === "decided" ? "What Renit decided" : "From Renit"}>
          {claim.decision_note ? <Text fontSize="text-md">{claim.decision_note}</Text> : null}
          {rows.length > 0 ? (
            <View>
              {rows.map((row, index) => (
                <View
                  key={row.key}
                  accessible
                  accessibilityLabel={`${row.label}. ${row.title}${row.amount ? `. ${row.amount}` : ""}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: space.md,
                    paddingVertical: space.sm,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: color.line,
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text fontSize="text-md" fontWeight="font-bold">
                      {row.title}
                    </Text>
                    <Text fontSize="text-sm" tone="body">
                      {row.label}
                    </Text>
                  </View>
                  {row.amount ? (
                    <Text fontSize="text-md" fontWeight="font-bold">
                      {row.amount}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
          {claim.decided_at ? (
            <Text fontSize="text-xs" tone="body">
              {`Decided ${momentLabel(claim.decided_at, now)}`}
            </Text>
          ) : null}
        </Section>
      ) : null}

      {refunded && booking.data ? <PaymentsList booking={booking.data} /> : null}

      {/* The claim has the booking's number; the booking's `can` offers `get_help` to either party, so the row is offered here. */}
      <Panel>
        <GetHelp booking={{ number: bookingNumber, can: ["get_help"] }} />
      </Panel>

      <Button
        variant="outline"
        onPress={() => navigation.navigate(role === "customer" ? "Booking" : "ShopBooking", { number: bookingNumber })}
      >
        Open the booking
      </Button>
    </ScrollView>
  );
}

/**
 * One claim, for either side of the booking (ENG-252, ENG-253): who raised it, what
 * was said and shown, the amount, the deadline, the reply and what was decided and
 * did to the money. It is read again each time the screen or the app comes to the
 * front, and every 15 seconds while it is still open, so a decision shows by itself.
 * The side the person is on comes from the claim's own `my_side`.
 */
export default function ClaimScreen() {
  const { params } = useRoute<RouteProps<"Claim">>();
  const { id } = params;
  const focused = useIsFocused();
  const active = useAppActive();
  const watching = focused && active;
  const query = useClaim(id);
  const { refetch } = query;
  const queryClient = useQueryClient();
  const open = query.data?.claim.status === "open";
  const number = query.data?.claim.booking.number;

  useEffect(() => {
    if (watching) void refetch();
  }, [watching, refetch]);

  useEffect(() => {
    if (!watching || !open) return;
    const timer = setInterval(() => void refetch(), SLOW_POLL_MS);
    return () => clearInterval(timer);
  }, [watching, open, refetch]);

  // A decision moves the booking too (a refund, a claim that no longer holds it): its screens read it afresh.
  const status = query.data?.claim.status;
  useEffect(() => {
    if (number && status === "decided") void queryClient.invalidateQueries(bookingQueryKey(number));
  }, [number, status, queryClient]);

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Claim" />
      {query.data ? (
        <ClaimBody read={query.data} receivedAt={query.dataUpdatedAt} />
      ) : query.isError ? (
        <BookingLoadError error={query.error} what="this claim" onRetry={() => void refetch()} />
      ) : (
        <BookingLoading label="Loading the claim" />
      )}
    </NonScrollableContainer>
  );
}
