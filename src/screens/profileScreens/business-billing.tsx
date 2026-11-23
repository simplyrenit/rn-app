import { useAddGstin, useBuyerGstin, useRemoveGstin } from "@/backend/business";
import { useProfile } from "@/backend/profile";
import { BottomBar, Button, SubpageHeader, Text, TextField } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { AppSwitch } from "@/components/core/switch";
import { useGlobalContext } from "@/context/global-context";
import { apiError } from "@/lib/api-error";
import { gstinErrorText } from "@/lib/business";
import { SCREEN_GUTTER, density } from "@/lib/design-tokens";
import { GSTIN_PATTERN, cleanId } from "@/lib/kyc";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from "react-native";

const ID_INPUT = {
  autoCapitalize: "characters",
  autoCorrect: false,
  autoComplete: "off",
  textContentType: "none",
  importantForAutofill: "no",
} as const;

// 2097:29036 / 29097 Body: 24 padding, 20 between blocks.
const BLOCK_GAP = 20;

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
          contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 24, paddingBottom: 24 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: BLOCK_GAP }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text fontSize="text-md" fontWeight="font-semibold">
                Renting for a business
              </Text>
              <Text tone="body" fontSize="text-sm">
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
          {on && row === undefined && !saved.isFetching && !saving ? (
            <Text tone="warning" fontSize="text-sm" style={{ marginBottom: BLOCK_GAP }}>
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
                padding: 16,
                marginBottom: BLOCK_GAP,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: color.line,
                backgroundColor: color.surface,
              }}
            >
              <Text tone="dim" fontSize="text-sm">
                Bookings are billed to
              </Text>
              <Text fontSize="text-md" fontWeight="font-semibold">
                {row.legal_name}
              </Text>
              <Text fontSize="text-sm">GSTIN {row.gstin}</Text>
              <Text tone="body" fontSize="text-sm">
                {/* The address already names its state (the server adds it when the register's line doesn't). */}
                {row.address}
              </Text>
              <Text tone="dim" fontSize="text-xs" style={{ marginTop: 8 }}>
                From the GST register. To bill another GSTIN, change it.
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 12 }}>
                <Button variant="outline" tone="tonal" size="compact" onPress={() => setChanging(true)}>
                  Change GSTIN
                </Button>
                {/* Plain danger text in a 72×44 tap box, as 2097:29036 draws it; same Alert as before. */}
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ disabled: remove.isLoading, busy: remove.isLoading }}
                  disabled={remove.isLoading}
                  onPress={confirmRemove}
                  style={{ minHeight: 44, paddingVertical: 12, paddingHorizontal: 8, justifyContent: "center" }}
                >
                  <Text
                    fontSize="text-sm"
                    fontWeight="font-semibold"
                    style={{ color: remove.isLoading ? color.textDim : color.dangerStrong }}
                  >
                    Remove
                  </Text>
                </TouchableOpacity>
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
              {/* The field keeps the kit's own 18 below it; the frame's gap is 20. */}
              <Text tone="body" fontSize="text-sm" style={{ marginTop: BLOCK_GAP - density.fieldGap }}>
                We check it on the GST register and use the legal name and address registered there.
              </Text>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Check GSTIN is sticky, as 2097:29097 draws it, outside the KeyboardAvoidingView: NonScrollableContainer already lifts it over the iOS keyboard; while changing, "Keep the current GSTIN" is the link under it. */}
      {showForm ? (
        <BottomBar
          layout="cta-text"
          primary={{
            label: add.isLoading ? "Checking…" : "Check GSTIN",
            onPress: check,
            loading: add.isLoading,
            disabled: add.isLoading || gstin.length !== 15,
          }}
          secondary={changing ? { label: "Keep the current GSTIN", onPress: () => setChanging(false) } : undefined}
        />
      ) : null}
    </NonScrollableContainer>
  );
}
