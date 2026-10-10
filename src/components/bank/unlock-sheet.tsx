import { postUnlock } from "@/backend/unlock";
import { useAuth } from "@/backend/auth";
import { Button, FieldFrame, Text, TextField } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { apiError } from "@/lib/api-error";
import { SCREEN_GUTTER, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { e164, isCode, unlockErrorMessage } from "@/lib/unlock";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef, useState } from "react";
import { View } from "react-native";

interface Props {
  /** Where the code goes, as the server shows it: "··· ··· 4471". */
  phoneMasked: string;
  /** The account's own number, which the code is sent to. */
  phone: string | null | undefined;
  /** This phone's session is unlocked: carry on with what was asked for. */
  onUnlocked: () => void;
}

/**
 * The code step before the owner's bank account is added, changed or checked
 * again (T-10). The shop's number is verified with Firebase phone sign-in, the
 * same way the profile's phone change does it, and the new ID token unlocks this
 * phone's session for 30 minutes. It exists because one shop login is used on
 * several phones, and a helper's phone must not be able to point payouts at
 * another account.
 */
export const UnlockSheet = forwardRef<BottomSheetModal, Props>(
  ({ phoneMasked, phone, onUnlocked }, ref) => {
    const { isDark } = useTheme();
    const { requestPhoneNumberChangeOtp, verifyPhoneNumberChange } = useAuth();
    const [sent, setSent] = useState(false);
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
      setSent(false);
      setCode("");
      setError(null);
      setBusy(false);
    };

    const sendCode = async () => {
      const number = e164(phone);
      if (!number) {
        setError("We don't have a valid phone number on your account. Add one in your profile first.");
        return;
      }
      setBusy(true);
      setError(null);
      try {
        await requestPhoneNumberChangeOtp(number);
        setSent(true);
        setCode("");
      } catch (failure: any) {
        setError(failure?.message || "We couldn't send the code. Try again in a moment.");
      } finally {
        setBusy(false);
      }
    };

    const confirm = async () => {
      if (!isCode(code)) return;
      setBusy(true);
      setError(null);
      let idToken: string;
      try {
        idToken = await verifyPhoneNumberChange(code);
      } catch {
        setError("That code didn't match, or it has expired. Check it, or send a new one.");
        setBusy(false);
        return;
      }
      try {
        await postUnlock(idToken);
        reset();
        onUnlocked();
      } catch (failure) {
        setError(unlockErrorMessage(apiError(failure)?.code));
        setBusy(false);
      }
    };

    return (
      <CustomBottomSheetModal
        ref={ref}
        isDark={isDark}
        snapPoints={["60%"]}
        frame
        onDismiss={reset}
      >
        <FieldFrame>
          <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.sm, paddingBottom: space.xl }}>
            <Text role="sectionTitle" accessibilityRole="header">
              Confirm it's you
            </Text>
            <Text fontSize="text-md" tone="body" style={{ marginTop: space.sm, marginBottom: space.md }}>
              {`This changes where you're paid, so we check your number again. We'll text a code to ${phoneMasked}.`}
            </Text>

            {sent ? (
              <>
                <TextField
                  label="6-digit code"
                  value={code}
                  onChangeText={(v) => {
                    setCode(v.replace(/\D/g, "").slice(0, 6));
                    setError(null);
                  }}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  maxLength={6}
                  placeholder="123456"
                />
                {error ? (
                  <Text tone="danger" fontSize="text-sm" accessibilityLiveRegion="polite" style={{ marginBottom: space.md }}>
                    {error}
                  </Text>
                ) : null}
                <Button loading={busy} disabled={!isCode(code)} onPress={confirm}>
                  Confirm
                </Button>
                <Button variant="ghost" disabled={busy} onPress={sendCode}>
                  Send a new code
                </Button>
              </>
            ) : (
              <>
                {error ? (
                  <Text tone="danger" fontSize="text-sm" accessibilityLiveRegion="polite" style={{ marginBottom: space.md }}>
                    {error}
                  </Text>
                ) : null}
                <Button loading={busy} onPress={sendCode}>
                  Send code
                </Button>
              </>
            )}
          </View>
        </FieldFrame>
      </CustomBottomSheetModal>
    );
  }
);
UnlockSheet.displayName = "UnlockSheet";
