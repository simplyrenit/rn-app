import { bookingQueryKey, useBooking } from "@/backend/bookings";
import { useCaptureDraft } from "@/backend/capture-jobs";
import { useCaptures } from "@/backend/captures";
import { refuseAtDoor } from "@/backend/handover";
import { BookingLoadError, BookingLoading, BottomBar, Notice } from "@/components/booking/parts";
import { Button, SubpageHeader, Text, TextField } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { EvidencePhoto, PhotoRow, discardEvidence, uploadEvidence } from "@/components/handover/photo-row";
import { useGuardedTap } from "@/components/handover/parts";
import { apiError } from "@/lib/api-error";
import { DOOR_PROBLEMS, DoorProblem, dayErrorText, refuseCopy, refuseHold } from "@/lib/day-of";
import { byRenit } from "@/lib/delivery";
import { MAX_EVIDENCE_PHOTOS } from "@/lib/evidence";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { CheckIcon } from "react-native-heroicons/mini";
import { useQueryClient } from "react-query";

/** The longest statement sent. Enough for what is different; the photos carry the rest. */
const MAX_STATEMENT = 500;

/**
 * BK-19, "Not as described": the customer refuses at the door, before the code,
 * with what is different and photos (N14). The photos just taken for the capture
 * are attached, and more can be added with the camera. Renit's staff decide by
 * the end of the next day; until then the handover code is paused and no money moves.
 *
 * B1: on a booking Renit's courier partner carries, it is "Problem at the door": the customer first says what they found.
 * A broken seal or box is the trip's fault (the server opens it as one, plan §8a) and needs only the photos.
 */
