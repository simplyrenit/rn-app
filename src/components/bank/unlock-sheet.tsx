import { postUnlock } from "@/backend/unlock";
import { useAuth } from "@/backend/auth";
import { Button, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { apiError } from "@/lib/api-error";
import { SCREEN_GUTTER, colors, ink, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { RESEND_SECONDS, e164, isCode, resendLabel, unlockErrorMessage } from "@/lib/unlock";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { View } from "react-native";
import { LockClosedIcon } from "react-native-heroicons/outline";
import OTPTextView from "react-native-otp-textinput";

export interface UnlockSheetHandle {
  /** Opens the sheet and sends the code, as the dashboard's sheet does on open. */
  open: () => void;
  close: () => void;
}

interface Props {
  /** Where the code goes, as the server shows it: "··· ··· 4471". */
  phoneMasked: string;
  /** How long an unlock lasts, from the server. */
  minutes: number;
  /** The account's own number, which the code is sent to. */
  phone: string | null | undefined;
  /** This phone's session is unlocked: carry on with what was asked for. */
  onUnlocked: () => void;
  /** The account has no phone number (409 `phone_required`): the screen sends them to add one. */
  onPhoneRequired: () => void;
}

/**
 * The code step before the owner's bank account is added, changed or checked
 * again (T-10). It reads as the dashboard's fresh-code dialog (MD-12): "Enter the
 * code we sent to the owner's phone", six boxes, "Send again in 0:24", Cancel and
 * Unlock. The shop's number is verified with the app's existing Firebase phone
 * sign-in and the new ID token unlocks this phone's session. It exists because one
 * shop login is used on several phones, and a helper's phone must not be able to
 * point payouts at another account.
 */
export const UnlockSheet = forwardRef<UnlockSheetHandle, Props>(
  ({ phoneMasked, minutes, phone, onUnlocked, onPhoneRequired }, ref) => {
    const { color, isDark } = useTheme();
    const { requestPhoneNumberChangeOtp, verifyPhoneNumberChange } = useAuth();
    const modal = useRef<BottomSheetModal>(null);
    const [code, setCode] = useState("");
    // A new code clears the boxes by remounting them.
    const [round, setRound] = useState(0);
    const [sending, setSending] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(0);
    // The ID token Firebase made once the code was confirmed. The code is spent
    // then, so if the unlock call fails (no signal, a 503) the token is kept and
    // only that call is repeated; a new code, or the server calling the token
    // invalid or for another number, drops it.
    const idToken = useRef("");
    const sendingNow = useRef(false);

    useEffect(() => {
      if (secondsLeft <= 0) return;
      const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
      return () => clearTimeout(timer);
    }, [secondsLeft]);

    const sendCode = async () => {
      // One text at a time: a second call while one is on its way would make the
      // first code dead.
      if (sendingNow.current) return;
      const number = e164(phone);
      if (!number) {
        setError("We don't have a valid phone number on your account. Add one in your profile first.");
        return;
      }
      sendingNow.current = true;
      setSending(true);
      setError(null);
      try {
        await requestPhoneNumberChangeOtp(number);
        idToken.current = "";
        setCode("");
        setRound((r) => r + 1);
        setSecondsLeft(RESEND_SECONDS);
      } catch (failure: any) {
        setError(failure?.message || "We couldn't send the code. Try again in a moment.");
      } finally {
        sendingNow.current = false;
        setSending(false);
      }
    };

    useImperativeHandle(ref, () => ({
      open: () => {
        idToken.current = "";
        setCode("");
        setError(null);
        setBusy(false);
        setSecondsLeft(0);
        modal.current?.present();
        void sendCode();
      },
      close: () => modal.current?.dismiss(),
    }));

    const unlock = async () => {
      if (!isCode(code) || busy) return;
      setBusy(true);
      setError(null);
      if (!idToken.current) {
        try {
          idToken.current = await verifyPhoneNumberChange(code);
        } catch {
          setError("That code didn't match, or it has expired. Check it, or send a new one.");
          setBusy(false);
          return;
        }
      }
      try {
        await postUnlock(idToken.current);
        idToken.current = "";
        setBusy(false);
        onUnlocked();
      } catch (failure) {
        const reason = apiError(failure)?.code;
        setBusy(false);
        if (reason === "phone_required") {
          idToken.current = "";
          modal.current?.dismiss();
          onPhoneRequired();
          return;
        }
        // The server refusing the token (too old, or for another number) ends it;
        // anything else is the call failing, and pressing Unlock repeats just that.
        if (reason === "code_invalid" || reason === "wrong_phone") idToken.current = "";
        setError(unlockErrorMessage(reason));
      }
    };

    // The library types the cell as a view style but draws a text input in it, so
    // `color` is part of it; kept out of the literal so the type does not object.
    const otpCell = {
      backgroundColor: ink.surface(isDark),
      borderRadius: radius.input,
      borderWidth: 1,
      borderBottomWidth: 1,
      color: ink.text(isDark),
      width: 46,
      height: 52,
    };

    return (
      <CustomBottomSheetModal ref={modal} isDark={isDark} snapPoints={["70%"]} frame>
        <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.sm, paddingBottom: space.xl, alignItems: "center" }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.full,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: color.brandPanel,
              marginBottom: space.md,
            }}
          >
            <LockClosedIcon size={26} color={color.brandText} />
          </View>
          <Text role="screenTitle" accessibilityRole="header" style={{ textAlign: "center" }}>
            {"Enter the code we sent to\nthe owner's phone"}
          </Text>
          <Text fontSize="text-md" tone="body" style={{ textAlign: "center", marginTop: space.sm }}>
            {`Changing where you're paid needs a fresh code. It unlocks this phone for ${minutes} minutes.`}
          </Text>
          <Text fontSize="text-sm" tone="dim" style={{ textAlign: "center", marginTop: space.xs }}>
            {`Sent to ${phoneMasked}`}
          </Text>

          <View style={{ width: "100%", marginTop: space.md, alignItems: "center" }}>
            <OTPTextView
              key={round}
              containerStyle={{ marginHorizontal: -5 }}
              textInputStyle={otpCell}
              inputCount={6}
              inputCellLength={1}
              tintColor={colors.dark.brand}
              offTintColor={ink.line(isDark)}
              keyboardType="number-pad"
              autoFocus
              handleTextChange={(value: string) => {
                setCode(value.replace(/\D/g, "").slice(0, 6));
                setError(null);
              }}
            />
          </View>

          {error ? (
            <Text tone="danger" fontSize="text-sm" accessibilityLiveRegion="polite" style={{ textAlign: "center", marginTop: space.sm }}>
              {error}
            </Text>
          ) : null}

          {secondsLeft > 0 ? (
            <Text fontSize="text-sm" tone="dim" style={{ marginTop: space.md }} accessibilityLiveRegion="polite">
              {resendLabel(secondsLeft)}
            </Text>
          ) : (
            <Button variant="ghost" size="compact" loading={sending} disabled={busy} onPress={sendCode} style={{ marginTop: space.sm }}>
              Send again
            </Button>
          )}

          <View style={{ flexDirection: "row", gap: space.sm, width: "100%", marginTop: space.md }}>
            <View style={{ flex: 1 }}>
              <Button variant="outline" disabled={busy} onPress={() => modal.current?.dismiss()}>
                Cancel
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button loading={busy} disabled={!isCode(code)} onPress={unlock}>
                Unlock
              </Button>
            </View>
          </View>
        </View>
      </CustomBottomSheetModal>
    );
  }
);
UnlockSheet.displayName = "UnlockSheet";
