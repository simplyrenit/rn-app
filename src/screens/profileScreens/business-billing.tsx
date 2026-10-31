import { useAddGstin, useBuyerGstin, useRemoveGstin } from "@/backend/business";
import { useProfile } from "@/backend/profile";
import { Button, SubpageHeader, Text, TextField } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { AppSwitch } from "@/components/core/switch";
import { useGlobalContext } from "@/context/global-context";
import { apiError } from "@/lib/api-error";
import { gstinErrorText } from "@/lib/business";
import { SCREEN_GUTTER, density, radius, space } from "@/lib/design-tokens";
import { GSTIN_PATTERN, cleanId } from "@/lib/kyc";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";

const ID_INPUT = {
  autoCapitalize: "characters",
  autoCorrect: false,
  autoComplete: "off",
  textContentType: "none",
  importantForAutofill: "no",
} as const;

/**
 * Profile → Business billing (ENG-352): "Renting for a business" and the one GSTIN bookings are
 * billed to. The GSTIN is checked against the GST register, which fills in the legal name and
 * address; nothing here can edit them. The typed GSTIN lives in this screen's state only.
 */
export default function BusinessBillingScreen() {
  const { color } = useTheme();
  const { userDetails } = useGlobalContext();
  const { updateMyDetails } = useProfile();
  const saved = useBuyerGstin();
  const add = useAddGstin();
  const remove = useRemoveGstin();

  const [on, setOn] = useState(Boolean(userDetails?.bills_to_business));
  const [gstin, setGstin] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [changing, setChanging] = useState(false);
  // One save at a time, so quick taps can't land out of order.
  const [saving, setSaving] = useState(false);

  const toggle = async (value: boolean) => {
    if (!userDetails || saving) return;
    setOn(value);
    setSaving(true);
    try {
      await updateMyDetails(userDetails.username, { bills_to_business: value });
    } catch {
      setOn(!value);
      toast.error("We couldn't save that", { message: "Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  };

  const check = () => {
    if (!GSTIN_PATTERN.test(gstin)) {
      setError(gstinErrorText({ status: 400, code: "validation_error", message: null, details: null }));
      return;
    }
    setError(undefined);
    add.mutate(gstin, {
      onSuccess: () => {
        setOn(true);
        setGstin("");
        setChanging(false);
        toast.success("GSTIN checked and saved");
      },
      onError: (failure) => setError(gstinErrorText(apiError(failure))),
    });
  };

  const confirmRemove = () =>
    Alert.alert("Remove this GSTIN?", "New bookings won't be billed to it. Bookings you've made keep it.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          remove.mutate(undefined, {
            onError: () => toast.error("We couldn't remove it", { message: "Try again." }),
          }),
      },
    ]);

  const row = saved.data;
  // Only once the saved GSTIN is known: `undefined` is still loading (or failed), not "none".
  const showForm = on && (row === null || (Boolean(row) && changing));

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Business billing" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.lg, paddingBottom: space.lg }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: density.fieldGap }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text fontWeight="font-semibold">Renting for a business</Text>
              <Text tone="dim" fontSize="text-sm">
                Get GST invoices with your GSTIN, so your business can claim input tax credit.
              </Text>
            </View>
            <AppSwitch
              value={on}
              disabled={saving}
              onValueChange={(value) => void toggle(value)}
              accessibilityLabel="Renting for a business"
            />
          </View>

          {/* Not loaded (an error, or the query not started because the profile didn't refresh): say so, never blank. */}
          {on && row === undefined && !saved.isFetching ? (
            <Text tone="warning" fontSize="text-sm" style={{ marginBottom: density.fieldGap }}>
              {"We couldn't load your GSTIN. "}
              <Text
                tone="brand"
                fontSize="text-sm"
                fontWeight="font-bold"
                accessibilityRole="button"
                onPress={() => void saved.refetch()}
              >
                Try again
              </Text>
            </Text>
          ) : null}

          {on && row && !changing ? (
            <View
              style={{
                gap: 4,
                padding: space.md,
                marginBottom: density.fieldGap,
                borderRadius: radius.group,
                borderWidth: 1,
                borderColor: color.line,
                backgroundColor: color.surface,
              }}
            >
              <Text tone="dim" fontSize="text-sm">
                Bookings are billed to
              </Text>
              <Text fontWeight="font-semibold">{row.legal_name}</Text>
              <Text>GSTIN {row.gstin}</Text>
              <Text tone="dim" fontSize="text-sm">
                {row.address}
                {row.state ? ` · ${row.state}` : ""}
              </Text>
              <Text tone="dim" fontSize="text-sm" style={{ marginTop: space.sm }}>
                From the GST register. To bill another GSTIN, change it.
              </Text>
              <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.sm }}>
                <Button variant="outline" onPress={() => setChanging(true)}>
                  Change GSTIN
                </Button>
                <Button variant="outline" onPress={confirmRemove} loading={remove.isLoading}>
                  Remove
                </Button>
              </View>
            </View>
          ) : null}

          {showForm ? (
            <>
              <TextField
                label="GSTIN"
                hint="15 characters, like 22ABCDE1234F1Z5"
                required
                value={gstin}
                maxLength={15}
                error={error}
                {...ID_INPUT}
                onChangeText={(text) => {
                  setGstin(cleanId(text, 15));
                  if (error) setError(undefined);
                }}
              />
              <Text tone="dim" fontSize="text-sm" style={{ marginBottom: density.fieldGap }}>
                We check it on the GST register and use the legal name and address registered there.
              </Text>
              <Button onPress={check} loading={add.isLoading} disabled={add.isLoading || gstin.length !== 15}>
                {add.isLoading ? "Checking…" : "Check GSTIN"}
              </Button>
              {changing ? (
                <Button variant="outline" onPress={() => setChanging(false)} style={{ marginTop: space.sm }}>
                  Keep the current GSTIN
                </Button>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </NonScrollableContainer>
  );
}
