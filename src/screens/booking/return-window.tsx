import { askEarlyReturn, bookingQueryKey, fetchReturnWindows, setReturnWindow, useBooking } from "@/backend/bookings";
import { BookingLoadError, BookingLoading, BottomBar, Notice } from "@/components/booking/parts";
import { Button, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { apiError } from "@/lib/api-error";
import { TimeWindow, dayShort, todayIst, windowLabel } from "@/lib/booking";
import { correctedNow } from "@/lib/server-clock";
import { earlyPickNote, earlyRequestCopy, nowWhen, returnWindowCopy, returnWindowErrorText } from "@/lib/day-of";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useRef, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { CheckIcon } from "react-native-heroicons/mini";
import { useQuery, useQueryClient } from "react-query";

/** ENG-442's Return now, in the place of a slot's start. */
const NOW = "now";

/**
 * C6 (B1): the slot Renit's courier partner collects the return in, from the server's courier slots (`return-window/`).
 * BK-07's picker, with no shop to answer: a pick is one tap, and picking again moves it while the server still offers it.
 * A slot that has just filled, or closed, is refused and the list is read again.
 * ENG-442: before the last day it also offers Return now and the earlier days. Those are asked of the shop, which accepts
 * or declines; nothing is booked until it accepts.
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
  const [shownDay, setShownDay] = useState<string | null>(null);
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

  const data = slotsQuery.data;
  const changing = Boolean(booking.courier?.return?.window);
  const now = correctedNow(booking.server_time, bookingQuery.dataUpdatedAt);
  const today = todayIst(now);
  // ENG-442: the earlier days (the shop accepts first), then the day offered as before.
  const days = [...(data.early_days ?? []), { day: data.day, windows: data.windows }];
  const day = shownDay && days.some((d) => d.day === shownDay) ? shownDay : data.day;
  const windows = days.find((d) => d.day === day)?.windows ?? [];
  const copy = returnWindowCopy({ day, earliest: data.earliest }, booking.last_day, changing, today);
  const returnNow = data.now ?? null;
  const choice = picked === NOW ? returnNow : windows.find((w) => w.start === picked) ?? null;
  // Anything before the day offered is an ask of the shop's, never a pick.
  const early = picked === NOW || (choice !== null && day !== data.day);
  const lastDay = booking.courier?.return?.earliest ?? booking.last_day;
  const waiting = earlyRequestCopy(data.request ?? booking.courier?.return?.request, lastDay, now, booking.courier?.return?.window);
  // The no-fee day is marked, also when the last day had no slot and the server moved it (`earliest`).
  const noFee = (d: string) => d === booking.last_day || d === data.earliest;
  const dayLabel = (d: string) => (d === today ? "Today" : noFee(d) ? `${dayShort(d)} · last day` : dayShort(d));

  const save = async () => {
    if (!choice || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      if (early) {
        const pick = picked === NOW ? ({ now: true } as const) : { start: choice.start };
        queryClient.setQueryData(bookingQueryKey(params.number), await askEarlyReturn(params.number, pick));
        toast.success("Asked the shop", { message: "We'll tell you when they answer. Nothing is booked until then." });
      } else {
        queryClient.setQueryData(bookingQueryKey(params.number), await setReturnWindow(params.number, choice.start));
        toast.success("Return window set", { message: "Renit books the rider and tells you who is coming." });
      }
      void queryClient.invalidateQueries(["return-windows", params.number]);
      navigation.goBack();
    } catch (failure) {
      const problem = apiError(failure);
      setError(returnWindowErrorText(problem));
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

  const label = picked === NOW ? "Return now" : choice ? windowLabel(choice) : null;
  const action = !label
    ? "Pick a time"
    : picked === NOW
      ? "Ask the shop: return now"
      : early
        ? `Ask the shop for ${label} ${day === today ? "today" : dayShort(day)}`
        : `Confirm ${label}`;
  const pickSlot = (start: string) => {
    setPicked(start);
    setError(null);
  };

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

        {waiting?.open ? (
          <Notice tone="brand" icon="clock" title={waiting.title}>
            {`${waiting.body} A time you pick below takes its place.`}
          </Notice>
        ) : null}

        {copy.note ? (
          <Notice tone="warning" icon="clock">
            {copy.note}
          </Notice>
        ) : null}

        {returnNow ? (
          <TouchableOpacity
            accessibilityRole="radio"
            accessibilityState={{ selected: picked === NOW }}
            accessibilityLabel={`Return now, a rider ${nowWhen(returnNow, today)}`}
            activeOpacity={0.7}
            onPress={() => pickSlot(NOW)}
            style={{
              minHeight: MIN_TOUCH_TARGET + 16,
              padding: space.md,
              gap: 2,
              borderRadius: radius.button,
              borderWidth: picked === NOW ? 2 : 1,
              borderColor: picked === NOW ? color.brand : color.inputLine,
              backgroundColor: picked === NOW ? color.brandPanel : color.surface,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              {picked === NOW ? <CheckIcon size={16} color={color.brandText} /> : null}
              <Text fontSize="text-md" fontWeight="font-bold">
                Return now
              </Text>
            </View>
            <Text fontSize="text-sm" tone="body">
              {`A rider comes ${nowWhen(returnNow, today)}, once the shop accepts`}
            </Text>
          </TouchableOpacity>
        ) : null}

        {days.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            // To the screen's edges: a chip past the gutter reads as more to scroll, not cut off.
            style={{ marginHorizontal: -SCREEN_GUTTER }}
            contentContainerStyle={{ gap: space.sm, paddingHorizontal: SCREEN_GUTTER }}
          >
            {days.map((d) => {
              const selected = d.day === day;
              return (
                <TouchableOpacity
                  key={d.day}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  activeOpacity={0.7}
                  onPress={() => {
                    setShownDay(d.day);
                    if (picked !== NOW) setPicked(null);
                  }}
                  style={{
                    minHeight: MIN_TOUCH_TARGET,
                    justifyContent: "center",
                    paddingHorizontal: space.md,
                    borderRadius: radius.button,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? color.brand : color.inputLine,
                    backgroundColor: selected ? color.brandPanel : color.surface,
                  }}
                >
                  <Text fontSize="text-sm" fontWeight={selected ? "font-bold" : "font-normal"}>
                    {dayLabel(d.day)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
                  onPress={() => pickSlot(slot.start)}
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
                  <Text fontSize="text-sm" fontWeight={selected ? "font-bold" : "font-normal"} numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1 }}>
                    {windowLabel(slot)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {early || day !== data.day ? <Notice icon="info">{earlyPickNote(data.reply_minutes)}</Notice> : null}

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
          {action}
        </Button>
      </BottomBar>
    </NonScrollableContainer>
  );
}
