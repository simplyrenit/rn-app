import { patchShop, shopQueryKey, useShop } from "@/backend/shop";
import { Button, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { TimeSheet } from "@/components/shop/pick-sheets";
import { ShopLoadError, ShopLoading } from "@/components/shop/states";
import { useGlobalContext } from "@/context/global-context";
import { apiError, fieldErrors } from "@/lib/api-error";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import {
  DAY_KEYS,
  DAY_LONG,
  DayKey,
  Hours,
  checkHours,
  dayToOpen,
  hoursChanged,
  hoursPayload,
  time12,
} from "@/lib/shop";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { useRef, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { AppSwitch } from "@/components/core/switch";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

type Editing = { day: DayKey; which: "open" | "close" };

/** One of the two times on a day: a bordered chip that opens the time list. */
function TimeChip({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${label} ${time12(value)}`}
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        minHeight: MIN_TOUCH_TARGET,
        minWidth: 84,
        paddingHorizontal: space.md,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.button,
        borderWidth: 1,
        borderColor: color.inputLine,
        backgroundColor: color.surface,
      }}
    >
      <Text fontSize="text-md" fontWeight="font-bold">
        {time12(value)}
      </Text>
    </TouchableOpacity>
  );
}

function HoursForm({ initial }: { initial: Hours }) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { userDetails } = useGlobalContext();
  const timeSheet = useRef<BottomSheetModal>(null);

  const [hours, setHours] = useState<Hours>(initial);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const check = checkHours(hours);

  const setDay = (day: DayKey, value: Hours[DayKey]) => {
    setHours((current) => ({ ...current, [day]: value }));
    setServerError(null);
  };

  const editTime = (day: DayKey, which: Editing["which"]) => {
    setEditing({ day, which });
    timeSheet.current?.present();
  };

  const pickTime = (time: string) => {
    timeSheet.current?.dismiss();
    if (!editing) return;
    const current = hours[editing.day];
    if (current) setDay(editing.day, { ...current, [editing.which]: time });
  };

  const save = async () => {
    if (!check.ok) return;
    setSaving(true);
    setServerError(null);
    try {
      const shop = await patchShop({ hours: hoursPayload(hours) });
      queryClient.setQueryData(shopQueryKey(userDetails?.username), shop);
      toast.success("Your hours are saved");
      navigation.goBack();
    } catch (error) {
      const failure = apiError(error);
      setServerError(
        Object.values(fieldErrors(failure))[0] ??
          failure?.message ??
          "We couldn't save your hours. Check your connection and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const editingValue = editing ? hours[editing.day]?.[editing.which] ?? null : null;

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.md,
          paddingBottom: space.lg,
        }}
      >
        <Text role="screenTitle" accessibilityRole="header">
          Handover hours
        </Text>
        <Text tone="body" fontSize="text-md" style={{ marginTop: space.sm, marginBottom: space.md }}>
          The hours you can hand an item over. Your Open switch follows them by itself.
        </Text>

        {DAY_KEYS.map((day) => {
          const value = hours[day];
          return (
            <View
              key={day}
              style={{
                paddingVertical: space.sm,
                borderTopWidth: 1,
                borderTopColor: color.line,
                gap: space.sm,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <Text fontSize="text-md" fontWeight="font-bold">
                    {DAY_LONG[day]}
                  </Text>
                  {value ? null : (
                    <Text fontSize="text-sm" tone="body">
                      Closed
                    </Text>
                  )}
                </View>
                <AppSwitch
                  accessibilityLabel={`${DAY_LONG[day]} open`}
                  value={Boolean(value)}
                  onValueChange={(on) => setDay(day, on ? dayToOpen(hours) : null)}
                  trackColor={{ true: color.brand, false: color.inputLine }}
                  thumbColor="#FFFFFF"
                />
              </View>
              {value ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                  <TimeChip label={`${DAY_LONG[day]} opens`} value={value.open} onPress={() => editTime(day, "open")} />
                  <Text fontSize="text-md" tone="body">
                    to
                  </Text>
                  <TimeChip label={`${DAY_LONG[day]} closes`} value={value.close} onPress={() => editTime(day, "close")} />
                </View>
              ) : null}
              {check.days[day] ? (
                <Text tone="danger" fontSize="text-sm" accessibilityLiveRegion="polite">
                  {check.days[day]}
                </Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.sm,
          paddingBottom: insets.bottom + space.sm,
          gap: space.sm,
        }}
      >
        {check.week || serverError ? (
          <Text tone={serverError ? "danger" : "dim"} fontSize="text-sm" style={{ textAlign: "center" }} accessibilityLiveRegion="polite">
            {serverError ?? check.week}
          </Text>
        ) : null}
        <Button disabled={!check.ok || !hoursChanged(initial, hours)} loading={saving} onPress={save}>
          Save hours
        </Button>
      </View>

      <TimeSheet
        ref={timeSheet}
        title={
          editing
            ? `${DAY_LONG[editing.day]} ${editing.which === "open" ? "opens at" : "closes at"}`
            : "Time"
        }
        value={editingValue}
        onSelect={pickTime}
      />
    </>
  );
}

/** The hours editor SH-13's "Edit" opens: a switch and two times for each day. */
export default function RentalHoursScreen() {
  const { userDetailsFailed, fetchUserDetails } = useGlobalContext();
  const query = useShop();
  const header = <SubpageHeader title="Handover hours" />;
  const profileFailed = query.isIdle && userDetailsFailed;

  return (
    <NonScrollableContainer>
      {header}
      {(query.isLoading || query.isIdle) && !profileFailed ? (
        <ShopLoading label="Loading your hours" />
      ) : query.data ? (
        <HoursForm initial={query.data.hours} />
      ) : (
        <ShopLoadError
          error={query.error}
          onRetry={() => void (profileFailed ? fetchUserDetails() : query.refetch())}
        />
      )}
    </NonScrollableContainer>
  );
}
