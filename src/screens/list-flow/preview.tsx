import { buildCreatePayload, submitListing } from "@/backend/list-flow/submit";
import { saveOfferedAddress } from "@/backend/addresses-api";
import { placeFor } from "@/backend/list-flow/pickup-location";
import { termsQueryKey } from "@/backend/terms";
import { BottomBar, SectionHeader, StepProgress, Text } from "@/components/core";
import { ConditionRenderer } from "@/components/core/condition-renderer";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { CONDITION_LABEL } from "@/components/list-flow/copy";
import { FlowHeader } from "@/components/list-flow/flow-header";
import { ProductImage } from "@/components/product/product-image";
import { ProductMap } from "@/components/product/product-map";
import { SpecStrip } from "@/components/product/spec-strip";
import { useGlobalContext } from "@/context/global-context";
import { useListDraft } from "@/context/list-draft-context";
import { inlineOfferPayload } from "@/lib/addresses";
import { apiError } from "@/lib/api-error";
import { CategoryIcon, categoryDisplayName } from "@/lib/category-icons";
import { SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { formatCurrency } from "@/lib/format";
import { smallestPlan, toPlans } from "@/lib/plans";
import { commitFeedback, successFeedback } from "@/lib/haptics";
import { uploadedPhotos } from "@/lib/list-flow/draft";
import { lockedItems, needsOwnerTerms, publishLockedMessage } from "@/lib/list-flow/publish-locked";
import { currentSpecs, specDisplayValue } from "@/lib/list-flow/specs";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import type { ListFlowDesign } from "@/dev/list-flow-seed";
import { useRoute } from "@react-navigation/native";
import axios from "axios";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { readReasons } from "@/lib/listing-edit";
import { waitsText } from "@/lib/listing-status";
import { Alert, ScrollView, View } from "react-native";
import { useQueryClient } from "react-query";
import { BanknotesIcon } from "react-native-heroicons/outline";

// Dev builds only: a design fixture's draft in place of the live one (ENG-435 plan §2a).
const seed: typeof import("@/dev/list-flow-seed") | null = __DEV__ ? require("@/dev/list-flow-seed") : null;

type SubmitState = "idle" | "submitting" | "done";

/** The renter-facing sections below the strip (2096:29125): 32 above and below, on the gutter, 12 under a header. */
const SECTION_PAD = 32;
const HEADER_GAP = 12;

/** A 1pt full-width rule between the listing's parts. */
function Divider() {
  const { color } = useTheme();
  return <View style={{ height: 1, backgroundColor: color.line }} />;
}

/** One owner-only row (2096:29125): 8 above and below, a SemiBold label, the value right-aligned, a hairline above. */
function DefaultRow({ label, value }: { label: string; value: string }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 16,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: color.brandPanelLine,
      }}
    >
      <Text fontSize="text-sm" lineHeight={20} fontWeight="font-semibold">
        {label}
      </Text>
      <Text fontSize="text-sm" lineHeight={20} tone="body" style={{ flex: 1, textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}

/** A renter-facing spec row: the 112 label column 16 from the value (2096:29125). */
function SpecRow({ label, value, first }: { label: string; value: string; first: boolean }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: color.line,
      }}
    >
      <Text fontSize="text-sm" lineHeight={20} tone="dim" style={{ width: 112 }}>
        {label}
      </Text>
      <Text fontSize="text-sm" lineHeight={20} fontWeight="font-semibold" style={{ flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}

/**
 * L-16 Preview & submit, IMPLEMENTATION.md §8.6: the listing as a renter will
 * see it, then the owner-only part, then "Submit for review" in place.
 */
export default function ListPreviewScreen() {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProps<"ListPreview">>();
  // Only DevFixture passes `design`: the frame's draft, and Submit does nothing (plan §0.3).
  const design = __DEV__ ? (route.params as { design?: ListFlowDesign } | undefined)?.design : undefined;
  const { color, isDark } = useTheme();
  const { userDetails } = useGlobalContext();
  const real = useListDraft();
  const seeded = useMemo(() => (design && seed ? seed.seededFlow(design) : null), [design]);
  const flow = seeded ?? real;
  const { draft } = flow;
  const queryClient = useQueryClient();
  const [state, setState] = useState<SubmitState>("idle");
  const mounted = useRef(true);
  /**
   * True from the tap until the create call settles. Leaving mid-request is
   * how a listing gets created twice: the first request still lands, and the
   * owner, back on Review with the draft intact, submits it again.
   */
  const submitting = useRef(false);

  useEffect(() => {
    flow.track("preview_opened");
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Blocks Back, the Android back button (nav.tsx routes it through goBack)
  // and any other removal while the create call is in flight.
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (submitting.current) event.preventDefault();
      }),
    [navigation]
  );

  // The iOS edge swipe is not interceptable by `beforeRemove` on the native
  // stack, so it is switched off for the same window.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: state === "idle" });
  }, [navigation, state]);

  if (!draft) return <NonScrollableContainer>{null}</NonScrollableContainer>;
  const f = draft.fields;
  const firstPlan = smallestPlan(toPlans(f.plans.value) ?? []);
  const images = uploadedPhotos(draft).map((p) => p.remoteUrl as string);
  const coverPhoto = draft.photos[draft.coverIndex];
  const cover = coverPhoto?.remoteUrl ?? images[0] ?? null;
  const location = f.location.value;
  const deposit = f.security_deposit.value;
  // What a renter will see: the specs with a value, however they got it.
  const specs = currentSpecs(draft).flatMap((spec) => {
    const value = specDisplayValue(spec.value);
    return value ? [{ key: spec.key, label: spec.label, value }] : [];
  });

  const onSubmit = async () => {
    if (design || state !== "idle" || submitting.current) return;
    submitting.current = true;
    commitFeedback();
    setState("submitting");
    const payload = buildCreatePayload(draft, {
      name: userDetails?.name?.trim() ?? "",
      phone: userDetails?.phone ?? "",
    });
    try {
      const response = await submitListing(payload);
      // The answer is the listing as its owner sees it: its status, and the reasons if the check has already flagged it.
      const posted = response?.data as { status?: string | null; flag_reasons?: unknown; waits_for_text?: unknown } | undefined;
      flow.track("listing_submitted", {
        ms_since_start: Date.now() - draft.startedAt,
        photos: payload.images.length,
      });
      successFeedback();

      // ENG-25 §8.8: the "Save this address" offer from Review. Built here,
      // from this render's draft, because `finish` below clears it. Not
      // awaited and never thrown: the listing is already live, and a failed
      // address save must not hold up or fail the flow (D8).
      // No flat line, no address: Profile's form will not save one either.
      if (draft.saveAddressAs && location?.fullAddress.trim()) {
        const saveAs = draft.saveAddressAs;
        // ENG-284 D4: the PIN from the geocoder, as Address details would
        // prefill it. The offer's `address` is only the locality, so the
        // server has no text to read one from.
        void placeFor(location.lat, location.long)
          .then((place) =>
            saveOfferedAddress(
              queryClient,
              userDetails?.username,
              inlineOfferPayload(location, saveAs, place.postalCode)
            )
          )
          .catch(() => {
            flow.track("address_save_failed");
            toast.warning("Your listing is live. We couldn't save the address.");
          });
      }

      // The listing exists now, so the draft goes whatever happens to this
      // screen — the context outlives it. The stack is reset so Back from
      // Submitted cannot walk into a flow whose draft is gone.
      const finish = () => {
        flow.clearSubmitted();
        submitting.current = false;
        navigation.reset({
          index: 1,
          routes: [
            { name: "MainTabs" },
            {
              name: "ListSubmitted",
              params: {
                productName: payload.title,
                coverUrl: payload.cover_image,
                status: posted?.status ?? null,
                reasons: readReasons(posted?.flag_reasons),
                waitsText: waitsText(posted?.waits_for_text),
              },
            },
          ],
        });
      };
      if (!mounted.current) {
        finish();
        return;
      }
      setState("done");
      // Let the check land before leaving.
      setTimeout(finish, 500);
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status ?? 0 : 0;
      const serverMessage = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string; detail?: string } | undefined)?.error ??
          (error.response?.data as { detail?: string } | undefined)?.detail
        : undefined;
      flow.track("listing_submit_failed", { status });
      submitting.current = false;
      if (mounted.current) setState("idle");
      // The owner terms moved on, or were never accepted (ENG-122). An individual
      // is told `owner_terms_required`; a merchant `publish_locked`, which lists
      // everything in the way. Either way the tick is on the first step of the
      // flow and the draft stays as it is.
      const failure = apiError(error);
      const locked = failure?.code === "publish_locked" ? lockedItems(failure.details) : [];
      if (failure?.code === "owner_terms_required" || needsOwnerTerms(locked)) {
        void queryClient.invalidateQueries(termsQueryKey(userDetails?.username));
        toast.warning("Accept the owner terms to submit", {
          message: "The tick is on the first step. Your listing is saved.",
        });
        navigation.navigate("ListAddPhotos", { termsNeeded: true });
        return;
      }
      // A merchant who may not publish yet for another reason: say which.
      if (failure?.code === "publish_locked") {
        // The address is the one thing the owner fixes on its own screen: a toast
        // is gone in seconds and has no button.
        if (locked.includes("shop_address")) {
          Alert.alert("You can't publish yet", publishLockedMessage(locked), [
            { text: "Not now", style: "cancel" },
            { text: "Set shop address", onPress: () => navigation.navigate("ShopAddress") },
          ]);
          return;
        }
        toast.warning("You can't publish yet", { message: publishLockedMessage(locked) });
        return;
      }
      // The draft is untouched, so the owner can simply try again.
      toast.error("We couldn't submit your listing", {
        message: typeof serverMessage === "string" ? serverMessage : "Check your connection and try again.",
      });
    }
  };

  return (
    <NonScrollableContainer>
      <FlowHeader showBack={state === "idle"} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* The kit Stepper in its own 28pt strip over the photo (2097:30938). */}
        <View style={{ paddingTop: 8, paddingBottom: 16, paddingHorizontal: SCREEN_GUTTER }}>
          <StepProgress step={4} total={4} showLabel={false} />
        </View>

        <View style={{ width: "100%", aspectRatio: 1 }}>
          <ProductImage images={images} coverImage={cover} mode="post" showBack={false} />
        </View>

        <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: 16 }}>
          <Text role="screenTitle">{f.title.value}</Text>
        </View>

        <Divider />
        {/* The PDP sample's strip (2097:30938 "Spec strip (cloned from PDP sample)"): 131 high, ruled by the Dividers around it. */}
        <SpecStrip
          variant="detail"
          dividers={false}
          items={[
            {
              icon: <CategoryIcon name={f.category.value?.parent ?? ""} size={20} color={color.text} />,
              value: f.category.value ? categoryDisplayName(f.category.value.title) : null,
              label: "Category",
            },
            {
              icon: <BanknotesIcon size={20} color={color.text} />,
              value: deposit ? formatCurrency(deposit) : null,
              label: "Deposit",
            },
            {
              icon: f.condition.value ? (
                <ConditionRenderer condition={f.condition.value} size={20} color={color.text} />
              ) : null,
              value: f.condition.value ? CONDITION_LABEL[f.condition.value] : null,
              label: "Condition",
            },
          ]}
        />
        <Divider />

        {f.description.value ? (
          <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 24 }}>
            <Text tone="body" fontSize="text-sm" lineHeight={20}>
              {f.description.value}
            </Text>
          </View>
        ) : null}

        {specs.length > 0 ? (
          <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: SECTION_PAD, gap: HEADER_GAP }}>
            <SectionHeader title="Specs" gutter={false} flush />
            <View style={{ borderWidth: 1, borderColor: color.line, borderRadius: radius.button, overflow: "hidden" }}>
              {specs.map((spec, i) => (
                <SpecRow key={spec.key} label={spec.label} value={spec.value} first={i === 0} />
              ))}
            </View>
          </View>
        ) : null}

        {location ? (
          <>
            <Divider />
            <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: SECTION_PAD, gap: HEADER_GAP }}>
              <SectionHeader title={`Pickup · ${location.locality}`} gutter={false} flush />
              <ProductMap
                variant="detail"
                latitude={location.lat}
                longitude={location.long}
                isDarkMode={isDark}
                placeName={location.locality}
                // A design seed draws the frame's neutral map, not live tiles (2096:29125 "NEW neutral map").
                placeholder={Boolean(design)}
              />
              <Text fontSize="text-sm" lineHeight={20} tone="body">
                Approximate area · the exact address is shared once a booking is confirmed
              </Text>
            </View>
          </>
        ) : null}

        <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: SECTION_PAD, paddingBottom: 24 }}>
          <View
            style={{
              padding: 16,
              borderRadius: radius.button,
              backgroundColor: color.brandPanel,
              borderWidth: 1,
              borderColor: color.brandPanelLine,
            }}
          >
            <Text fontSize="text-sm" lineHeight={20} fontWeight="font-semibold" tone="brand">
              Only you see this part
            </Text>
            {/* Worth, stock and delivery are the owner's own figures: typed, or confirmed
                before Preview unlocked. They are not under the AI heading, which would
                say where a confirmed figure came from. */}
            <Text fontSize="text-md" lineHeight={24} fontWeight="font-bold" style={{ marginTop: 4, marginBottom: 8 }}>
              Confirmed by you
            </Text>
            <DefaultRow label="Worth" value={f.worth.value ? formatCurrency(f.worth.value) : "—"} />
            <DefaultRow label="In stock" value={f.quantity.value ?? "1"} />
            {draft.notDelivered ? <DefaultRow label="Delivery" value="Not delivered · pickup only" /> : null}
            <Text fontSize="text-md" lineHeight={24} fontWeight="font-bold" style={{ marginTop: 12, marginBottom: 8 }}>
              Filled by AI · checked by you
            </Text>
            <DefaultRow label="Deposit" value={deposit ? formatCurrency(deposit) : "—"} />
            <DefaultRow label="Availability" value="Available now · block dates after you submit" />
            <DefaultRow label="Contact" value="You · from your profile" />
          </View>
        </View>
      </ScrollView>

      {/* The kit Bottom bar, Summary + CTA (2096:29125). The button spins while the call is out; the old
          check-mark beat before leaving has no place in the kit button (plan §5a #4). */}
      <BottomBar
        layout="summary-cta"
        value={formatCurrency(firstPlan?.price ?? 0)}
        unit={`/${firstPlan?.unit ?? "day"} to you`}
        primary={{
          label: "Submit for review",
          onPress: () => void onSubmit(),
          loading: state !== "idle",
          accessibilityLabel: "Submit for review",
          // onSubmit gives the heavy commit buzz; no light tap before it.
          haptic: false,
        }}
      />
    </NonScrollableContainer>
  );
}
