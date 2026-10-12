import {
  Device,
  devicesQueryKey,
  patchShop,
  setOpenState,
  shopQueryKey,
  ShopPatch,
  signOutDevice,
  useDevices,
  useShop,
} from "@/backend/shop";
import { SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useRingPermission } from "@/backend/ring-permission";
import { DayPickerModal } from "@/components/shop/day-picker-modal";
import { RingPermissionCard } from "@/components/shop/ring-permission-card";
import { DevicesSheet } from "@/components/shop/devices-sheet";
import { NoticeSheet } from "@/components/shop/pick-sheets";
import { ShopLoadError, ShopLoading } from "@/components/shop/states";
import { useGlobalContext } from "@/context/global-context";
import { apiError, fieldErrors } from "@/lib/api-error";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import {
  cannotOpenMessage,
  dayLabel,
  deliverySummary,
  deviceSignOutQuestion,
  hasDashboard,
  hasHours,
  hoursRows,
  noticeLabel,
  openCopy,
  tomorrowIst,
} from "@/lib/shop";
import { Shop } from "@/lib/shop";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { useRef, useState } from "react";
import { Alert, ScrollView, Switch, TouchableOpacity, View } from "react-native";
import { CalendarIcon, ComputerDesktopIcon } from "react-native-heroicons/outline";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

/** One line of the settings card: a label (and a second line), then what goes on the right. */
function SettingsRow({
  label,
  sub,
  right,
  onPress,
  first,
  accessibilityLabel,
}: {
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  first?: boolean;
  accessibilityLabel?: string;
}) {
  const { color } = useTheme();
  const content = (
    <>
      <View style={{ flex: 1 }}>
        <Text fontSize="text-md" fontWeight="font-bold">
          {label}
        </Text>
        {sub ? (
          <Text fontSize="text-sm" tone="body">
            {sub}
          </Text>
        ) : null}
      </View>
      {right}
    </>
  );
  const style = {
    minHeight: 62,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderTopWidth: first ? 0 : 1,
    borderTopColor: color.line,
  } as const;
  return onPress ? (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (sub ? `${label}. ${sub}` : label)}
      activeOpacity={0.7}
      onPress={onPress}
      style={style}
    >
      {content}
    </TouchableOpacity>
  ) : (
    <View style={style}>{content}</View>
  );
}

/**
 * SH-13, the owner's rental settings: the Open switch, handover hours, Closed
 * until, shortest notice, delivery and signed-in devices. The page an individual
 * owner has instead of the dashboard (a merchant has both).
 *
 * Every change saves as it is made; hours and delivery have their own screens
 * because they take several fields.
 */
