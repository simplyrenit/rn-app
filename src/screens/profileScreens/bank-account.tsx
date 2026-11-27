import {
  BankAccountInput,
  bankQueryKey,
  fetchBankAccount,
  saveBankAccount,
  useBankAccount,
  verifyBankAccount,
} from "@/backend/bank";
import { useRingPermission } from "@/backend/ring-permission";
import { useShop } from "@/backend/shop";
import { fetchUnlock } from "@/backend/unlock";
import { UnlockSheet, UnlockSheetHandle } from "@/components/bank/unlock-sheet";
import { RingPermissionCard } from "@/components/shop/ring-permission-card";
import {
  BottomBar,
  Button,
  EmptyState,
  Skeleton,
  StatusPill,
  SubpageHeader,
  Text,
  TextField,
} from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import {
  BankAccount,
  BankForm,
  BankFormErrors,
  SubmitKey,
  accountTitle,
  answerSettlesKey,
  PAYMENTS_REFUSED,
  attemptLimitMessage,
  bankLoadProblem,
  bankFieldErrors,
  canCheckAgain,
  cleanAccountNumber,
  cleanIfsc,
  failureMessage,
  landed,
  submitKeyFor,
  validateBankForm,
  verifiedChip,
} from "@/lib/bank";
import { apiError, fieldErrors } from "@/lib/api-error";
import { SCREEN_GUTTER, density, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import { e164, isUnlocked } from "@/lib/unlock";
import { uuidv4 } from "@/lib/uuid";
import { useRoute } from "@react-navigation/native";
import React, { useRef, useState } from "react";
import { Alert, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import {
  BanknotesIcon,
  BuildingLibraryIcon,
  ExclamationTriangleIcon,
} from "react-native-heroicons/outline";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

const EMPTY_FORM: BankForm = { holderName: "", accountNumber: "", confirmNumber: "", ifsc: "" };

/** Dev-only design seed (ENG-437 plan §2.7): the form open with fake values, one field focused. Never submits. */
interface BankDesign {
  form?: Partial<BankForm>;
  focus?: keyof BankForm;
}

/** The Bottom bar's content strip (figma/00 2071:14467): 1 hairline + 16 + 52 + 16. */
const BAR_STRIP = 85;

/**
 * SH-14, Bank account: where Renit pays the owner.
 *
 * Four states of one account (none, checking, verified, failed) and one form for
 * adding or changing it, all on this screen. Reading the account needs no code;
 * adding, changing and checking again do, on the phone too (T-10, below). The full
 * account number is typed here, sent once and kept nowhere.
 */
export default function BankAccountScreen() {
  const navigation = useTypedNavigation();
  const route = useRoute();
  const design = __DEV__ ? (route.params as { design?: BankDesign } | undefined)?.design : undefined;
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { userDetails, userDetailsFailed, fetchUserDetails } = useGlobalContext();
  const query = useBankAccount();
  const account = query.data;
  // Once the account is verified the shop can take bookings, and a phone that will not ring misses every
  // one of them. An owner who is not a merchant has no Rentals tab, so this is where they are told and asked (ENG-209).
  const ringPerm = useRingPermission();
  const canTake = useShop().data?.can_take_bookings === true;
  const queryKey = bankQueryKey(userDetails?.username);

  const [mode, setMode] = useState<"view" | "form">(design?.form ? "form" : "view");
  const [form, setForm] = useState<BankForm>({ ...EMPTY_FORM, ...design?.form });
  const [errors, setErrors] = useState<BankFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rechecking, setRechecking] = useState(false);

  // The code step (T-10): adding, changing or checking again needs this phone's
  // session unlocked, which takes a code sent to the shop's number. Reading the
  // account needs nothing.
  const unlockSheet = useRef<UnlockSheetHandle>(null);
  const afterUnlock = useRef<(() => void) | null>(null);
  const [codeGoesTo, setCodeGoesTo] = useState({ phoneMasked: "", minutes: 30 });
  // True while the unlock is being read, so a second tap on any of the four
  // buttons does not open the sheet again and send a second text.
  const askingForCode = useRef(false);
  const [checkingCode, setCheckingCode] = useState(false);

  // The 2.1 cards (2097:30247, 30281): a 1px edge at r12, no fill of their own beyond the surface.
  const card = {
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.input,
    backgroundColor: color.surface,
  } as const;

  /** 409 `phone_required`: the account has no number, so the profile is where to go. */
  const sendToAddNumber = () => {
    Alert.alert(
      "Add your phone number first",
      "We send a code to your number before you change where you're paid. Add and verify it in your profile.",
      [
        { text: "Not now", style: "cancel" },
        { text: "Go to profile", onPress: () => navigation.navigate("MainTabs", { screen: "Profile" }) },
      ]
    );
  };

  /**
   * Runs `then` once this phone is unlocked: at once if it already is, else after
   * the code sheet. `force` is for when the server has just said it is locked
   * (403 `fresh_code_required`), whatever the last answer said.
   */
  const askForCode = async (then: () => void, force = false) => {
    if (askingForCode.current) return;
    // No number on the account (someone who joined with Google or Apple): no code
    // can be sent, so they add and verify one first.
    if (e164(userDetails?.phone) === null) {
      sendToAddNumber();
      return;
    }
    askingForCode.current = true;
    setCheckingCode(true);
    try {
      const state = await fetchUnlock();
      if (!force && isUnlocked(state)) {
        then();
        return;
      }
      setCodeGoesTo({ phoneMasked: state.phone_masked, minutes: state.minutes });
      afterUnlock.current = then;
      // Sends the code as it opens.
      unlockSheet.current?.open();
    } catch (error) {
      if (apiError(error)?.code === "phone_required") {
        sendToAddNumber();
        return;
      }
      toast.error("We couldn't check your code", { message: "Check your connection and try again." });
    } finally {
      askingForCode.current = false;
      setCheckingCode(false);
    }
  };

  const openForm = (from: BankAccount | undefined) => {
    setForm({ ...EMPTY_FORM, holderName: from?.holder_name ?? "" });
    setErrors({});
    setFormError(null);
    setMode("form");
  };

  const setField = (field: keyof BankForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    // Whatever the owner changes stops being wrong until the next press.
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  };

  // One `submit_id` for one set of details, kept until the form changes or the
  // server answers (API-CONTRACT OE-D). After a press that got no answer the POST may
  // have gone through, so the next press reads the account first.
  const submitKey = useRef<SubmitKey | null>(null);
  const outcomeUnknown = useRef(false);

  const submit = async () => {
    const found = validateBankForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSubmitting(true);
    setFormError(null);
    const key = submitKeyFor(submitKey.current, form, uuidv4);
    submitKey.current = key;
    const input: BankAccountInput = {
      holderName: form.holderName,
      accountNumber: form.accountNumber,
      ifsc: form.ifsc,
      submitId: key.id,
    };
    let sent = false;
    try {
      if (outcomeUnknown.current) {
        const read = await fetchBankAccount();
        queryClient.setQueryData(queryKey, read);
        if (landed(read, form)) {
          // The earlier press did reach the server: these details are already being checked.
          outcomeUnknown.current = false;
          submitKey.current = null;
          setForm(EMPTY_FORM);
          setMode("view");
          return;
        }
      }
      sent = true;
      const saved = await saveBankAccount(input);
      outcomeUnknown.current = false;
      submitKey.current = null;
      queryClient.setQueryData(queryKey, saved);
      setForm(EMPTY_FORM);
      setMode("view");
    } catch (error) {
      const failure = apiError(error);
      if (sent) {
        // An answer settles the key; no answer leaves it, and the next press reads first.
        if (answerSettlesKey(failure)) {
          submitKey.current = null;
          outcomeUnknown.current = false;
        } else {
          outcomeUnknown.current = true;
        }
      }
      if (failure?.code === "fresh_code_required") {
        // The unlock ran out while the form was open: confirm again, then send it.
        void askForCode(() => void submit(), true);
      } else if (failure?.code === "validation_error") {
        const fields = bankFieldErrors(fieldErrors(failure));
        setErrors(fields);
        if (Object.keys(fields).length === 0) {
          setFormError(failure.message ?? "Check the details and try again.");
        }
      } else if (failure?.code === "attempt_limit") {
        setFormError(attemptLimitMessage(Number(failure.details?.retry_after_s)));
      } else if (failure?.code === "payments_unavailable") {
        setFormError("Payments aren't available right now. Nothing was changed. Try again in a moment.");
      } else if (failure?.code === "payments_error") {
        setFormError(PAYMENTS_REFUSED);
      } else if (sent && !answerSettlesKey(failure)) {
        setFormError(
          "We didn't get an answer, so we can't tell if your details went through. Press again: we'll look first."
        );
      } else {
        setFormError(
          failure?.message ?? "We couldn't save the account. Check your connection and try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const recheck = async () => {
    setRechecking(true);
    try {
      queryClient.setQueryData(queryKey, await verifyBankAccount());
    } catch (error) {
      const failure = apiError(error);
      if (failure?.code === "fresh_code_required") {
        void askForCode(() => void recheck(), true);
      } else if (failure?.code === "stage_not_allowed") {
        toast.info("Still checking", {
          message: "Banks can take a few minutes. This page updates by itself.",
        });
      } else if (failure?.code === "attempt_limit") {
        toast.error(attemptLimitMessage(Number(failure.details?.retry_after_s)));
      } else if (failure?.code === "payments_error") {
        toast.error("We couldn't run the check again", { message: PAYMENTS_REFUSED });
      } else {
        toast.error("We couldn't run the check again", {
          message: "Check your connection and try again.",
        });
      }
    } finally {
      setRechecking(false);
    }
  };

  const onBack = () => {
    // Out of the form and back to the account, if there is one to go back to.
    if (mode === "form" && account && account.status !== "none") {
      setMode("view");
      return;
    }
    navigation.goBack();
  };

  const header = <SubpageHeader title="Bank account" onBack={onBack} />;

  const codeSheet = (
    <UnlockSheet
      ref={unlockSheet}
      phoneMasked={codeGoesTo.phoneMasked}
      minutes={codeGoesTo.minutes}
      phone={userDetails?.phone}
      onPhoneRequired={sendToAddNumber}
      onUnlocked={() => {
        unlockSheet.current?.close();
        const next = afterUnlock.current;
        afterUnlock.current = null;
        next?.();
      }}
    />
  );

  // ---- Not ready: loading, not an owner, could not load ---------------------------

  // The query cannot start without the profile's username. If the profile failed
  // to load, nothing else retries it: that is an error, not a long wait.
  const profileFailed = query.isIdle && userDetailsFailed;

  if ((query.isLoading || query.isIdle) && !profileFailed) {
    return (
      <NonScrollableContainer>
        {header}
        <View
          style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.md, gap: space.md }}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Loading your bank account"
          accessibilityState={{ busy: true }}
        >
          <Skeleton width="70%" height={32} borderRadius={radius.input} />
          <Skeleton width="100%" height={150} />
          <Skeleton width="100%" height={64} />
        </View>
      </NonScrollableContainer>
    );
  }

  if (!account) {
    const notOwner = apiError(query.error)?.code === "not_owner";
    // What the person is told: the connection only when it was the connection (the profile failing is a connection too).
    const problem = bankLoadProblem(profileFailed ? null : apiError(query.error));
    return (
      <NonScrollableContainer>
        {header}
        <View style={{ flex: 1, justifyContent: "center" }}>
          {notOwner ? (
            <EmptyState
              // 2097:30474 draws banknotes in brand here (the frame wins over REVIEW b1-01's building) and a Primary action.
              icon={<BanknotesIcon size={32} color={color.brandText} />}
              title="A bank account is for owners"
              body="List your first item and you can add the account Renit pays you into."
              actionLabel="List an item"
              actionTone="primary"
              onAction={() => navigation.navigate("ListAddPhotos")}
            />
          ) : (
            <EmptyState
              variant="error"
              icon={<ExclamationTriangleIcon size={28} color={color.danger} />}
              title={problem.title}
              body={problem.body}
              actionLabel={problem.action?.label}
              onAction={
                problem.action
                  ? () => {
                      if (problem.action?.does === "code") void askForCode(() => void query.refetch(), true);
                      else void (profileFailed ? fetchUserDetails() : query.refetch());
                    }
                  : undefined
              }
            />
          )}
        </View>
        {/* The code step is also the way in when the server asked for a fresh code to read the account. */}
        {codeSheet}
      </NonScrollableContainer>
    );
  }

  // ---- The form: add the first account, or change it -------------------------------

  if (mode === "form") {
    const changing = account.status !== "none";
    // The seed focuses one field and hides every caret: a blinking caret never gives frame_diff two equal shots.
    const seeded = (field: keyof BankForm) =>
      design ? { autoFocus: design.focus === field, caretHidden: true } : {};
    // 2097:30421 spaces the fields 16 apart; TextField keeps the kit's own gap under itself.
    const fieldGap = { marginBottom: 16 - density.fieldGap };
    return (
      <NonScrollableContainer>
        {header}
        {/* The bar is a sibling under the scroll, as in business-billing: NonScrollableContainer lifts both over the
            iOS keyboard (adjustResize on Android), so the scroll has to keep the focused field above the bar too. */}
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={space.md + BAR_STRIP}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 16, paddingBottom: 32 }}
        >
          <Text role="screenTitle" accessibilityRole="header">
            {changing ? "Change your account" : "Add a bank account"}
          </Text>
          <Text tone="body" fontSize="text-sm" lineHeight={20} style={{ marginTop: 16, marginBottom: 16 }}>
            {changing
              ? "Payouts pause until the new account is verified. We send ₹1 to check it, and it usually takes a few seconds."
              : "We send ₹1 to check the account and read back the name the bank holds. It usually takes a few seconds."}
          </Text>

          <View style={fieldGap}>
            <TextField
              label="Name on the account"
              hint="Exactly as the bank has it"
              value={form.holderName}
              onChangeText={(v) => setField("holderName", v)}
              error={errors.holderName}
              autoCapitalize="words"
              autoComplete="off"
              maxLength={100}
              {...seeded("holderName")}
            />
          </View>
          <View style={fieldGap}>
            <TextField
              label="Account number"
              value={form.accountNumber}
              onChangeText={(v) => setField("accountNumber", cleanAccountNumber(v))}
              error={errors.accountNumber}
              keyboardType="number-pad"
              autoComplete="off"
              autoCorrect={false}
              textContentType="none"
              maxLength={18}
              {...seeded("accountNumber")}
            />
          </View>
          <View style={fieldGap}>
            <TextField
              label="Confirm account number"
              value={form.confirmNumber}
              onChangeText={(v) => setField("confirmNumber", cleanAccountNumber(v))}
              error={errors.confirmNumber}
              keyboardType="number-pad"
              autoComplete="off"
              autoCorrect={false}
              textContentType="none"
              maxLength={18}
              {...seeded("confirmNumber")}
            />
          </View>
          <TextField
            label="IFSC code"
            hint="11 characters, like HDFC0001234"
            value={form.ifsc}
            onChangeText={(v) => setField("ifsc", cleanIfsc(v))}
            error={errors.ifsc}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect={false}
            maxLength={11}
            {...seeded("ifsc")}
          />
        </KeyboardAwareScrollView>
        {/* Right above Verify, where it is in view after the press whatever the scroll (no frame draws it). */}
        {formError ? (
          <Text
            tone="danger"
            fontSize="text-sm"
            lineHeight={20}
            accessibilityLiveRegion="polite"
            style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: 8 }}
          >
            {formError}
          </Text>
        ) : null}
        <BottomBar
          primary={{
            label: changing ? "Verify new account" : "Verify account",
            onPress: () => void submit(),
            loading: submitting,
          }}
        />
        {codeSheet}
      </NonScrollableContainer>
    );
  }

  // ---- The account ------------------------------------------------------------------

  let body: React.ReactNode;
  let bar: React.ReactNode = null;

  if (account.status === "none") {
    body = (
      <View style={[card, { padding: 16, gap: 2 }]}>
        <Text fontSize="text-md" lineHeight={24} fontWeight="font-semibold">
          Add a bank account
        </Text>
        <Text fontSize="text-sm" lineHeight={20} tone="body">
          You need this before you can accept a booking
        </Text>
      </View>
    );
    bar = (
      <BottomBar
        primary={{ label: "Add account", loading: checkingCode, onPress: () => void askForCode(() => openForm(account)) }}
      />
    );
  } else {
    const pill =
      account.status === "verified" ? (
        <StatusPill tone="success" label={verifiedChip(account)} style={{ alignSelf: "flex-start" }} />
      ) : account.status === "pending" ? (
        <StatusPill tone="info" label="Checking" style={{ alignSelf: "flex-start" }} />
      ) : (
        <StatusPill tone="danger" label="Check failed" style={{ alignSelf: "flex-start" }} />
      );

    const line =
      account.status === "verified"
        ? "Rent is paid to this account on the day you hand an item over."
        : account.status === "pending"
        ? "We're checking this account with your bank. It usually takes a few seconds."
        : failureMessage(account);

    const again = canCheckAgain(account);
    // 2097:30370: a failed account is not boxed. No edge, no side padding, a full-width rule.
    const flat = account.status === "failed";
    const side = flat ? 0 : 16;

    // Gap, not margins: RingPermissionCard returns null when it has nothing to ask, and must not leave a gap then.
    body = (
      <View style={{ gap: 16 }}>
        <View style={flat ? null : card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 16, paddingHorizontal: side }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.input,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: color.brandPanel,
              }}
            >
              <BuildingLibraryIcon size={24} color={color.brandText} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text fontSize="text-md" lineHeight={24} fontWeight="font-semibold" numberOfLines={1}>
                {accountTitle(account)}
              </Text>
              {pill}
            </View>
          </View>
          <View style={{ height: 1, marginHorizontal: side, backgroundColor: color.line }} />
          <View style={{ paddingVertical: 16, paddingHorizontal: side, gap: 8 }}>
            <Text
              fontSize="text-sm"
              lineHeight={20}
              tone={flat ? undefined : "body"}
              style={flat ? { color: color.dangerStrong } : undefined}
            >
              {line}
            </Text>
            {account.status !== "verified" && account.payouts_paused ? (
              <Text fontSize="text-sm" lineHeight={20} tone="dim">
                Payouts are on hold until this account is verified.
              </Text>
            ) : null}
            {again ? (
              <Button
                variant="outline"
                size="compact"
                loading={rechecking || checkingCode}
                onPress={() => void askForCode(recheck)}
              >
                Check again
              </Button>
            ) : null}
          </View>
        </View>

        {account.status === "verified" ? <RingPermissionCard enabled={canTake} permission={ringPerm} /> : null}

        {account.status === "failed" ? null : (
          // The kit two-line row inside its own r12 card, padded 14/16 rather than the List row's 24 gutter.
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Change account. Payouts pause until the new account is verified."
            activeOpacity={0.7}
            disabled={checkingCode}
            onPress={() => void askForCode(() => openForm(account))}
            style={[
              card,
              { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 14, paddingHorizontal: 16 },
            ]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text fontSize="text-md" lineHeight={24} fontWeight="font-medium">
                Change account
              </Text>
              <Text fontSize="text-sm" lineHeight={20} tone="dim">
                Payouts pause until the new account is verified.
              </Text>
            </View>
            <ChevronRightIcon size={20} color={color.textDim} />
          </TouchableOpacity>
        )}
      </View>
    );
    if (account.status === "failed") {
      bar = (
        <BottomBar
          primary={{
            label: "Try different details",
            loading: checkingCode,
            onPress: () => void askForCode(() => openForm(account)),
          }}
        />
      );
    }
  }

  return (
    <NonScrollableContainer>
      {header}
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: 16,
          paddingBottom: 32 + (bar ? 0 : insets.bottom),
        }}
      >
        <Text role="screenTitle" accessibilityRole="header" style={{ marginBottom: 16 }}>
          Where we pay you
        </Text>
        {body}
      </KeyboardAwareScrollView>
      {bar}
      {codeSheet}
    </NonScrollableContainer>
  );
}
