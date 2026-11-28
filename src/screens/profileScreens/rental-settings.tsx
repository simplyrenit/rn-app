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
import { ListRow, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { RingPermissionControl, useRingPermission } from "@/backend/ring-permission";
import { DayPickerModal } from "@/components/shop/day-picker-modal";
import { RingPermissionCard } from "@/components/shop/ring-permission-card";
import { DevicesSheet } from "@/components/shop/devices-sheet";
import { NoticeSheet } from "@/components/shop/pick-sheets";
import { ShopLoadError, ShopLoading } from "@/components/shop/states";
import { useGlobalContext } from "@/context/global-context";
import { apiError, fieldErrors } from "@/lib/api-error";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import type { RingPermission } from "@/lib/ring-permission";
import {
  cannotOpenMessage,
  dayLabel,
  deliverySummary,
  deviceSignOutQuestion,
  gstSummary,
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
import { useFocusEffect, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, TouchableOpacity, View } from "react-native";
import { AppSwitch } from "@/components/core/switch";
import { ComputerDesktopIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

/**
 * Dev builds only (design fixtures, section 12): the state a frame shows that no API answer sets. Only initial local
 * state: an open sheet, the day picker, this phone's ring permission, the scroll at its end. Nothing here saves anything.
 */
type RentalSettingsDesign = {
  sheet?: "notice" | "devices";
  dayPicker?: boolean;
  ringPermission?: RingPermission;
  /** The full-scroll frame (2096:26244): the rows below the fold. */
  scrollToEnd?: boolean;
};

const noop = async () => undefined;

/**
 * SH-13, the owner's rental settings: the Open switch, handover hours, Closed
 * until, shortest notice, delivery, GST and signed-in devices. The page an individual
 * owner has instead of the dashboard (a merchant has both).
 *
 * Every change saves as it is made; hours, delivery and GST have their own screens
 * because they take several fields.
 */
export default function RentalSettingsScreen() {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { userDetails, userDetailsFailed, fetchUserDetails } = useGlobalContext();
  const route = useRoute();
  const design = __DEV__ ? (route.params as { design?: RentalSettingsDesign } | undefined)?.design : undefined;
  if (design) {
    // Dev builds only: a fixture's 404 shows the frame's error state (2096:26620, 2096:29658) at once, not after
    // React Query's three retries. The keys carry the fixture user's name, so the device's own account keeps them.
    queryClient.setQueryDefaults(shopQueryKey(userDetails?.username), { retry: false });
    queryClient.setQueryDefaults(devicesQueryKey(userDetails?.username), { retry: false });
  }
  const query = useShop();
  const devices = useDevices();
  // Under a design fixture the ring permission is the fixture's and nothing asks the system: the whole control is
  // replaced (ENG-433's today.tsx seed), so the card's ask-once effect cannot raise the OS prompt over a screenshot.
  const realPerm = useRingPermission();
  const designPerm = design?.ringPermission ?? "unavailable";
  const seededPerm = useMemo<RingPermissionControl>(
    () => ({ ...realPerm, state: designPerm, ask: noop, askOnce: noop, openSettings: () => undefined }),
    // `realPerm` is spread for its shape only; the seeded control must stay the same object for `askOnce`'s effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [designPerm]
  );
  const ringPerm = design ? seededPerm : realPerm;
  const shop = query.data;
  const shopKey = shopQueryKey(userDetails?.username);

  const noticeSheet = useRef<BottomSheetModal>(null);
  const devicesSheet = useRef<BottomSheetModal>(null);
  const scroll = useRef<ScrollView>(null);
  const [pickingDay, setPickingDay] = useState(design?.dayPicker === true);
  const [openBusy, setOpenBusy] = useState(false);
  const [signingOut, setSigningOut] = useState<number | null>(null);

  // A seeded sheet opens once the page is there (gorhom ignores a present() before its modal has mounted).
  const loaded = Boolean(shop);
  useEffect(() => {
    if (!design?.sheet || !loaded) return;
    const sheet = design.sheet === "notice" ? noticeSheet : devicesSheet;
    // Only while in front: React Query refetches for the next fixture re-run this effect on the covered screen too.
    const timer = setTimeout(() => navigation.isFocused() && sheet.current?.present(), 300);
    return () => clearTimeout(timer);
  }, [design?.sheet, loaded]);

  // The next fixture is pushed over this screen, so what a seed opened closes when it loses focus.
  useFocusEffect(
    useCallback(() => {
      if (!design) return undefined;
      return () => {
        noticeSheet.current?.dismiss();
        devicesSheet.current?.dismiss();
        setPickingDay(false);
      };
    }, [design])
  );

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

  const copy = openCopy(shop.open, shop.closed_until);
  const rows = hoursRows(shop.hours);
  const hoursSet = hasHours(shop.hours);
  const closedUntil = dayLabel(shop.closed_until);
  const deviceCount = devices.data?.length;
  const delivery = deliverySummary(shop);
  const gst = gstSummary(shop);
  const shopAddress = shop.address_confirmed ? shop.locality || shop.address : "Not set yet";

  return (
    <NonScrollableContainer>
      {header}
      {/* 2096:26244: Content p16/0/32/0, gap 16. Each block pads itself 24; the settings rows run edge to edge. */}
      <ScrollView
        ref={scroll}
        showsVerticalScrollIndicator={false}
        // On every content or viewport size change, not only the first: a later row (an error line) or a shorter
        // viewport would otherwise leave the seeded scroll short of the end.
        onContentSizeChange={() => design?.scrollToEnd && scroll.current?.scrollToEnd({ animated: false })}
        onLayout={() => design?.scrollToEnd && scroll.current?.scrollToEnd({ animated: false })}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 32, gap: 16 }}
      >
        <Text role="screenTitle" accessibilityRole="header" style={{ marginHorizontal: SCREEN_GUTTER }}>
          Your rental settings
        </Text>

        {/* The Open switch: no card of its own (REVIEW b3-02), 12 above and below, 16 to the switch. The ring card
            sits 16 under it in the same block, and draws nothing once this phone can ring. */}
        <View style={{ paddingHorizontal: SCREEN_GUTTER, gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text fontSize="text-md" fontWeight="font-semibold">
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
                  fontWeight="font-semibold"
                  tone="brand"
                  accessibilityRole="button"
                  onPress={() => void changeOpen("auto")}
                >
                  Follow my hours again
                </Text>
              ) : null}
            </View>
            <AppSwitch
              accessibilityLabel="Open"
              value={shop.open.is_open}
              disabled={openBusy}
              onValueChange={(next) => void changeOpen(next ? "open" : "closed")}
              // The frame's off track is the light grey of a hairline; iOS fills it from ios_backgroundColor.
              trackColor={{ true: color.brand, false: color.line }}
              ios_backgroundColor={color.line}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* The Open switch above only means something if this phone can ring. 2096:26472 draws the inline card. */}
          <RingPermissionCard enabled={shop.can_take_bookings === true} permission={ringPerm} layout="inline" />
        </View>

        {/* Handover hours: a 1pt hairline card, r12, 16 inside, 8 between its lines. */}
        <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
          <View style={{ borderWidth: 1, borderColor: color.line, borderRadius: 12, padding: 16, gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text fontSize="text-md" fontWeight="font-semibold">
                Handover hours
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={hoursSet ? "Edit handover hours" : "Set handover hours"}
                activeOpacity={0.7}
                onPress={() => navigation.navigate("RentalHours")}
                // The label is 20 high; the slop makes a 44pt target of it without growing the row.
                hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
              >
                <Text fontSize="text-sm" fontWeight="font-semibold" tone="brand">
                  {hoursSet ? "Edit" : "Set hours"}
                </Text>
              </TouchableOpacity>
            </View>
            {hoursSet ? (
              rows.map((row) => (
                <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text fontSize="text-sm" tone="body">
                    {row.label}
                  </Text>
                  <Text
                    fontSize="text-sm"
                    fontWeight={row.value === "Closed" ? "font-normal" : "font-semibold"}
                    tone={row.value === "Closed" ? "dim" : "default"}
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
        </View>

        {/* Kit List rows, full width with no leading icon, under one hairline and none between them. */}
        <View style={{ borderTopWidth: 1, borderTopColor: color.line }}>
          <ListRow
            label="Closed until"
            subLabel="For holidays"
            value={closedUntil ?? "Pick a date"}
            accessibilityLabel={
              closedUntil ? `Closed until ${closedUntil}. Change the date.` : "Closed until. Pick a date."
            }
            onPress={() => setPickingDay(true)}
          />
          <ListRow
            label="Shortest notice"
            value={noticeLabel(shop.min_notice_hours)}
            onPress={() => noticeSheet.current?.present()}
          />
          <ListRow
            label="Delivery"
            subLabel={delivery}
            accessibilityLabel={`Delivery. ${delivery}`}
            onPress={() => navigation.navigate("RentalDelivery")}
          />
          <ListRow
            label="GST"
            subLabel={gst}
            accessibilityLabel={`GST. ${gst}`}
            onPress={() => navigation.navigate("RentalGst")}
          />
          {shop.is_merchant ? (
            <ListRow
              label="Shop address"
              subLabel={shopAddress}
              accessibilityLabel={`Shop address. ${shopAddress}`}
              onPress={() => navigation.navigate("ShopAddress")}
            />
          ) : null}
          <ListRow
            label="Signed-in devices"
            value={deviceCount ? String(deviceCount) : undefined}
            onPress={() => devicesSheet.current?.present()}
          />
        </View>

        {/* Only a merchant has the dashboard; an individual owner has this page alone. Icon 18 at x24, text at x50. */}
        {shop.is_merchant ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: SCREEN_GUTTER }}>
            <ComputerDesktopIcon size={18} color={color.textDim} strokeWidth={1.5} />
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
