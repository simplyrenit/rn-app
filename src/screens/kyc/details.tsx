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
  SHOP_LICENCE_ERROR,
  SHOP_LICENCE_PATTERN,
  UDYAM_ERROR,
  UDYAM_PATTERN,
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
import { BusinessRegistrationKind, RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
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

/** The optional Udyam or shop licence number (ENG-348), per kind. */
const REGISTRATION = {
  udyam: {
    label: "Udyam registration number",
    hint: "Like UDYAM-MH-19-0001234",
    pattern: UDYAM_PATTERN,
    error: UDYAM_ERROR,
    maxLength: 19,
  },
  shop_licence: {
    label: "Shop licence number",
    hint: "As printed on your Shops & Establishments certificate",
    pattern: SHOP_LICENCE_PATTERN,
    error: SHOP_LICENCE_ERROR,
    maxLength: 40,
  },
} as const;

/** What the registration input keeps of what was typed. */
const cleanRegistration = (text: string, length: number) =>
  text.toUpperCase().replace(/[^A-Z0-9/-]/g, "").slice(0, length);

/** A state that replaces the form: nothing the merchant types here can get past it. */
type Blocked = { title: string; body?: string; support?: boolean } | null;

/**
 * PAN, the GST question and the GSTIN, an optional Udyam or shop licence number (ENG-348), then
 * the hand-off to DigiLocker.
 *
 * The PAN, GSTIN and registration number live in this component's state and nowhere else: not in route params,
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
  const [regOpen, setRegOpen] = useState(false);
  const [regKind, setRegKind] = useState<BusinessRegistrationKind | null>(null);
  const [regNumber, setRegNumber] = useState("");
  const [regError, setRegError] = useState<string | undefined>();
  const [banner, setBanner] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<Blocked>(null);
  // Stays true from the request until the DigiLocker session has closed, so a second tap does nothing.
  // `busy` drives the button; the ref is the guard, because two taps in one frame both see the
  // state from before the first one.
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const panInput = useRef<TextInput>(null);
  const gstinInput = useRef<TextInput>(null);
  const regInput = useRef<TextInput>(null);

  const panOk = PAN_PATTERN.test(pan);
  const gstinOk = GSTIN_PATTERN.test(gstin);
  const reg = regKind ? REGISTRATION[regKind] : null;
  // Sent only when the block is open and both halves are filled; an open, empty block is skipped.
  const regFilled = regOpen && reg !== null && regNumber !== "";
  const regOk = !regFilled || reg.pattern.test(regNumber);
  const ready = panOk && gst !== null && (gst === "no" || gstinOk) && regOk;

  const closeRegistration = () => {
    setRegOpen(false);
    setRegKind(null);
    setRegNumber("");
    setRegError(undefined);
  };

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
    const regBad = !regOk;
    if (regBad) setRegError(reg?.error);
    if (panBad || gstBad || gstinBad || regBad || inFlight.current) return;

    inFlight.current = true;
    setBusy(true);
    try {
      const status = await start({
        pan,
        gst_declared: gst === "yes",
        ...(gst === "yes" ? { gstin } : {}),
        consent_version: KYC_CONSENT_VERSION,
        ...(regFilled && regKind
          ? { business_registration_kind: regKind, business_registration_number: regNumber }
          : {}),
        ...(supersede ? { supersede: true } : {}),
      });
      track("kyc_started", { gst_declared: gst === "yes", supersede });
      if (status.next_action?.type === "digilocker") {
        // The case exists now, so the status screen is next even if the browser never opened.
        toStatus(await openDigiLocker(status.next_action));
      } else {
        toStatus();
      }
    } catch (error) {
      onFailure(error);
    } finally {
      inFlight.current = false;
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
      case "udyam_unverifiable":
        setRegError("We couldn't find this Udyam number. Check it, or remove it to continue without it.");
        errorFeedback();
        regInput.current?.focus();
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
        setRegError(fields.registration);
        if (fields.other || (!fields.pan && !fields.gstin && !fields.registration)) {
          setBanner("Check your details and try again.");
        }
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

          {regOpen ? (
            <View style={{ marginBottom: density.fieldGap }}>
              <FieldLabel label="Udyam or shop licence (optional)" />
              <SegmentedChoice
                accessibilityLabel="Udyam or shop licence"
                options={[
                  { value: "udyam", label: "Udyam registration" },
                  { value: "shop_licence", label: "Shop licence" },
                ]}
                value={regKind}
                onChange={(value) => {
                  setRegKind(value);
                  // A Udyam number is not a licence number: switching starts the field empty.
                  setRegNumber("");
                  setRegError(undefined);
                }}
              />
              {reg ? (
                <View style={{ marginTop: density.fieldGap }}>
                  <TextField
                    inputRef={regInput}
                    label={reg.label}
                    hint={reg.hint}
                    value={regNumber}
                    maxLength={reg.maxLength}
                    error={regError}
                    {...ID_INPUT}
                    onChangeText={(text) => {
                      const value = cleanRegistration(text, reg.maxLength);
                      setRegNumber(value);
                      if (regError && (regError !== reg.error || reg.pattern.test(value))) setRegError(undefined);
                    }}
                    onBlur={() => {
                      if (regNumber && !reg.pattern.test(regNumber)) setRegError(reg.error);
                    }}
                  />
                </View>
              ) : null}
              <View style={{ alignItems: "flex-start" }}>
                <Button variant="ghost" size="compact" onPress={closeRegistration}>
                  Remove Udyam or shop licence
                </Button>
              </View>
            </View>
          ) : (
            <View style={{ marginBottom: density.fieldGap, alignItems: "flex-start" }}>
              <Button variant="ghost" size="compact" onPress={() => setRegOpen(true)}>
                Add Udyam or shop licence (optional)
              </Button>
            </View>
          )}

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
          {/* A disabled button takes no touches, so a tap on the greyed one lands here and runs the
              same checks as a submit: it says what is missing instead of doing nothing (ENG-280). */}
          <Pressable onPress={submit} disabled={ready || busy} accessible={false} focusable={false}>
            <Button onPress={submit} loading={busy} disabled={!ready || busy}>
              {busy ? "Checking your details…" : "Continue to DigiLocker"}
            </Button>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </NonScrollableContainer>
  );
}