export default function NotAsDescribedScreen() {
  const { params } = useRoute<RouteProps<"BookingRefuse">>();
  const { number } = params;
  const navigation = useTypedNavigation();
  const queryClient = useQueryClient();
  const keyboard = useKeyboardInset();
  const query = useBooking(number);
  const booking = query.data;
  const captures = useCaptures(number, false);
  const draft = useCaptureDraft(number, "handover", "customer");
  const { color } = useTheme();
  const { running, run } = useGuardedTap();
  const [problem, setProblem] = useState<DoorProblem>("not_as_described");
  const [statement, setStatement] = useState("");
  const [extra, setExtra] = useState<EvidencePhoto[]>([]);
  const [error, setError] = useState<string | null>(null);

  // The photos of this customer's own capture: from the server once they are up, else from this phone.
  const mine = captures.data?.handover?.customer ?? null;
  const taken: EvidencePhoto[] = useMemo(() => {
    if (mine) return mine.shots.map((shot) => ({ uri: shot.url, url: shot.url, fixed: true }));
    if (!draft) return [];
    return draft.list.shots
      .map((shot) => draft.shots[shot.key])
      .filter((file): file is NonNullable<typeof file> => Boolean(file))
      .map((file) => ({ uri: file.uri, url: file.url, fixed: true }));
  }, [mine, draft]);

  if (!booking) {
    return (
      <NonScrollableContainer>
        <SubpageHeader title="Not as described" />
        {query.isError ? (
          <BookingLoadError error={query.error} what="this booking" onRetry={() => void query.refetch()} />
        ) : (
          <BookingLoading label="Loading your booking" />
        )}
      </NonScrollableContainer>
    );
  }

  const courier = byRenit(booking);
  const header = courier ? "Problem at the door" : "Not as described";
  const photos = [...taken, ...extra];
  const copy = refuseCopy(booking, Math.min(taken.length, MAX_EVIDENCE_PHOTOS), problem);
  const hold = refuseHold(statement, photos.length, problem);
  const sending = running !== null;

  const send = () =>
    run("send", async () => {
      setError(null);
      try {
        // The server takes ten at most: the photos just taken for the capture first, then the ones added here.
        const urls = await uploadEvidence(photos.slice(0, MAX_EVIDENCE_PHOTOS), `${number}-not-as-described`);
        // `problem` only on a courier booking: a shop booking's body is as it always was.
        const answer = await refuseAtDoor(number, statement.trim(), urls, courier ? problem : undefined);
        queryClient.setQueryData(bookingQueryKey(number), answer.booking);
        // The extra photos are on Renit's bucket now: their copies on the phone have done their work.
        discardEvidence(extra);
        toast.success("Sent to Renit", { message: "You will hear by the end of tomorrow." });
        navigation.navigate("Booking", { number });
      } catch (failure) {
        const refused = apiError(failure);
        // No HTTP failure at all means a photo did not upload.
        setError(refused ? dayErrorText(refused, new Date()) : "A photo did not upload. Check your connection and try again.");
        // The booking may have moved on (the shop typed the code, or cancelled): the server's stage is the truth.
        if (refused && refused.status > 0) void queryClient.invalidateQueries(bookingQueryKey(number));
      }
    });

  return (
    <NonScrollableContainer>
      <SubpageHeader title={header} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.md, paddingBottom: space.md + keyboard }}
      >
        {courier ? (
          <>
            <Text role="screenTitle" accessibilityRole="header">
              What did you find?
            </Text>
            <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
              {DOOR_PROBLEMS.map((choice) => {
                const selected = choice.problem === problem;
                return (
                  <TouchableOpacity
                    key={choice.problem}
                    accessibilityRole="radio"
                    accessibilityState={{ selected, disabled: sending }}
                    activeOpacity={0.7}
                    disabled={sending}
                    onPress={() => setProblem(choice.problem)}
                    style={{
                      minHeight: MIN_TOUCH_TARGET + 8,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: space.sm,
                      paddingHorizontal: space.md,
                      borderRadius: radius.button,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? color.brand : color.inputLine,
                      backgroundColor: selected ? color.brandPanel : color.surface,
                    }}
                  >
                    <Text fontSize="text-md" fontWeight={selected ? "font-bold" : "font-normal"} style={{ flex: 1 }}>
                      {choice.label}
                    </Text>
                    {selected ? <CheckIcon size={18} color={color.brandText} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text role="sectionTitle" accessibilityRole="header">
              {problem === "not_as_described" ? "What's different from the listing?" : "Anything to add? (optional)"}
            </Text>
          </>
        ) : (
          <Text role="screenTitle" accessibilityRole="header">
            What's different from the listing?
          </Text>
        )}
        <TextField
          value={statement}
          onChangeText={setStatement}
          multiline
          maxLength={MAX_STATEMENT}
          editable={!sending}
          placeholder="Say what you see: a crack, a missing part, a different model."
          accessibilityLabel="What is different from the listing"
          style={{ minHeight: 110 }}
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <Text role="sectionTitle" accessibilityRole="header" style={{ flex: 1 }}>
            Photos attached
          </Text>
          {copy.attachedNote ? (
            <Text fontSize="text-xs" tone="body">
              {copy.attachedNote}
            </Text>
          ) : null}
        </View>
        <PhotoRow
          photos={photos}
          onChange={(next) => setExtra(next.filter((photo) => !photo.fixed))}
          addLabel={photos.length > 0 ? "Add another photo" : "Take a photo"}
          disabled={sending}
        />
        <Notice tone="warning" icon="info">
          {copy.notice}
        </Notice>
      </ScrollView>
      <BottomBar>
        {error ?? hold ? (
          <Text fontSize="text-sm" tone={error ? "danger" : "body"} accessibilityRole={error ? "alert" : undefined}>
            {error ?? hold}
          </Text>
        ) : null}
        <Button onPress={() => void send()} loading={sending} disabled={sending || hold !== null}>
          Send to Renit
        </Button>
        <Button variant="outline" disabled={sending} onPress={() => navigation.goBack()}>
          Go back
        </Button>
      </BottomBar>
    </NonScrollableContainer>
  );
}
