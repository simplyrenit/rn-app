import { findMyReport, reportDamage } from "@/backend/claims";
import { shopBookingQueryKey, fetchShopBooking, useShopBooking } from "@/backend/shop-ring";
import { GetHelp } from "@/components/booking/get-help";
import { BookingLoadError, BookingLoading, BottomBar, Notice, Panel } from "@/components/booking/parts";
import { useServerNow } from "@/components/booking/use-server-now";
import { Button, SubpageHeader, Text, TextField } from "@/components/core";
import { ConfirmSheet } from "@/components/core/confirm-sheet";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGuardedTap } from "@/components/handover/parts";
import { EvidencePhoto, PhotoRow, discardEvidence, uploadPhotos } from "@/components/handover/photo-row";
import { apiError } from "@/lib/api-error";
import { money } from "@/lib/booking";
import {
  damageBlocked,
  damageErrorText,
  damageHold,
  damageMax,
  damageMaxLine,
  damageNotice,
  newClaimIds,
  parseRupees,
  reportUntilLine,
} from "@/lib/claims";
import { SCREEN_GUTTER, space } from "@/lib/design-tokens";
import { failedPhotosText, urlsOf } from "@/lib/evidence";
import { customerName } from "@/lib/shop-ring";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { StackActions, useRoute } from "@react-navigation/native";
import React, { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { useQueryClient } from "react-query";

/** The longest statement sent. */
const MAX_STATEMENT = 500;

/**
 * SH-11, "What's wrong with it?": the shop reports a problem at the return, within
 * 24 hours of the return code (N12, ENG-248). What happened, how much it asks for (never
 * more than the deposit less any late fee) and photos taken now with the camera.
 * Renit decides from the two sets of photos within three working days and the
 * customer may reply once. The booking must be `returned`: the return screen shows
 * the code first and opens this once the customer has typed it (decision A-35).
 *
 * The report is sent once, held while it goes; the photos that went up stay up if
 * another did not; and if the answer never comes the booking is read to see whether
 * the claim is there before the shop is asked to send again.
 */
export default function ShopReportProblemScreen() {
  const { params } = useRoute<RouteProps<"ShopReportProblem">>();
  const { number } = params;
  const navigation = useTypedNavigation();
  const queryClient = useQueryClient();
  const keyboard = useKeyboardInset();
  const query = useShopBooking(number);
  const booking = query.data;
  const now = useServerNow(booking?.server_time, query.dataUpdatedAt);
  const confirm = useRef<BottomSheetModal>(null);
  const { running, run } = useGuardedTap();
  const [statement, setStatement] = useState("");
  // Whole rupees, as digits: money is whole rupees at launch.
  const [amount, setAmount] = useState("");
  const [photos, setPhotos] = useState<EvidencePhoto[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!booking) {
    return (
      <NonScrollableContainer>
        <SubpageHeader title="Return" />
        {query.isError ? (
          <BookingLoadError error={query.error} what="this booking" onRetry={() => void query.refetch()} />
        ) : (
          <BookingLoading label="Loading the booking" />
        )}
      </NonScrollableContainer>
    );
  }

  const first = booking.customer.first_name;
  const name = customerName(booking.customer);
  const max = damageMax(booking.money);
  const blocked = damageBlocked(booking, now);
  const hold = damageHold(statement, amount, photos.length, max);
  const sending = running !== null;
  const rupees = parseRupees(amount);
  const until = reportUntilLine(booking.report_problem_until, now);

  const opened = (claimId: number) => {
    toast.success("Sent to Renit", { message: `Renit decides within three working days. ${first} can reply once.` });
    // The claim replaces this form: back from it goes to the return, not to a form that would send again.
    navigation.dispatch(StackActions.replace("Claim", { id: claimId, role: "owner" }));
  };

  const send = () =>
    run("send", async () => {
      setError(null);
      if (rupees === null) return;
      const up = await uploadPhotos(photos, `${number}-damage`);
      setPhotos(up.photos);
      if (up.failed > 0) {
        setError(failedPhotosText(up.failed, up.photos.length));
        return;
      }
      // What the booking held before the press: only a claim that was not there, with these words and this amount, is this report.
      const before = booking.claims;
      try {
        const made = await reportDamage(number, rupees, statement, urlsOf(up.photos) ?? []);
        queryClient.setQueryData(shopBookingQueryKey(number), made.booking);
        // The photos are on Renit's bucket now: their copies on the phone have done their work.
        discardEvidence(up.photos);
        opened(made.claim.id);
      } catch (failure) {
        const refused = apiError(failure);
        if (refused && refused.status > 0) {
          setError(damageErrorText(refused));
          // The booking may have moved on (the 24 hours ran out, a claim is already open): the server's state is the truth.
          void queryClient.invalidateQueries(shopBookingQueryKey(number));
          return;
        }
        // No answer at all: the claim may have been made. The booking says so before another send is allowed.
        try {
          const fresh = await fetchShopBooking(number);
          queryClient.setQueryData(shopBookingQueryKey(number), fresh);
          const claimId = await findMyReport(newClaimIds(before, fresh.claims), { kind: "damage", statement, amount: rupees });
          if (claimId) {
            discardEvidence(up.photos);
            opened(claimId);
          } else {
            setError("Your report did not go through. Check your connection and try again.");
          }
        } catch {
          setError("We could not tell whether your report went through. Open the booking in a moment and check before you send it again.");
        }
      }
    });

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Return" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.md, paddingBottom: space.md + keyboard }}
      >
        <View style={{ gap: 2 }}>
          <Text role="screenTitle" accessibilityRole="header">
            What's wrong with it?
          </Text>
          <Text fontSize="text-md" tone="body">
            {[booking.number, booking.product.title, name].join(" · ")}
          </Text>
        </View>

        {blocked ? (
          <Notice tone="warning" icon="info">
            {blocked}
          </Notice>
        ) : (
          <>
            <TextField
              label="What happened"
              value={statement}
              onChangeText={setStatement}
              multiline
              maxLength={MAX_STATEMENT}
              editable={!sending}
              placeholder="Say what is damaged or missing, and how it was at the handover."
              style={{ minHeight: 110 }}
            />
            <TextField
              label="How much are you asking for?"
              hint={damageMaxLine(booking.money)}
              value={rupees === null ? "" : money(rupees)}
              onChangeText={(text) => setAmount(String(parseRupees(text) ?? ""))}
              keyboardType="number-pad"
              editable={!sending}
              placeholder="₹0"
              accessibilityLabel="How much are you asking for, in rupees"
            />
            <Text role="sectionTitle" accessibilityRole="header">
              Return photos
            </Text>
            <PhotoRow
              photos={photos}
              onChange={setPhotos}
              addLabel={photos.length > 0 ? "Add another photo" : "Take a photo"}
              disabled={sending}
            />
            <Notice tone="brand" icon="info">
              {damageNotice(first)}
            </Notice>
          </>
        )}
        {/* "Nothing is left of the deposit… use Get help" has its way on right under the words. */}
        <Panel>
          <GetHelp booking={booking} />
        </Panel>
      </ScrollView>
      <BottomBar>
        {blocked ? (
          <Button variant="outline" onPress={() => navigation.goBack()}>
            Go back
          </Button>
        ) : (
          <>
            {error ?? hold ? (
              <Text fontSize="text-sm" tone={error ? "danger" : "body"} accessibilityRole={error ? "alert" : undefined}>
                {error ?? hold}
              </Text>
            ) : null}
            <Button loading={sending} disabled={sending || hold !== null} onPress={() => confirm.current?.present()}>
              Send to Renit
            </Button>
            {until ? (
              <Text fontSize="text-xs" tone="body" style={{ textAlign: "center" }}>
                {until}
              </Text>
            ) : null}
          </>
        )}
      </BottomBar>
      <ConfirmSheet
        ref={confirm}
        title="Send this report to Renit?"
        body={`You are asking for ${rupees === null ? "an amount" : money(rupees)} of the deposit. A report can't be taken back, and ${first} can reply once.`}
        confirmLabel="Send to Renit"
        loading={sending}
        onConfirm={() => {
          confirm.current?.dismiss();
          void send();
        }}
      />
    </NonScrollableContainer>
  );
}
