import {
  BankAccountInput,
  bankQueryKey,
  saveBankAccount,
  useBankAccount,
  verifyBankAccount,
} from "@/backend/bank";
import { fetchUnlock } from "@/backend/unlock";
import { UnlockSheet, UnlockSheetHandle } from "@/components/bank/unlock-sheet";
import {
  Button,
  EmptyState,
  FieldFrame,
  Skeleton,
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
  PENDING_RECHECK_MS,
  accountTitle,
  attemptLimitMessage,
  bankFieldErrors,
  canCheckAgain,
  cleanAccountNumber,
  cleanIfsc,
  failureMessage,
  validateBankForm,
  verifiedChip,
} from "@/lib/bank";
import { apiError, fieldErrors } from "@/lib/api-error";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import { isUnlocked } from "@/lib/unlock";
import { uuidv4 } from "@/lib/uuid";
import React, { useEffect, useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import {
  BuildingLibraryIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "react-native-heroicons/outline";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

const EMPTY_FORM: BankForm = { holderName: "", accountNumber: "", confirmNumber: "", ifsc: "" };

/** A small status chip: "Verified 3 Oct", "Checking", "Check failed". */
function StatusChip({
  tone,
  text,
  icon,
}: {
  tone: "success" | "info" | "danger";
  text: string;
  icon?: React.ReactNode;
}) {
  const { color } = useTheme();
  const tint = {
    success: { fg: color.success, bg: color.successWash },
    info: { fg: color.info, bg: color.infoWash },
    danger: { fg: color.danger, bg: color.dangerWash },
  }[tone];
  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: tint.bg,
        borderRadius: radius.full,
        paddingHorizontal: 10,
        paddingVertical: 3,
      }}
    >
      {icon}
      <Text fontSize="text-sm" fontWeight="font-bold" style={{ color: tint.fg }}>
        {text}
      </Text>
    </View>
  );
}

/**
 * SH-14, Bank account: where Renit pays the owner.
 *
 * Four states of one account (none, checking, verified, failed) and one form for
 * adding or changing it, all on this screen. The phone is never asked for a fresh
 * code (API-CONTRACT OE-D). The full account number is typed here, sent once and
 * kept nowhere.
 */
