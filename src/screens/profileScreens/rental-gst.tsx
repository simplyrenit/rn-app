import { patchShop, shopQueryKey, useShop } from "@/backend/shop";
import { Button, SubpageHeader, Text, TextField } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { AppSwitch } from "@/components/core/switch";
import { ShopLoadError, ShopLoading } from "@/components/shop/states";
import { useGlobalContext } from "@/context/global-context";
import { apiError, fieldErrors } from "@/lib/api-error";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { GSTIN_PATTERN, cleanId } from "@/lib/kyc";
import { Shop } from "@/lib/shop";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import React, { useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

const GSTIN_ERROR = "Enter a valid 15-character GSTIN, like 22ABCDE1234F1Z5.";

/** As the KYC form's GSTIN: no autofill or correction may keep a copy of it. */
const ID_INPUT = {
  autoCapitalize: "characters",
  autoCorrect: false,
  autoComplete: "off",
  textContentType: "none",
  importantForAutofill: "no",
} as const;

function GstForm({ shop }: { shop: Shop }) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { userDetails } = useGlobalContext();

  const wasRegistered = Boolean(shop.gst_registered);
  const [registered, setRegistered] = useState(wasRegistered);
  const [gstin, setGstin] = useState(shop.gstin ?? "");
  const [gstinError, setGstinError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const gstinOk = GSTIN_PATTERN.test(gstin);
  const changed = registered !== wasRegistered || (registered && gstin !== (shop.gstin ?? ""));

  const save = async () => {
    if (registered && !gstinOk) {
      setGstinError(GSTIN_ERROR);
      return;
    }
    setSaving(true);
    setServerError(null);
    try {
      // Off clears the GSTIN too: the server keeps no GSTIN it has no use for (D-33).
      const next = await patchShop(registered ? { gst_registered: true, gstin } : { gst_registered: false, gstin: "" });
      queryClient.setQueryData(shopQueryKey(userDetails?.username), next);
      toast.success("Your GST is saved");
      navigation.goBack();
    } catch (error) {
      const failure = apiError(error);
      const fields = fieldErrors(failure);
      if (fields.gstin) setGstinError(fields.gstin);
      else
        setServerError(
          fields.gst_registered ?? failure?.message ?? "We couldn't save your GST. Check your connection and try again."
        );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={space.md}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.md,
          paddingBottom: space.lg,
          gap: space.md,
        }}
      >
        <Text role="screenTitle" accessibilityRole="header">
          GST
        </Text>
        <Text tone="body" fontSize="text-md">
          Your prices include GST. Bookings show the GST part, and you file it.
        </Text>

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
          <Text fontSize="text-md" fontWeight="font-bold" style={{ flex: 1 }}>
            GST registered
          </Text>
          <AppSwitch
            accessibilityLabel="GST registered"
            value={registered}
            disabled={saving}
            onValueChange={(on) => {
              setRegistered(on);
              setGstinError(undefined);
              setServerError(null);
            }}
            trackColor={{ true: color.brand, false: color.inputLine }}
            thumbColor="#FFFFFF"
          />
        </View>

        {registered ? (
          <TextField
            label="GSTIN"
            hint="15 characters, like 22ABCDE1234F1Z5"
            required
            value={gstin}
            maxLength={15}
            error={gstinError}
            editable={!saving}
            {...ID_INPUT}
            onChangeText={(text) => {
              const value = cleanId(text, 15);
              setGstin(value);
              if (gstinError && (gstinError !== GSTIN_ERROR || GSTIN_PATTERN.test(value))) setGstinError(undefined);
            }}
            onBlur={() => {
              if (gstin && !gstinOk) setGstinError(GSTIN_ERROR);
            }}
          />
        ) : null}
      </KeyboardAwareScrollView>

      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.sm,
          paddingBottom: insets.bottom + space.sm,
          gap: space.sm,
        }}
      >
        {serverError ? (
          <Text tone="danger" fontSize="text-sm" style={{ textAlign: "center" }} accessibilityLiveRegion="polite">
            {serverError}
          </Text>
        ) : null}
        {/* A partly typed GSTIN still taps through: `save` says what is wrong with it. */}
        <Button disabled={!changed} loading={saving} onPress={() => void save()}>
          Save GST
        </Button>
      </View>
    </>
  );
}

/** The GST editor SH-13's "GST" row opens (ENG-343): registered or not, and the GSTIN. */
export default function RentalGstScreen() {
  const { userDetailsFailed, fetchUserDetails } = useGlobalContext();
  const query = useShop();
  const profileFailed = query.isIdle && userDetailsFailed;

  return (
    <NonScrollableContainer>
      <SubpageHeader title="GST" />
      {(query.isLoading || query.isIdle) && !profileFailed ? (
        <ShopLoading label="Loading your GST" />
      ) : query.data ? (
        <GstForm shop={query.data} />
      ) : (
        <ShopLoadError
          error={query.error}
          onRetry={() => void (profileFailed ? fetchUserDetails() : query.refetch())}
        />
      )}
    </NonScrollableContainer>
  );
}
