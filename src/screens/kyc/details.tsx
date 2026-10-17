import { openDigiLocker, useStartKyc } from "@/backend/kyc";
import { Button, EmptyState, FieldError, FieldLabel, SubpageHeader, Text, TextField } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { SegmentedChoice } from "@/components/core/segmented-choice";
import { useGlobalContext } from "@/context/global-context";
import { SCREEN_GUTTER, density, radius, space } from "@/lib/design-tokens";
import { track } from "@/lib/events";
import { errorFeedback } from "@/lib/haptics";
import {
  GSTIN_PATTERN,
  PAN_PATTERN,
  cleanId,
  fieldErrors,
  gstinMatchesPan,
  isBusinessPan,
  kycError,
  retryLimitBody,
} from "@/lib/kyc";
import { KYC_CONSENT_VERSION } from "@/lib/kyc-consent";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PAN_ERROR = "Enter a valid 10-character PAN, like ABCDE1234F.";
const GSTIN_ERROR = "Enter a valid 15-character GSTIN, like 22ABCDE1234F1Z5.";
const ID_INPUT = {
  autoCapitalize: "characters",
  autoCorrect: false,
  autoComplete: "off",
  textContentType: "none",
  importantForAutofill: "no",
} as const;

/** A state that replaces the form: nothing the merchant types here can get past it. */
type Blocked = { title: string; body?: string; support?: boolean } | null;

/**
 * PAN, the GST question and the GSTIN, then the hand-off to DigiLocker.
 *
 * The PAN and GSTIN live in this component's state and nowhere else: not in route params,
 * storage, the query cache, an event or a log line. They are gone when the screen unmounts.
 * The server is the authority on both; the checks here only save a round trip.
 */
