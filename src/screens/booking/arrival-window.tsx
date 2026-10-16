import {
  bookingQueryKey,
  fetchWindows,
  requestWindowChange,
  setWindow,
  useBooking,
} from "@/backend/bookings";
import { BookingLoadError, BookingLoading, BottomBar, Notice } from "@/components/booking/parts";
import { Button, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { apiError } from "@/lib/api-error";
import { bookingLabel, TimeWindow, windowErrorText, windowHeading, windowLabel } from "@/lib/booking";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useRef, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { CheckIcon } from "react-native-heroicons/mini";
import { useQuery, useQueryClient } from "react-query";

/**
 * BK-07, "When will you collect it?": the one-hour windows left on the first
 * day, inside the shop's hours. The first pick is one tap and the shop does not
 * have to answer it. Once a window is set, the same screen asks the shop to
 * change it: a request they can accept or decline, and nothing moves until then.
 */
export default function ArrivalWindowScreen() {
  const { params } = useRoute<RouteProps<"BookingWindow">>();
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const queryClient = useQueryClient();
  const bookingQuery = useBooking(params.number);
  const booking = bookingQuery.data;
  const windowsQuery = useQuery(["booking-windows", params.number], () => fetchWindows(params.number), {
    staleTime: 0,
  });

  const [picked, setPicked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const header = <SubpageHeader title={bookingLabel(params.number)} />;

  if (!booking || !windowsQuery.data) {
    const failed = bookingQuery.isError || windowsQuery.isError;
    return (
      <NonScrollableContainer>
        {header}
        {failed ? (
          <BookingLoadError
            error={bookingQuery.error ?? windowsQuery.error}
            what="the arrival times"
            onRetry={() => {
              void bookingQuery.refetch();
              void windowsQuery.refetch();
            }}
          />
        ) : (
          <BookingLoading label="Loading the arrival times" />
        )}
      </NonScrollableContainer>
    );
  }

  const { day, windows } = windowsQuery.data;
  const heading = windowHeading(booking, day);
  // A window is already set: this is a request to change it, not a pick.
  const changing = booking.window !== null;
  const waiting = booking.window_request !== null;
  const choice = windows.find((w) => w.start === picked) ?? null;

  const save = async () => {
    if (!choice || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      const next = changing
        ? await requestWindowChange(params.number, choice.start)
        : await setWindow(params.number, choice.start);
      queryClient.setQueryData(bookingQueryKey(params.number), next);
      if (changing) {
        toast.success("Asked the shop", { message: "Your time stays as it is until they accept." });
      } else {
        toast.success("Arrival time set");
      }
      navigation.goBack();
    } catch (failure) {
      const problem = apiError(failure);
      setError(windowErrorText(problem));
      // The list or the booking has moved on: a taken slot, or a window set from elsewhere.
      if (problem && problem.status > 0) {
        setPicked(null);
        void windowsQuery.refetch();
        void bookingQuery.refetch();
      }
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const label = choice ? windowLabel(choice) : null;

  return (
    <NonScrollableContainer>
      {header}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: space.md, gap: space.md }}
      >
        <View style={{ gap: space.xs }}>
          <Text role="screenTitle" accessibilityRole="header">
            {changing ? "Change your arrival time" : heading.title}
          </Text>
          <Text fontSize="text-md" tone="body">
            {heading.sub}
          </Text>
        </View>

        {windows.length === 0 ? (
          <Notice icon="warning">
            No arrival times are left on this day. Contact Renit from your profile and we will set one with the shop.
          </Notice>
        ) : (
          <View
            accessibilityRole="radiogroup"
            style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space.sm }}
          >
            {windows.map((slot: TimeWindow) => {
              const selected = slot.start === picked;
              return (
                <TouchableOpacity
                  key={slot.start}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled: waiting }}
                  accessibilityLabel={windowLabel(slot)}
                  activeOpacity={0.7}
                  disabled={waiting}
                  onPress={() => {
                    setPicked(slot.start);
                    setError(null);
                  }}
                  style={{
                    width: "48.5%",
                    minHeight: MIN_TOUCH_TARGET + 8,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    paddingHorizontal: space.sm,
                    borderRadius: radius.button,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? color.brand : color.inputLine,
                    backgroundColor: selected ? color.brandPanel : color.surface,
                    opacity: waiting ? 0.5 : 1,
                  }}
                >
                  {selected ? <CheckIcon size={16} color={color.brandText} /> : null}
                  <Text
                    fontSize="text-sm"
                    fontWeight={selected ? "font-bold" : "font-normal"}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {windowLabel(slot)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Notice>
          {waiting
            ? "A change is already waiting for an answer. You can ask again once it is answered."
            : changing
              ? "The shop has to accept the new time. Until they do, your arrival time stays as it is."
              : booking.delivery_mode === "pickup"
                ? "This tells the shop when you're coming. You can ask to change it later."
                : "This tells the shop when to arrive. You can ask to change it later."}
        </Notice>
      </ScrollView>

      <BottomBar>
        {error ? (
          <Text fontSize="text-sm" tone="danger" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <Button onPress={save} loading={saving} disabled={saving || !choice || waiting}>
          {label ? (changing ? `Ask to change to ${label}` : `Confirm ${label}`) : "Pick a time"}
        </Button>
      </BottomBar>
    </NonScrollableContainer>
  );
}
