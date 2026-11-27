import { useRingPermission } from "@/backend/ring-permission";
import { useShop } from "@/backend/shop";
import { BottomBar, Text, useReduceMotion } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { KycNudge } from "@/components/kyc/kyc-nudge";
import { FLOW_SPRING } from "@/components/list-flow/motion";
import { ListingStatusPill } from "@/components/product/listing-status";
import { RingPermissionCard } from "@/components/shop/ring-permission-card";
import { useListDraft } from "@/context/list-draft-context";
import { SCREEN_GUTTER, duration, radius } from "@/lib/design-tokens";
import { submittedCopy } from "@/lib/listing-edit";
import type { RingPermission } from "@/lib/ring-permission";
import { useTheme } from "@/lib/theme";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import React, { useEffect, useMemo } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { CheckIcon } from "react-native-heroicons/outline";

const MARK = 72;
const THUMB = 56;
const noop = async () => {};

/**
 * Dev-only design seed (ENG-435), only DevFixture passes it: the notification permission the ring card reads (a
 * simulator always reports `unavailable`), and the KYC nudge shown without its once-per-device flag.
 */
type SubmittedDesign = { ringPermission?: RingPermission; kycNudge?: boolean };

/** L-17 Submitted, IMPLEMENTATION.md §8.6. */
export default function ListSubmittedScreen() {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProps<"ListSubmitted">>();
  const design = __DEV__ ? (route.params as { design?: SubmittedDesign } | undefined)?.design : undefined;
  const { color } = useTheme();
  const reduceMotion = useReduceMotion();
  const flow = useListDraft();
  // A shop that can take bookings and a phone that will not ring is the one failure that costs a booking and a
  // mark: an owner who is not a merchant has no Rentals tab, so the end of the listing flow is where they are told (ENG-209).
  const realRingPerm = useRingPermission();
  // Under a seed the permission is the seed's and every action a no-op, so the card can never raise the system prompt.
  const ringPerm = useMemo(
    () =>
      design
        ? { ...realRingPerm, state: design.ringPermission ?? "unavailable", ask: noop, askOnce: noop, openSettings: () => undefined }
        : realRingPerm,
    [design, realRingPerm]
  );
  const canTake = useShop().data?.can_take_bookings === true;

  const cover = route.params?.coverUrl ?? null;
  // What the post answered: nearly always "checking"; a post that came back flagged, or held because a check could not
  // run, says so in the check's words.
  const copy = submittedCopy(route.params?.status, route.params?.reasons, route.params?.waitsText);

  // §8.6: the draft is cleared on arrival. Preview already cleared it the
  // moment the create call succeeded; this only covers any other way here.
  // Never under a design seed: the draft's storage key is not per account, so this would wipe a real draft.
  useEffect(() => {
    if (design) return;
    if (flow.draft) flow.clearSubmitted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const viewListings = () =>
    navigation.reset({
      index: 1,
      routes: [{ name: "MainTabs", params: { screen: "Profile" } }, { name: "myProducts" }],
    });

  // Not under a seed: an unseeded add-photos would start a fresh draft over the stored (not per-account) one.
  const listAnother = () =>
    design ? undefined : navigation.reset({ index: 1, routes: [{ name: "MainTabs" }, { name: "ListAddPhotos" }] });

  // 2096:29335 / 29395 / 29435 / 31046: from the status bar, 32 down then 24 between the mark, the copy, the listing
  // card and the cards under it; the kit bottom bar with "List another item" and "View my listings".
  return (
    <NonScrollableContainer>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: 32,
          paddingBottom: 24,
          gap: 24,
        }}
      >
        <Animated.View
          entering={
            reduceMotion
              ? FadeIn.duration(duration.fast)
              : ZoomIn.springify().damping(FLOW_SPRING.damping).stiffness(FLOW_SPRING.stiffness)
          }
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: MARK,
            height: MARK,
            borderRadius: radius.full,
            backgroundColor: color.brandPanel,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CheckIcon size={36} color={color.brandText} strokeWidth={2.5} />
        </Animated.View>

        <View style={{ gap: 8 }}>
          <Text role="screenTitle" accessibilityRole="header">
            {copy.title}
          </Text>
          <Text tone="body" fontSize="text-sm">
            {copy.body}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            padding: 16,
            borderRadius: radius.button,
            borderWidth: 1,
            borderColor: color.line,
          }}
        >
          <View style={{ width: THUMB, height: THUMB, borderRadius: 8, overflow: "hidden", backgroundColor: color.skeleton }}>
            {cover ? <Image source={{ uri: cover }} style={{ width: THUMB, height: THUMB }} contentFit="cover" /> : null}
          </View>
          <View style={{ flex: 1, gap: 4, alignItems: "flex-start" }}>
            <Text fontSize="text-md" fontWeight="font-semibold" numberOfLines={2}>
              {route.params?.productName}
            </Text>
            <ListingStatusPill status={copy.status} />
          </View>
        </View>

        {/* Once per account per device, and only for a business account with nothing on file. */}
        <KycNudge design={design?.kycNudge} />
        <RingPermissionCard enabled={canTake} permission={ringPerm} />
      </ScrollView>

      <BottomBar
        layout="secondary-primary"
        secondary={{ label: "List another item", onPress: listAnother }}
        primary={{ label: "View my listings", onPress: viewListings }}
      />
    </NonScrollableContainer>
  );
}
