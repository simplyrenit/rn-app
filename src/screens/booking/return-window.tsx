import { bookingQueryKey, fetchReturnWindows, setReturnWindow, useBooking } from "@/backend/bookings";
import { BookingLoadError, BookingLoading, BottomBar, Notice } from "@/components/booking/parts";
import { Button, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { apiError } from "@/lib/api-error";
import { TimeWindow, windowErrorText, windowLabel } from "@/lib/booking";
import { returnWindowCopy } from "@/lib/day-of";
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
 * C6 (B1): the slot Renit's courier partner collects the return in, from the server's courier slots (`return-window/`).
 * BK-07's picker, with no shop to answer: a pick is one tap, and picking again moves it while the server still offers it.
 * A slot that has just filled, or closed, is refused and the list is read again.
 */
export default function ReturnWindowScreen() {
  const { params } = useRoute<RouteProps<"BookingReturnWindow">>();
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const queryClient = useQueryClient();
  const bookingQuery = useBooking(params.number);
  const booking = bookingQuery.data;
  const slotsQuery = useQuery(["return-windows", params.number], () => fetchReturnWindows(params.number), { staleTime: 0 });

  const [picked, setPicked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const header = <SubpageHeader title="Return" />;

  if (!booking || !slotsQuery.data) {
    const failed = bookingQuery.isError || slotsQuery.isError;
    return (
      <NonScrollableContainer>
        {header}
        {failed ? (
          <BookingLoadError
            error={bookingQuery.error ?? slotsQuery.error}
            what="the return times"
            onRetry={() => {
              void bookingQuery.refetch();
              void slotsQuery.refetch();
            }}
          />
        ) : (
          <BookingLoading label="Loading the return times" />
        )}
      </NonScrollableContainer>
    );
  }

  const { windows } = slotsQuery.data;
  const changing = Boolean(booking.courier?.return?.window);
  const copy = returnWindowCopy(slotsQuery.data, booking.last_day, changing);
  const choice = windows.find((w) => w.start === picked) ?? null;

  const save = async () => {
    if (!choice || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      queryClient.setQueryData(bookingQueryKey(params.number), await setReturnWindow(params.number, choice.start));
      toast.success("Return window set", { message: "Renit books the rider and tells you who is coming." });
      navigation.goBack();
    } catch (failure) {
      const problem = apiError(failure);
      setError(windowErrorText(problem));
      // A slot taken or closed meanwhile, or a booking that moved on: read both again.
      if (problem && problem.status > 0) {
        setPicked(null);
        void slotsQuery.refetch();
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
            {copy.title}
          </Text>
          <Text fontSize="text-md" tone="body">
            {copy.sub}
          </Text>
        </View>

        {copy.note ? (
          <Notice tone="warning" icon="clock">
            {copy.note}
          </Notice>
        ) : null}

        {windows.length === 0 ? (
          <Notice icon="warning">No return times are left. Call via Renit and the desk will set one with you.</Notice>
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
                  accessibilityState={{ selected }}
                  accessibilityLabel={windowLabel(slot)}
                  activeOpacity={0.7}
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
                  }}
                >
                  {selected ? <CheckIcon size={16} color={color.brandText} /> : null}
                  <Text fontSize="text-sm" fontWeight={selected ? "font-bold" : "font-normal"} numberOfLines={1} adjustsFontSizeToFit>
                    {windowLabel(slot)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Notice>
          Record it and close the bag with the spare seal before the rider comes. Late charges stop at your recording, so a
          rider's delay never costs you a day.
        </Notice>
      </ScrollView>

      <BottomBar>
        {error ? (
          <Text fontSize="text-sm" tone="danger" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <Button onPress={save} loading={saving} disabled={saving || !choice}>
          {label ? `Confirm ${label}` : "Pick a time"}
        </Button>
      </BottomBar>
    </NonScrollableContainer>
  );
}