export default function BankAccountScreen() {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { userDetails, userDetailsFailed, fetchUserDetails } = useGlobalContext();
  const query = useBankAccount();
  const account = query.data;
  const queryKey = bankQueryKey(userDetails?.username);

  const [mode, setMode] = useState<"view" | "form">("view");
  const [form, setForm] = useState<BankForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<BankFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [waitedLong, setWaitedLong] = useState(false);

  // The code step (T-10): adding, changing or checking again needs this phone's
  // session unlocked, which takes a code sent to the shop's number. Reading the
  // account needs nothing.
  const unlockSheet = useRef<UnlockSheetHandle>(null);
  const afterUnlock = useRef<(() => void) | null>(null);
  const [codeGoesTo, setCodeGoesTo] = useState({ phoneMasked: "", minutes: 30 });

  // A check that has been "Checking" for a minute gets a "Check again" button.
  const status = account?.status;
  useEffect(() => {
    if (status !== "pending") {
      setWaitedLong(false);
      return;
    }
    const timer = setTimeout(() => setWaitedLong(true), PENDING_RECHECK_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const card = {
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.card,
    backgroundColor: color.surface,
  } as const;

  /**
   * Runs `then` once this phone is unlocked: at once if it already is, else after
   * the code sheet. `force` is for when the server has just said it is locked
   * (403 `fresh_code_required`), whatever the last answer said.
   */
  const askForCode = async (then: () => void, force = false) => {
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
    } catch {
      toast.error("We couldn't check your code", { message: "Check your connection and try again." });
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

  const submit = async () => {
    const found = validateBankForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSubmitting(true);
    setFormError(null);
    const input: BankAccountInput = {
      holderName: form.holderName,
      accountNumber: form.accountNumber,
      ifsc: form.ifsc,
      // One id for this press: if the answer is lost, pressing again is a new press.
      submitId: uuidv4(),
    };
    try {
      const saved = await saveBankAccount(input);
      queryClient.setQueryData(queryKey, saved);
      setForm(EMPTY_FORM);
      setMode("view");
    } catch (error) {
      const failure = apiError(error);
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
    return (
      <NonScrollableContainer>
        {header}
        <View style={{ flex: 1, justifyContent: "center" }}>
          {notOwner ? (
            <EmptyState
              icon={<BuildingLibraryIcon size={28} color={color.brandText} />}
              title="A bank account is for owners"
              body="List your first item and you can add the account Renit pays you into."
              actionLabel="List an item"
              onAction={() => navigation.navigate("ListAddPhotos")}
            />
          ) : (
            <EmptyState
              variant="error"
              icon={<ExclamationTriangleIcon size={28} color={color.danger} />}
              title="Couldn't load your bank account"
              body="Check your connection and try again."
              actionLabel="Try again"
              onAction={() => void (profileFailed ? fetchUserDetails() : query.refetch())}
            />
          )}
        </View>
      </NonScrollableContainer>
    );
  }

  // ---- The form: add the first account, or change it -------------------------------

  if (mode === "form") {
    const changing = account.status !== "none";
    return (
      <NonScrollableContainer>
        {header}
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
              {changing ? "Change your account" : "Add a bank account"}
            </Text>
            <Text tone="body" fontSize="text-md" style={{ marginTop: space.sm, marginBottom: space.lg }}>
              {changing
                ? "Payouts pause until the new account is verified. We send ₹1 to check it, and it usually takes a few seconds."
                : "We send ₹1 to check the account and read back the name the bank holds. It usually takes a few seconds."}
            </Text>

            <TextField
              label="Name on the account"
              hint="Exactly as the bank has it"
              required
              value={form.holderName}
              onChangeText={(v) => setField("holderName", v)}
              error={errors.holderName}
              autoCapitalize="words"
              autoComplete="off"
              maxLength={100}
            />
            <TextField
              label="Account number"
              required
              value={form.accountNumber}
              onChangeText={(v) => setField("accountNumber", cleanAccountNumber(v))}
              error={errors.accountNumber}
              keyboardType="number-pad"
              autoComplete="off"
              autoCorrect={false}
              textContentType="none"
              maxLength={18}
            />
            <TextField
              label="Confirm account number"
              required
              value={form.confirmNumber}
              onChangeText={(v) => setField("confirmNumber", cleanAccountNumber(v))}
              error={errors.confirmNumber}
              keyboardType="number-pad"
              autoComplete="off"
              autoCorrect={false}
              textContentType="none"
              maxLength={18}
            />
            <TextField
              label="IFSC code"
              hint="11 characters, like HDFC0001234"
              required
              value={form.ifsc}
              onChangeText={(v) => setField("ifsc", cleanIfsc(v))}
              error={errors.ifsc}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect={false}
              maxLength={11}
            />

            {formError ? (
              <Text
                tone="danger"
                fontSize="text-sm"
                accessibilityLiveRegion="polite"
                style={{ marginBottom: space.md }}
              >
                {formError}
              </Text>
            ) : null}

            <Button loading={submitting} onPress={submit}>
              {changing ? "Verify new account" : "Verify account"}
            </Button>
          </KeyboardAwareScrollView>
        </FieldFrame>
        {codeSheet}
      </NonScrollableContainer>
    );
  }

  // ---- The account ------------------------------------------------------------------

  let body: React.ReactNode;

  if (account.status === "none") {
    body = (
      <View style={[card, { padding: space.md, gap: space.md }]}>
        <View style={{ gap: 2 }}>
          <Text fontSize="text-md" fontWeight="font-bold">
            Add a bank account
          </Text>
          <Text fontSize="text-sm" tone="body">
            You need this before you can accept a booking
          </Text>
        </View>
        <Button onPress={() => void askForCode(() => openForm(account))}>Add account</Button>
      </View>
    );
  } else {
    const chip =
      account.status === "verified" ? (
        <StatusChip
          tone="success"
          text={verifiedChip(account)}
          icon={<CheckIcon size={14} color={color.success} strokeWidth={2.5} />}
        />
      ) : account.status === "pending" ? (
        <StatusChip tone="info" text="Checking" />
      ) : (
        <StatusChip
          tone="danger"
          text="Check failed"
          icon={<XMarkIcon size={14} color={color.danger} strokeWidth={2.5} />}
        />
      );

    const line =
      account.status === "verified"
        ? "Rent is paid to this account on the day you hand an item over."
        : account.status === "pending"
        ? "We're checking this account with your bank. It usually takes a few seconds."
        : failureMessage(account);

    const again = canCheckAgain(account, waitedLong ? PENDING_RECHECK_MS : 0);

    body = (
      <>
        <View style={card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.button,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: color.brandPanel,
              }}
            >
              <BuildingLibraryIcon size={24} color={color.brandText} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text fontSize="text-md" fontWeight="font-bold" numberOfLines={1}>
                {accountTitle(account)}
              </Text>
              {chip}
            </View>
          </View>
          <View style={{ height: 1, marginHorizontal: space.md, backgroundColor: color.line }} />
          <View style={{ padding: space.md, gap: space.sm }}>
            <Text fontSize="text-md" tone={account.status === "failed" ? "danger" : "body"}>
              {line}
            </Text>
            {account.status !== "verified" && account.payouts_paused ? (
              <Text fontSize="text-sm" tone="body">
                Payouts are on hold until this account is verified.
              </Text>
            ) : null}
            {again ? (
              <Button
                variant="outline"
                size="compact"
                loading={rechecking}
                onPress={() => void askForCode(recheck)}
              >
                Check again
              </Button>
            ) : null}
          </View>
        </View>

        {account.status === "failed" ? (
          <View style={{ marginTop: space.md }}>
            <Button onPress={() => void askForCode(() => openForm(account))}>Try different details</Button>
          </View>
        ) : (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Change account. Payouts pause until the new account is verified."
            activeOpacity={0.7}
            onPress={() => void askForCode(() => openForm(account))}
            style={[
              card,
              {
                marginTop: space.md,
                flexDirection: "row",
                alignItems: "center",
                gap: space.sm,
                padding: space.md,
                minHeight: 62,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text fontSize="text-md" fontWeight="font-bold">
                Change account
              </Text>
              <Text fontSize="text-sm" tone="body">
                Payouts pause until the new account is verified.
              </Text>
            </View>
            <ChevronRightIcon size={20} color={color.text} />
          </TouchableOpacity>
        )}
      </>
    );
  }

  return (
    <NonScrollableContainer>
      {header}
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.md,
          paddingBottom: insets.bottom + space.xl,
        }}
      >
        <Text role="screenTitle" accessibilityRole="header" style={{ marginBottom: space.md }}>
          Where we pay you
        </Text>
        {body}
      </KeyboardAwareScrollView>
      {codeSheet}
    </NonScrollableContainer>
  );
}
