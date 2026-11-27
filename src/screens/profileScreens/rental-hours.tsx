import { patchShop, shopQueryKey, useShop } from "@/backend/shop";
import { BottomBar, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { TimeSheet } from "@/components/shop/pick-sheets";
import { ShopLoadError, ShopLoading } from "@/components/shop/states";
import { useGlobalContext } from "@/context/global-context";
import { apiError, fieldErrors } from "@/lib/api-error";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
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
import { useFocusEffect, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { AppSwitch } from "@/components/core/switch";
import { useQueryClient } from "react-query";

type Editing = { day: DayKey; which: "open" | "close" };

/**
 * Dev builds only (design fixtures, section 12): the time sheet open on a day (2096:30129), or the list scrolled to
 * its end (2096:29799, 2096:30017). Initial local state only; nothing is saved.
 */
type RentalHoursDesign = { timeSheet?: { day: DayKey; edge: Editing["which"] }; scrollToEnd?: boolean };

/** One of the two times on a day: a 96×44 hairline chip that opens the time list (2096:29799 "Time chip"). */
function TimeChip({
  label,
  value,
  invalid,
  onPress,
}: {
  label: string;
  value: string;
  invalid: boolean;
  onPress: () => void;
}) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${label} ${time12(value)}`}
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        minHeight: 44,
        minWidth: 96,
        paddingHorizontal: 16,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: invalid ? color.dangerStrong : color.line,
        backgroundColor: color.surface,
      }}
    >
      <Text fontSize="text-md" fontWeight="font-semibold">
        {time12(value)}
      </Text>
    </TouchableOpacity>
  );
}

function HoursForm({ initial, design }: { initial: Hours; design?: RentalHoursDesign }) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const queryClient = useQueryClient();
  const { userDetails } = useGlobalContext();
  const timeSheet = useRef<BottomSheetModal>(null);
  const scroll = useRef<ScrollView>(null);
  const scrolled = useRef(false);

  const [hours, setHours] = useState<Hours>(initial);
  const [editing, setEditing] = useState<Editing | null>(
    design?.timeSheet ? { day: design.timeSheet.day, which: design.timeSheet.edge } : null
  );

  // A seeded time sheet opens once its modal has mounted (gorhom ignores an earlier present()), and closes when the
  // next fixture is pushed over this screen.
  useEffect(() => {
    if (!design?.timeSheet) return;
    // Only while in front: the form remounts on the covered screen when the next fixture refetches the shop.
    const timer = setTimeout(() => navigation.isFocused() && timeSheet.current?.present(), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (!design) return undefined;
      return () => timeSheet.current?.dismiss();
    }, [design])
  );
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
      {/* 2096:29799: Content p16/24/24/24, the intro 14/20 then 16, then a block per day under a hairline. */}
      <ScrollView
        ref={scroll}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (!design?.scrollToEnd || scrolled.current) return;
          scrolled.current = true;
          scroll.current?.scrollToEnd({ animated: false });
        }}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 16, paddingBottom: 24 }}
      >
        <Text tone="body" fontSize="text-sm" style={{ marginBottom: 16 }}>
          The hours you can hand an item over. Your Open switch follows them by itself.
        </Text>

        {DAY_KEYS.map((day) => {
          const value = hours[day];
          const problem = check.days[day];
          return (
            <View
              key={day}
              style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: color.line, gap: 8 }}
            >
              {/* 31 high, the frame's switch, whatever height the platform's switch draws. */}
              <View
                style={{ minHeight: 31, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
              >
                <View>
                  <Text fontSize="text-md" fontWeight="font-semibold">
                    {DAY_LONG[day]}
                  </Text>
                  {value ? null : (
                    <Text fontSize="text-sm" tone="dim">
                      Closed
                    </Text>
                  )}
                </View>
                <AppSwitch
                  accessibilityLabel={`${DAY_LONG[day]} open`}
                  value={Boolean(value)}
                  onValueChange={(on) => setDay(day, on ? dayToOpen(hours) : null)}
                  // The frame's off track is the light grey of a hairline; iOS fills it from ios_backgroundColor.
                  trackColor={{ true: color.brand, false: color.line }}
                  ios_backgroundColor={color.line}
                  thumbColor="#FFFFFF"
                />
              </View>
              {value ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TimeChip
                    label={`${DAY_LONG[day]} opens`}
                    value={value.open}
                    invalid={Boolean(problem)}
                    onPress={() => editTime(day, "open")}
                  />
                  <Text fontSize="text-sm" tone="body">
                    to
                  </Text>
                  <TimeChip
                    label={`${DAY_LONG[day]} closes`}
                    value={value.close}
                    invalid={Boolean(problem)}
                    onPress={() => editTime(day, "close")}
                  />
                </View>
              ) : null}
              {problem ? (
                <Text
                  fontSize="text-xs"
                  fontWeight="font-medium"
                  style={{ color: color.dangerStrong }}
                  accessibilityLiveRegion="polite"
                >
                  {problem}
                </Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      {/* What the old strip also said (no frame draws it): the week's problem dim, a refused save in red. */}
      {check.week || serverError ? (
        <Text
          tone={serverError ? "danger" : "dim"}
          fontSize="text-sm"
          style={{ textAlign: "center", paddingHorizontal: SCREEN_GUTTER, paddingTop: 8 }}
          accessibilityLiveRegion="polite"
        >
          {serverError ?? check.week}
        </Text>
      ) : null}
      <BottomBar
        primary={{
          label: "Save hours",
          onPress: () => void save(),
          disabled: !check.ok || !hoursChanged(initial, hours),
          loading: saving,
        }}
      />

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

/** The hours editor SH-13's "Edit" opens: a switch and two times for each day. The top bar is its only title. */
export default function RentalHoursScreen() {
  const route = useRoute();
  const design = __DEV__ ? (route.params as { design?: RentalHoursDesign } | undefined)?.design : undefined;
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
        <HoursForm initial={query.data.hours} design={design} />
      ) : (
        <ShopLoadError
          error={query.error}
          onRetry={() => void (profileFailed ? fetchUserDetails() : query.refetch())}
        />
      )}
    </NonScrollableContainer>
  );
}