export default function RentalSettingsScreen() {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { userDetails, userDetailsFailed, fetchUserDetails } = useGlobalContext();
  const query = useShop();
  const devices = useDevices();
  const ringPerm = useRingPermission();
  const shop = query.data;
  const shopKey = shopQueryKey(userDetails?.username);

  const noticeSheet = useRef<BottomSheetModal>(null);
  const devicesSheet = useRef<BottomSheetModal>(null);
  const [pickingDay, setPickingDay] = useState(false);
  const [openBusy, setOpenBusy] = useState(false);
  const [signingOut, setSigningOut] = useState<number | null>(null);

  const putShop = (next: Shop) => queryClient.setQueryData(shopKey, next);

  /** One PATCH, its answer into the cache, and the server's own words if it refuses. */
  const save = async (patch: ShopPatch): Promise<boolean> => {
    try {
      putShop(await patchShop(patch));
      return true;
    } catch (error) {
      const failure = apiError(error);
      const field = Object.values(fieldErrors(failure))[0];
      toast.error("We couldn't save that", {
        message: field ?? failure?.message ?? "Check your connection and try again.",
      });
      return false;
    }
  };

  const changeOpen = async (state: "open" | "closed" | "auto") => {
    if (!shop || openBusy) return;
    setOpenBusy(true);
    try {
      const open = await setOpenState(state);
      putShop({ ...shop, open });
      // `missing` and `can_take_bookings` move with it; the page reads them fresh.
      void queryClient.invalidateQueries(shopKey);
    } catch (error) {
      const failure = apiError(error);
      if (failure?.code === "cannot_open") {
        toast.warning(cannotOpenMessage(failure.details?.reason, shop.closed_until));
      } else {
        toast.error("We couldn't change that", {
          message: failure?.message ?? "Check your connection and try again.",
        });
      }
    } finally {
      setOpenBusy(false);
    }
  };

  const confirmSignOut = (device: Device) => {
    const ask = deviceSignOutQuestion(device.name);
    Alert.alert(ask.title, ask.message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(device.id);
          try {
            await signOutDevice(device.id);
            await queryClient.invalidateQueries(devicesQueryKey(userDetails?.username));
          } catch {
            toast.error("We couldn't sign that device out", {
              message: "Check your connection and try again.",
            });
          } finally {
            setSigningOut(null);
          }
        },
      },
    ]);
  };

  const header = <SubpageHeader title="Settings" />;

  // The query cannot start without the profile's username; if the profile failed
  // nothing retries it, which is an error and not a long wait.
  const profileFailed = query.isIdle && userDetailsFailed;

  if ((query.isLoading || query.isIdle) && !profileFailed) {
    return (
      <NonScrollableContainer>
        {header}
        <ShopLoading label="Loading your settings" />
      </NonScrollableContainer>
    );
  }

  if (!shop) {
    return (
      <NonScrollableContainer>
        {header}
        <ShopLoadError
          error={query.error}
          onRetry={() => void (profileFailed ? fetchUserDetails() : query.refetch())}
        />
      </NonScrollableContainer>
    );
  }

  const card = {
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.card,
    backgroundColor: color.surface,
  } as const;

  const copy = openCopy(shop.open, shop.closed_until);
  const rows = hoursRows(shop.hours);
  const hoursSet = hasHours(shop.hours);
  const closedUntil = dayLabel(shop.closed_until);
  const deviceCount = devices.data?.length;

  return (
    <NonScrollableContainer>
      {header}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.md,
          paddingBottom: insets.bottom + space.xl,
          gap: space.md,
        }}
      >
        <Text role="screenTitle" accessibilityRole="header">
          Your rental settings
        </Text>

        {/* The Open switch. The brand tint and a brand switch, not green, so the
            switch stays legible in dark (the frame's own note). */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.md,
            padding: space.md,
            borderRadius: radius.card,
            borderWidth: 1,
            borderColor: color.brandPanelLine,
            backgroundColor: color.brandPanel,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text fontSize="text-md" fontWeight="font-bold">
              {copy.title}
            </Text>
            {copy.subtitle ? (
              <Text fontSize="text-sm" tone="body">
                {copy.subtitle}
              </Text>
            ) : null}
            {shop.open.reason === "manual" ? (
              <Text
                fontSize="text-sm"
                fontWeight="font-bold"
                tone="brand"
                accessibilityRole="button"
                onPress={() => void changeOpen("auto")}
                style={{ marginTop: 2 }}
              >
                Follow my hours again
              </Text>
            ) : null}
          </View>
          <Switch
            accessibilityLabel="Open"
            value={shop.open.is_open}
            disabled={openBusy}
            onValueChange={(next) => void changeOpen(next ? "open" : "closed")}
            trackColor={{ true: color.brand, false: color.inputLine }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* The Open switch above only means something if this phone can ring. */}
        <RingPermissionCard enabled={shop.can_take_bookings === true} permission={ringPerm} />

        <View style={[card, { padding: space.md, gap: space.sm }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text fontSize="text-md" fontWeight="font-bold">
              Handover hours
            </Text>
            <Text
              fontSize="text-sm"
              fontWeight="font-bold"
              tone="brand"
              accessibilityRole="button"
              accessibilityLabel={hoursSet ? "Edit handover hours" : "Set handover hours"}
              onPress={() => navigation.navigate("RentalHours")}
              // The label is small; the padding makes a 44pt target of it.
              style={{ paddingVertical: space.sm, paddingLeft: space.md }}
            >
              {hoursSet ? "Edit" : "Set hours"}
            </Text>
          </View>
          {hoursSet ? (
            rows.map((row) => (
              <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text fontSize="text-sm" tone="body">
                  {row.label}
                </Text>
                <Text
                  fontSize="text-sm"
                  fontWeight={row.value === "Closed" ? "font-normal" : "font-bold"}
                  tone={row.value === "Closed" ? "body" : "default"}
                >
                  {row.value}
                </Text>
              </View>
            ))
          ) : (
            <Text fontSize="text-sm" tone="body">
              No hours yet. Until you set them, customers can't book your items.
            </Text>
          )}
        </View>

        <View style={card}>
          <SettingsRow
            first
            label="Closed until"
            sub="For holidays"
            accessibilityLabel={
              closedUntil ? `Closed until ${closedUntil}. Change the date.` : "Closed until. Pick a date."
            }
            onPress={() => setPickingDay(true)}
            right={
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.sm,
                  minHeight: 44,
                  paddingHorizontal: space.md,
                  borderRadius: radius.button,
                  borderWidth: 1,
                  borderColor: color.inputLine,
                }}
              >
                <CalendarIcon size={20} color={color.text} />
                <Text fontSize="text-md" tone={closedUntil ? "default" : "body"}>
                  {closedUntil ?? "Pick a date"}
                </Text>
              </View>
            }
          />
          <SettingsRow
            label="Shortest notice"
            onPress={() => noticeSheet.current?.present()}
            right={
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
                <Text fontSize="text-md" tone="body">
                  {noticeLabel(shop.min_notice_hours)}
                </Text>
                <ChevronRightIcon size={20} color={color.text} />
              </View>
            }
          />
          <SettingsRow
            label="Delivery"
            sub={deliverySummary(shop)}
            onPress={() => navigation.navigate("RentalDelivery")}
            right={<ChevronRightIcon size={20} color={color.text} />}
          />
          <SettingsRow
            label="Signed-in devices"
            onPress={() => devicesSheet.current?.present()}
            right={
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
                {deviceCount !== undefined ? (
                  <Text fontSize="text-md" tone="body">
                    {deviceCount}
                  </Text>
                ) : null}
                <ChevronRightIcon size={20} color={color.text} />
              </View>
            }
          />
        </View>

        {/* Only a merchant has the dashboard; an individual owner has this page alone. */}
        {shop.is_merchant ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.sm }}>
            <ComputerDesktopIcon size={18} color={color.textDim} />
            <Text fontSize="text-sm" tone="dim" style={{ flex: 1 }}>
              More settings are on the dashboard on your computer.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <NoticeSheet
        ref={noticeSheet}
        value={shop.min_notice_hours}
        onSelect={async (hours) => {
          noticeSheet.current?.dismiss();
          if (hours !== shop.min_notice_hours) await save({ min_notice_hours: hours });
        }}
      />
      <DevicesSheet
        ref={devicesSheet}
        devices={devices.data}
        failed={devices.isError}
        signingOut={signingOut}
        onSignOut={confirmSignOut}
        onRetry={() => void devices.refetch()}
        dashboard={hasDashboard(shop.is_merchant, userDetails?.merchant_approval_status)}
      />
      {pickingDay ? (
        <DayPickerModal
          value={shop.closed_until}
          minDate={tomorrowIst()}
          onCancel={() => setPickingDay(false)}
          onPick={async (day) => {
            setPickingDay(false);
            await save({ closed_until: day });
          }}
          onClear={
            shop.closed_until
              ? async () => {
                  setPickingDay(false);
                  await save({ closed_until: null });
                }
              : undefined
          }
        />
      ) : null}
    </NonScrollableContainer>
  );
}
