import { fetchDeliveryExample, patchShop, shopQueryKey, useShop } from "@/backend/shop";
import { Button, FieldFrame, SubpageHeader, Text, TextField } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { ShopLoadError, ShopLoading } from "@/components/shop/states";
import { useGlobalContext } from "@/context/global-context";
import { apiError, fieldErrors } from "@/lib/api-error";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import {
  DeliveryForm,
  checkDelivery,
  cleanDecimal,
  deliveryFormFrom,
  deliveryPatch,
  rupees,
} from "@/lib/shop";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { AppSwitch } from "@/components/core/switch";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "react-query";

/** The numbers, once they have stopped changing for a moment: one call per pause, not per key. */
function useSettled<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

/** Distance the worked example is given for: the plan's "8 km away: ₹170". */
const EXAMPLE_KM = 8;

function DeliveryEditor({ initial }: { initial: DeliveryForm }) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { userDetails } = useGlobalContext();

  const [form, setForm] = useState<DeliveryForm>(initial);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const errors = checkDelivery(form);
  const valid = Object.keys(errors).length === 0;

  const setField = (field: "base" | "perKm" | "maxKm", value: string, places: number) => {
    setForm((current) => ({ ...current, [field]: cleanDecimal(value, places) }));
    setServerErrors({});
    setFormError(null);
  };

  // The worked example comes from the server so its rounding is the quote's.
  const numbers = useSettled({ base: form.base, perKm: form.perKm, maxKm: form.maxKm }, 500);
  const example = useQuery(
    ["delivery-example", numbers.base, numbers.perKm, numbers.maxKm],
    () => fetchDeliveryExample({ ...numbers, km: EXAMPLE_KM }),
    {
      enabled: form.delivers && Object.keys(checkDelivery({ ...form, ...numbers })).length === 0,
      keepPreviousData: true,
      retry: false,
    }
  );

  const save = async () => {
    if (!valid) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const shop = await patchShop(deliveryPatch(form));
      queryClient.setQueryData(shopQueryKey(userDetails?.username), shop);
      toast.success("Your delivery settings are saved");
      navigation.goBack();
    } catch (error) {
      const failure = apiError(error);
      const fields = fieldErrors(failure);
      setServerErrors(fields);
      if (Object.keys(fields).length === 0) {
        setFormError(failure?.message ?? "We couldn't save that. Check your connection and try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const shown = (field: "base" | "perKm" | "maxKm", server: string) =>
    (showErrors ? errors[field] : undefined) ?? serverErrors[server];

  const exampleLine = (() => {
    if (!example.data || !valid) return null;
    const { status, fee, sum } = example.data;
    return status === "ok" && fee
      ? { main: `${EXAMPLE_KM} km away: ${rupees(fee)}`, sub: sum }
      : { main: `${EXAMPLE_KM} km is farther than you deliver`, sub: null };
  })();

  return (
    <FieldFrame>
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={space.md}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.md,
          paddingBottom: insets.bottom + space.xl,
        }}
      >
        <Text role="screenTitle" accessibilityRole="header">
          Delivery
        </Text>
        <Text tone="body" fontSize="text-md" style={{ marginTop: space.sm, marginBottom: space.md }}>
          The fee grows with distance: a starting fee, an amount for each kilometre, and the farthest you will go.
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: space.sm,
            marginBottom: space.md,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: color.line,
          }}
        >
          <Text fontSize="text-md" fontWeight="font-bold">
            We deliver
          </Text>
          <AppSwitch
            accessibilityLabel="We deliver"
            value={form.delivers}
            onValueChange={(delivers) => setForm((current) => ({ ...current, delivers }))}
            trackColor={{ true: color.brand, false: color.inputLine }}
            thumbColor="#FFFFFF"
          />
        </View>

        {form.delivers ? (
          <>
            <TextField
              label="Starting fee (₹)"
              hint="Charged on every delivery"
              required
              keyboardType="decimal-pad"
              value={form.base}
              onChangeText={(v) => setField("base", v, 2)}
              error={shown("base", "delivery_base_fee")}
              placeholder="e.g. 50"
            />
            <TextField
              label="Each kilometre (₹)"
              hint="Added for every kilometre away"
              required
              keyboardType="decimal-pad"
              value={form.perKm}
              onChangeText={(v) => setField("perKm", v, 2)}
              error={shown("perKm", "delivery_per_km")}
              placeholder="e.g. 15"
            />
            <TextField
              label="Farthest you go (km)"
              hint="You won't deliver past this"
              required
              keyboardType="decimal-pad"
              value={form.maxKm}
              onChangeText={(v) => setField("maxKm", v, 1)}
              error={shown("maxKm", "delivery_max_km")}
              placeholder="e.g. 15"
            />

            {exampleLine ? (
              <View
                accessibilityLiveRegion="polite"
                style={{
                  padding: space.md,
                  marginBottom: space.md,
                  borderRadius: radius.group,
                  backgroundColor: color.surfaceRaised,
                  gap: 2,
                }}
              >
                <Text fontSize="text-xs" tone="dim">
                  Example for a customer
                </Text>
                <Text fontSize="text-md" fontWeight="font-bold">
                  {exampleLine.main}
                </Text>
                {exampleLine.sub ? (
                  <Text fontSize="text-sm" tone="body">
                    {exampleLine.sub}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </>
        ) : (
          <Text tone="body" fontSize="text-md" style={{ marginBottom: space.md }}>
            Customers collect from you. Switch this on to offer delivery.
          </Text>
        )}

        {formError ? (
          <Text tone="danger" fontSize="text-sm" accessibilityLiveRegion="polite" style={{ marginBottom: space.md }}>
            {formError}
          </Text>
        ) : null}

        <Button loading={saving} onPress={save}>
          Save delivery
        </Button>
      </KeyboardAwareScrollView>
    </FieldFrame>
  );
}

/** The delivery editor SH-13's "Delivery" row opens. */
export default function RentalDeliveryScreen() {
  const { userDetailsFailed, fetchUserDetails } = useGlobalContext();
  const query = useShop();
  const profileFailed = query.isIdle && userDetailsFailed;

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Delivery" />
      {(query.isLoading || query.isIdle) && !profileFailed ? (
        <ShopLoading label="Loading your delivery settings" />
      ) : query.data ? (
        <DeliveryEditor initial={deliveryFormFrom(query.data)} />
      ) : (
        <ShopLoadError
          error={query.error}
          onRetry={() => void (profileFailed ? fetchUserDetails() : query.refetch())}
        />
      )}
    </NonScrollableContainer>
  );
}
