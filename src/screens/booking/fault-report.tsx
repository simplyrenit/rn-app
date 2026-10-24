import { bookingQueryKey, fetchBooking, useBooking } from "@/backend/bookings";
import { byRenit } from "@/lib/delivery";
import { findMyReport, reportFault } from "@/backend/claims";
import { ChoiceRow } from "@/components/booking/collect-items";
import { GetHelp } from "@/components/booking/get-help";
import { BookingLoadError, BookingLoading, BottomBar, Notice, Panel, Thumb } from "@/components/booking/parts";
import { useServerNow } from "@/components/booking/use-server-now";
import { Button, SubpageHeader, Text, TextField } from "@/components/core";
import { ConfirmSheet } from "@/components/core/confirm-sheet";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGuardedTap } from "@/components/handover/parts";
import { EvidencePhoto, PhotoRow, discardEvidence, uploadPhotos } from "@/components/handover/photo-row";
import { apiError } from "@/lib/api-error";
import { isBasket, lineFaultNotice, liveLines } from "@/lib/booking-lines";
import { deadlineLabel, faultBlocked, faultErrorText, faultHold, faultNotice, newClaimIds } from "@/lib/claims";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { failedPhotosText, forgetAddresses, refusedFiles, urlsOf } from "@/lib/evidence";
import { toast } from "@/lib/toast";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { StackActions, useRoute } from "@react-navigation/native";
import React, { useRef, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { CheckIcon } from "react-native-heroicons/outline";
import { useQueryClient } from "react-query";

/** The longest statement sent. Enough for what does not work; the photos carry the rest. */
const MAX_STATEMENT = 500;

/**
 * BK-20's "Something doesn't work?": the customer's fault report (N14), within 24
 * hours of the handover. It needs the words and at least one photo, taken now with
 * the camera. Renit decides by the end of the next day; the item goes back first and
 * any refund follows its return. There is no drawn frame: it is the shape of BK-19
 * ("Not as described") with the fault's own words.
 *
 * On a booking of several items (cart D45, CT-48a) the report names the items it is
 * about, missing or not working, and the rest of the rental goes on: nothing goes back
 * first, and Renit refunds an amount it sets at once.
 *
 * The report is sent once. A tap is held while it goes; the photos that went up stay
 * up if another did not; and if the answer never comes the booking is read to see
 * whether the claim is there before the person is asked to send again (and a second
 * send would be answered `claim_exists` in any case).
 */
export default function FaultReportScreen() {
  const { params } = useRoute<RouteProps<"BookingFault">>();
  const { number } = params;
  const navigation = useTypedNavigation();
  const queryClient = useQueryClient();
  const keyboard = useKeyboardInset();
  const query = useBooking(number);
  const booking = query.data;
  const now = useServerNow(booking?.server_time, query.dataUpdatedAt);
  const confirm = useRef<BottomSheetModal>(null);
  const { running, run } = useGuardedTap();
  const [statement, setStatement] = useState("");
  const [photos, setPhotos] = useState<EvidencePhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { color } = useTheme();
  // A basket's report names its items (cart D45, CT-48a); those ticked Not here at the handover come picked, as missing.
  const [picked, setPicked] = useState<number[]>(params.lines ?? []);
  const [missing, setMissing] = useState(Boolean(params.lines?.length));

  if (!booking) {
    return (
      <NonScrollableContainer>
        <SubpageHeader title="Report a fault" />
        {query.isError ? (
          <BookingLoadError error={query.error} what="this booking" onRetry={() => void query.refetch()} />
        ) : (
          <BookingLoading label="Loading your booking" />
        )}
      </NonScrollableContainer>
    );
  }

  const blocked = faultBlocked(booking, now);
  const basket = isBasket(booking);
  const chosen = basket ? liveLines(booking).filter((l) => picked.includes(l.id)) : [];
  // "Didn't receive this": the server needs a photo all the same, so it is of what came (ENG-336).
  const absent = chosen.length > 0 && missing;
  const hold =
    basket && !chosen.length ? "Pick the items with the problem." : faultHold(statement, photos.length, absent);
  // What the desk reads first: CT-36b's "Didn't receive this" or "Not working".
  const said = basket
    ? `${missing ? (chosen.length > 1 ? "Didn't receive these" : "Didn't receive this") : "Not working"}: ${statement.trim()}`
    : statement;
  const sending = running !== null;
  const until = deadlineLabel(booking.report_fault_until, now);

  const opened = (claimId: number) => {
    toast.success("Sent to Renit", { message: "You will hear by the end of tomorrow." });
    // The claim replaces this form: back from it goes to the rental, not to a form that would send again.
    navigation.dispatch(StackActions.replace("Claim", { id: claimId }));
  };

  const send = () =>
    run("send", async () => {
      setError(null);
      const up = await uploadPhotos(photos, `${number}-fault`);
      setPhotos(up.photos);
      if (up.failed > 0) {
        setError(failedPhotosText(up.failed, up.photos.length));
        return;
      }
      // What the booking held before the press: only a claim that was not there, with these words, is this report.
      const before = booking.claims;
      try {
        const made = await reportFault(number, said, urlsOf(up.photos) ?? [], chosen.map((l) => l.id));
        queryClient.setQueryData(bookingQueryKey(number), made.booking);
        // The photos are on Renit's bucket now: their copies on the phone have done their work.
        discardEvidence(up.photos);
        opened(made.claim.id);
      } catch (failure) {
        const refused = apiError(failure);
        if (refused && refused.status > 0) {
          setError(faultErrorText(refused));
          // A file the server did not take (not on Renit's storage, too large) is uploaded afresh at the next press.
          if (refusedFiles(refused, "photos")) setPhotos(forgetAddresses(up.photos));
          // The booking may have moved on (the 24 hours ran out, a claim is already open): the server's state is the truth.
          void queryClient.invalidateQueries(bookingQueryKey(number));
          return;
        }
        // No answer at all: the report may have been made. The booking says so before another send is allowed.
        try {
          const fresh = await fetchBooking(number);
          queryClient.setQueryData(bookingQueryKey(number), fresh);
          const claimId = await findMyReport(newClaimIds(before, fresh.claims), { kind: "fault", statement: said });
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
      <SubpageHeader title={basket ? "Report a problem" : "Report a fault"} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.md, paddingBottom: space.md + keyboard }}
      >
        <View style={{ gap: 2 }}>
          <Text role="screenTitle" accessibilityRole="header">
            {basket ? "Which item has a problem?" : "What doesn't work?"}
          </Text>
          <Text fontSize="text-md" tone="body">
            {[booking.number, booking.product.title, booking.shop.name].join(" · ")}
          </Text>
        </View>

        {blocked ? (
          <Notice tone="warning" icon="info">
            {blocked}
          </Notice>
        ) : (
          <>
            {basket ? (
              <Panel>
                <View>
                  {liveLines(booking).map((item, index) => {
                    const selected = picked.includes(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        accessibilityLabel={`${item.product.title}, ${item.ref}`}
                        activeOpacity={0.7}
                        disabled={sending}
                        onPress={() =>
                          setPicked((ids) => (selected ? ids.filter((id) => id !== item.id) : [...ids, item.id]))
                        }
                        style={{
                          minHeight: MIN_TOUCH_TARGET + 12,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: space.md,
                          padding: space.md,
                          borderTopWidth: index === 0 ? 0 : 1,
                          borderTopColor: color.line,
                        }}
                      >
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            borderWidth: 2,
                            borderColor: selected ? color.brand : color.inputLine,
                            backgroundColor: selected ? color.brand : "transparent",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {selected ? <CheckIcon size={14} color={color.onBrand} strokeWidth={3} /> : null}
                        </View>
                        <Thumb uri={item.product.cover_image} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text fontSize="text-md" fontWeight="font-bold">
                            {item.product.title}
                          </Text>
                          <Text fontSize="text-sm" tone="body">
                            {item.ref}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Panel>
            ) : null}
            {chosen.length ? (
              <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
                <ChoiceRow
                  title={chosen.length > 1 ? "Didn't receive these" : "Didn't receive this"}
                  sub="Not in the bag at the handover."
                  selected={missing}
                  onPress={() => setMissing(true)}
                />
                <ChoiceRow
                  title="Not working"
                  sub="Came, but does not work as listed."
                  selected={!missing}
                  onPress={() => setMissing(false)}
                />
              </View>
            ) : null}
            <TextField
              value={statement}
              onChangeText={setStatement}
              multiline
              maxLength={MAX_STATEMENT}
              editable={!sending}
              placeholder="Say what is wrong: it will not switch on, a button does nothing."
              accessibilityLabel="What does not work"
              style={{ minHeight: 110 }}
            />
            <Text role="sectionTitle" accessibilityRole="header">
              {absent ? "A photo of what you were handed" : "Photos of the problem"}
            </Text>
            {absent ? (
              <Text fontSize="text-sm" tone="body">
                Lay out everything the shop gave you and take a photo of it, so Renit can see what is missing.
              </Text>
            ) : null}
            <PhotoRow
              photos={photos}
              onChange={setPhotos}
              addLabel={photos.length > 0 ? "Add another photo" : "Take a photo"}
              disabled={sending}
              courier={byRenit(booking)}
            />
            {basket ? (
              chosen.length ? (
                <Notice tone="info" icon="info" title="How Renit decides">
                  {lineFaultNotice(chosen)}
                </Notice>
              ) : null
            ) : (
              <Notice tone="warning" icon="info">
                {faultNotice(booking)}
              </Notice>
            )}
          </>
        )}
        {/* The words above send people to Get help when a fault can't be reported: it is here, not a screen away. */}
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
                {`You have until ${until}.`}
              </Text>
            ) : null}
            <Button variant="outline" disabled={sending} onPress={() => navigation.goBack()}>
              Go back
            </Button>
          </>
        )}
      </BottomBar>
      <ConfirmSheet
        ref={confirm}
        title="Send this report to Renit?"
        body={
          basket
            ? "Renit gets your words and photos now. A report can't be taken back. The rest of the rental goes on while Renit decides."
            : "Renit gets your words and photos now. A report can't be taken back, and the item has to go back before any refund."
        }
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