export default function KycDetailsScreen() {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProps<"KycDetails">>();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const { userDetails } = useGlobalContext();
  const start = useStartKyc();
  const supersede = route.params?.supersede === true;

  const [pan, setPan] = useState("");
  const [gst, setGst] = useState<"yes" | "no" | null>(null);
  const [gstin, setGstin] = useState("");
  const [panError, setPanError] = useState<string | undefined>();
  const [gstError, setGstError] = useState<string | undefined>();
  const [gstinError, setGstinError] = useState<string | undefined>();
  const [banner, setBanner] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<Blocked>(null);
  // Stays true from the request until the browser has been opened, so a second tap does nothing.
  const [busy, setBusy] = useState(false);
  const panInput = useRef<TextInput>(null);
  const gstinInput = useRef<TextInput>(null);

  const panOk = PAN_PATTERN.test(pan);
  const gstinOk = GSTIN_PATTERN.test(gstin);
  const ready = panOk && gst !== null && (gst === "no" || gstinOk);

  const toStatus = (justReturned = false) =>
    // Back from the status screen lands on Profile, never on a form that held a PAN.
    navigation.reset({
      index: 1,
      routes: [
        { name: "MainTabs", params: { screen: "Profile" } },
        { name: "KycStatus", params: justReturned ? { justReturned: true } : undefined },
      ],
    });

  const submit = async () => {
    setBanner(null);
    const panBad = !panOk;
    const gstBad = gst === null;
    const gstinBad = gst === "yes" && !gstinOk;
    setPanError(panBad ? PAN_ERROR : undefined);
    setGstError(gstBad ? "Choose Yes or No." : undefined);
    setGstinError(gstinBad ? GSTIN_ERROR : undefined);
    if (panBad || gstBad || gstinBad || busy) return;

    setBusy(true);
    try {
      const status = await start({
        pan,
        gst_declared: gst === "yes",
        ...(gst === "yes" ? { gstin } : {}),
        consent_version: KYC_CONSENT_VERSION,
        ...(supersede ? { supersede: true } : {}),
      });
      track("kyc_started", { gst_declared: gst === "yes", supersede });
      if (status.next_action?.type === "digilocker") {
        await openDigiLocker(status.next_action);
        toStatus(true);
      } else {
        toStatus();
      }
    } catch (error) {
      onFailure(error);
    } finally {
      setBusy(false);
    }
  };

  const onFailure = (error: unknown) => {
    const { status, code, details } = kycError(error);
    track("kyc_start_failed", { status: status || "network" });
    switch (code) {
      case "pan_unverifiable":
        setPanError("We couldn't find this PAN. Check it and try again.");
        errorFeedback();
        panInput.current?.focus();
        return;
      case "gstin_unverifiable":
        setGstinError("We couldn't find this GSTIN. Check it and try again.");
        errorFeedback();
        gstinInput.current?.focus();
        return;
      case "provider_unavailable":
        setBanner("We couldn't reach our verification partner. Nothing was saved. Try again in a few minutes.");
        return;
      case "kyc_unavailable":
        setBanner("Verification is unavailable right now. Please try again later.");
        return;
      case "validation_error": {
        const fields = fieldErrors(details);
        if (fields.consent) return setBlocked({ title: "Please update the app to continue" });
        setPanError(fields.pan);
        setGstinError(fields.gstin);
        if (fields.other || (!fields.pan && !fields.gstin)) setBanner("Check your details and try again.");
        return;
      }
      case "consent_outdated":
        // This build has no newer consent text than the one it just sent, so retrying
        // cannot work, and an older text is never offered instead.
        return setBlocked({ title: "Please update the app to continue" });
      case "profile_incomplete": {
        const missing = Array.isArray(details?.missing) ? (details.missing as unknown[]) : [];
        setBanner(
          missing.includes("business_name")
            ? "Your account doesn't have a business name yet. Contact support and we'll add it."
            : "Add your full name in Profile, Personal details, then try again."
        );
        return;
      }
      case "not_merchant":
        return setBlocked({
          title: "Verification is for business accounts",
          body: "Your account isn't set up as a business account.",
        });
      case "case_in_progress":
        toast.info("You already have a verification in progress");
        return toStatus();
      case "already_verified":
        toast.info("Your business is already verified");
        return toStatus();
      case "invalid_state":
        toast.info("This verification has moved on");
        return toStatus();
      case "erasure_pending":
        toast.info("We're still removing your earlier verification data", {
          message: "Try again in a minute.",
        });
        return;
      case "retry_limit":
        return setBlocked({ title: "Too many attempts", body: retryLimitBody(details), support: true });
      case "rate_limited":
        toast.info("Too many attempts", { message: "Please wait a while, then try again." });
        return;
      default:
        if (status === 0) {
          toast.error("No connection", { message: "Check your internet and try again." });
        } else if (status !== 401) {
          // 401 is the session; the network layer deals with it.
          setBanner("Verification is unavailable right now. Please try again later.");
        }
    }
  };

  if (blocked) {
    return (
      <NonScrollableContainer>
        <SubpageHeader title="Your business details" />
        <EmptyState
          variant="error"
          title={blocked.title}
          body={blocked.body}
          actionLabel={blocked.support ? "Contact support" : undefined}
          onAction={blocked.support ? () => navigation.navigate("contactUs") : undefined}
        />
      </NonScrollableContainer>
    );
  }

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Your business details" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.lg, paddingBottom: space.lg }}
        >
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
              Name
            </Text>
            <Text fontWeight="font-semibold">{userDetails?.name?.trim() || "Not set"}</Text>
            <Text tone="dim" fontSize="text-sm" style={{ marginTop: space.sm }}>
              Business
            </Text>
            <Text fontWeight="font-semibold">{userDetails?.business_name?.trim() || "Not set"}</Text>
            <Text tone="dim" fontSize="text-sm" style={{ marginTop: space.sm }}>
              We compare these with your PAN and GST records. To change them, contact support.
            </Text>
          </View>

          <TextField
            inputRef={panInput}
            label="PAN"
            hint="10 characters, like ABCDE1234F"
            required
            value={pan}
            maxLength={10}
            error={panError}
            {...ID_INPUT}
            onChangeText={(text) => {
              const value = cleanId(text, 10);
              setPan(value);
              // A server "couldn't find this PAN" clears as soon as the PAN changes; a format
              // error clears once the value is well formed.
              if (panError && (panError !== PAN_ERROR || PAN_PATTERN.test(value))) setPanError(undefined);
            }}
            onBlur={() => {
              if (pan && !panOk) setPanError(PAN_ERROR);
            }}
          />
          {isBusinessPan(pan) ? (
            <Text tone="dim" fontSize="text-sm" style={{ marginTop: -space.sm, marginBottom: density.fieldGap }}>
              This looks like a business PAN. You'll share the Aadhaar of the person authorised to act for it.
            </Text>
          ) : null}

          <View style={{ marginBottom: density.fieldGap }}>
            <FieldLabel label="Is your business registered for GST?" required />
            <SegmentedChoice
              accessibilityLabel="Is your business registered for GST?"
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              value={gst}
              onChange={(value) => {
                setGst(value);
                setGstError(undefined);
                // Either way the GSTIN starts empty: "No" must not carry one along.
                setGstin("");
                setGstinError(undefined);
              }}
            />
            <FieldError>{gstError}</FieldError>
          </View>

          {gst === "yes" ? (
            <>
              <TextField
                inputRef={gstinInput}
                label="GSTIN"
                hint="15 characters, like 22ABCDE1234F1Z5"
                required
                value={gstin}
                maxLength={15}
                error={gstinError}
                {...ID_INPUT}
                onChangeText={(text) => {
                  const value = cleanId(text, 15);
                  setGstin(value);
                  if (gstinError && (gstinError !== GSTIN_ERROR || GSTIN_PATTERN.test(value))) {
                    setGstinError(undefined);
                  }
                }}
                onBlur={() => {
                  if (gstin && !gstinOk) setGstinError(GSTIN_ERROR);
                }}
              />
              {panOk && gstinOk && !gstinMatchesPan(gstin, pan) ? (
                <Text
                  tone="warning"
                  fontSize="text-sm"
                  accessibilityLiveRegion="polite"
                  style={{ marginTop: -space.sm, marginBottom: density.fieldGap }}
                >
                  This GSTIN doesn't seem to match the PAN you entered. Check both. You can still continue.
                </Text>
              ) : null}
            </>
          ) : null}

          <Text tone="body" fontSize="text-sm">
            Next you'll open DigiLocker in a secure browser window to share your Aadhaar. You'll return to
            Renit automatically.
          </Text>
        </ScrollView>

        <View
          style={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: space.sm,
            paddingBottom: insets.bottom + space.sm,
            gap: space.sm,
          }}
        >
          {banner ? (
            <Text tone="warning" fontSize="text-sm" accessibilityLiveRegion="polite">
              {banner}
            </Text>
          ) : null}
          <Button onPress={submit} loading={busy} disabled={!ready || busy}>
            {busy ? "Checking your details…" : "Continue to DigiLocker"}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </NonScrollableContainer>
  );
}
