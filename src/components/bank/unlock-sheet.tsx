import { postUnlock } from "@/backend/unlock";
import { useAuth } from "@/backend/auth";
import { BottomBar, SheetFooter, SheetHeader, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { apiError } from "@/lib/api-error";
import { SCREEN_GUTTER, fontFamily, radius } from "@/lib/design-tokens";
import { Theme, useTheme } from "@/lib/theme";
import { NO_TOKEN_MESSAGE, RESEND_SECONDS, e164, isCode, resendLabel, unlockErrorMessage } from "@/lib/unlock";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  /**
   * `centred` (default): the bank account's dialog (ENG-437). `sheet`: Personal details' left-aligned kit sheet
   * (2096:30504), header, body, boxes, and the footer's Unlock with Cancel under it.
   */
  layout?: "centred" | "sheet";
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
// The centred sheet's frame metrics (2097:30513): gorhom's 21pt handle row above the body, and the Bottom bar's
// content strip (1 hairline + 16 + 52 + 16) under it; the home inset is added at the snap. Not the bar's measured
// height: with the iOS keyboard up the bar drops the inset, which the sheet's keyboard lift already takes off.
const UNLOCK_HANDLE = 21;
const UNLOCK_BAR = 85;

export const UnlockSheet = forwardRef<UnlockSheetHandle, Props>(
  ({ phoneMasked, minutes, phone, onUnlocked, onPhoneRequired, layout = "centred" }, ref) => {
    const { color, isDark } = useTheme();
    const { width: windowWidth } = useWindowDimensions();
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
    const insets = useSafeAreaInsets();
    // The centred body's measured height (12 + content + 24): the snap follows it, so an error line (one to three
    // lines) grows the sheet. 336 is 2097:30513's before the first layout.
    const [bodyHeight, setBodyHeight] = useState(336);

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
        // Confirmed, but the token could not be read: the code is spent, so only a new one helps.
        if (!idToken.current) {
          setError(NO_TOKEN_MESSAGE);
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
        // The server refusing the token (not valid, confirmed too long ago, or for
        // another number) ends it; anything else is the call failing, and pressing
        // Unlock repeats just that with the same token.
        if (reason === "code_invalid" || reason === "verification_expired" || reason === "wrong_phone") {
          idToken.current = "";
        }
        setError(unlockErrorMessage(reason));
      }
    };

    if (layout === "sheet") return <UnlockSheetBody modal={modal} isDark={isDark} minutes={minutes} phoneMasked={phoneMasked} round={round} code={code} setCode={setCode} error={error} setError={setError} secondsLeft={secondsLeft} sending={sending} busy={busy} sendCode={sendCode} unlock={unlock} />;

    // 2097:30513 / 30585. ENG-438's box, capped at the frame's 48: six 48s and five 8s are 328, wider than a 360dp
    // phone has inside the gutters, where otpBox's own clamp gives 45. The library only recolours the focused box,
    // so its 1.5 focus edge stays 1.
    const box = otpBox(windowWidth, color);
    const boxEdge = error ? color.dangerStrong : color.line;

    return (
      <CustomBottomSheetModal ref={modal} isDark={isDark} snapPoints={[UNLOCK_HANDLE + bodyHeight + UNLOCK_BAR + insets.bottom]} frame>
        <View
          onLayout={(event) => setBodyHeight(Math.ceil(event.nativeEvent.layout.height))}
          style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 12, paddingBottom: 24, alignItems: "center" }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.full,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: color.brandPanel,
            }}
          >
            <LockClosedIcon size={26} color={color.brandText} />
          </View>
          <Text role="sectionTitle" accessibilityRole="header" style={{ textAlign: "center", marginTop: 16 }}>
            {"Enter the code we sent to\nthe owner's phone"}
          </Text>
          <Text fontSize="text-sm" lineHeight={20} tone="body" style={{ textAlign: "center", marginTop: 8 }}>
            {`Changing where you're paid needs a fresh code. It unlocks this phone for ${minutes} minutes.`}
          </Text>
          <Text fontSize="text-sm" lineHeight={20} tone="dim" style={{ textAlign: "center", marginTop: 4 }}>
            {`Sent to ${phoneMasked}`}
          </Text>

          <View style={{ marginTop: 20 }}>
            <OTPTextView
              key={round}
              containerStyle={{ justifyContent: "center", gap: 8 }}
              textInputStyle={{ ...box, width: Math.min(48, box.width) }}
              inputCount={6}
              inputCellLength={1}
              tintColor={error ? color.dangerStrong : color.brand}
              offTintColor={boxEdge}
              keyboardType="number-pad"
              autoFocus
              handleTextChange={(value: string) => {
                setCode(value.replace(/\D/g, "").slice(0, 6));
                setError(null);
              }}
            />
          </View>

          {error ? (
            <Text
              fontSize="text-sm"
              lineHeight={20}
              fontWeight="font-medium"
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={{ textAlign: "center", marginTop: 12, color: color.dangerStrong }}
            >
              {error}
            </Text>
          ) : null}

          {secondsLeft > 0 ? (
            <Text fontSize="text-sm" lineHeight={20} tone="dim" style={{ marginTop: 12 }} accessibilityLiveRegion="polite">
              {resendLabel(secondsLeft)}
            </Text>
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ disabled: busy || sending, busy: sending }}
              disabled={busy || sending}
              onPress={sendCode}
              hitSlop={12}
              style={{ marginTop: 12 }}
            >
              <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} style={{ color: busy || sending ? color.textDim : color.brandText }}>
                Send again
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <BottomBar
          layout="secondary-primary"
          secondary={{ label: "Cancel", onPress: () => modal.current?.dismiss(), disabled: busy }}
          primary={{ label: "Unlock", onPress: unlock, loading: busy, disabled: !isCode(code) }}
        />
      </CustomBottomSheetModal>
    );
  }
);
UnlockSheet.displayName = "UnlockSheet";

// ─── The kit-sheet layout (ENG-438, 2096:30504) ─────────────────────────────
// Below everything above on purpose: the centred dialog is ENG-437's, and this block is the only part ENG-438 adds.

/**
 * One code box, 50×56 (2096:30504, 30681, 30862): r12, a hairline edge (the library turns it brand while the box has
 * focus), 8 between boxes, SemiBold 20/28 digits. Six 50s and five 8s are 340, wider than a 360dp phone has inside the
 * gutters, so the box narrows there. Pass the container style with it to the library (`otpRow`).
 */
export function otpBox(windowWidth: number, color: Theme["color"]) {
  return {
    width: Math.min(50, Math.floor((windowWidth - SCREEN_GUTTER * 2 + 8) / 6) - 8),
    height: 56,
    margin: 0,
    borderRadius: radius.input,
    borderWidth: 1,
    borderBottomWidth: 1,
    backgroundColor: color.surface,
    // The library types the cell as a view style but draws a text input in it, so these are text styles too.
    color: color.text,
    fontFamily: fontFamily.semibold,
    fontWeight: "normal" as const,
    fontSize: 20,
  };
}

/** The row the boxes sit in: from the left, 8 apart (the library spaces them across the width with 5pt margins). */
export const otpRow = { justifyContent: "flex-start" as const, gap: 8 };

// 21 grabber + 48 two-line title + 8, the content (8 + 40 body + 12 + 20 "Sent to" + 12 + 8 + 56 boxes + 12 + 20
// countdown + 24), and the footer (1 + 16 + 52 + 8 + 20 + 16). The frame draws its title over a 44 row (73), the kit
// row grows to the two lines (77), so the sheet is 4 taller than 30504.
const UNLOCK_SHEET_HEIGHT = 21 + 48 + 8 + 212 + 113;

function UnlockSheetBody({
  modal,
  isDark,
  minutes,
  phoneMasked,
  round,
  code,
  setCode,
  error,
  setError,
  secondsLeft,
  sending,
  busy,
  sendCode,
  unlock,
}: {
  modal: React.RefObject<BottomSheetModal>;
  isDark: boolean;
  minutes: number;
  phoneMasked: string;
  round: number;
  code: string;
  setCode: (code: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
  secondsLeft: number;
  sending: boolean;
  busy: boolean;
  sendCode: () => void;
  unlock: () => void;
}) {
  const { color } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <CustomBottomSheetModal ref={modal} isDark={isDark} snapPoints={[UNLOCK_SHEET_HEIGHT + insets.bottom]} frame>
      <SheetHeader title="Enter the code we sent to the owner's phone" grabber={false} />
      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 24, gap: 12 }}>
        <Text fontSize="text-sm" lineHeight={20} tone="body">
          {`Changing where you're paid needs a fresh code. It unlocks this phone for ${minutes} minutes.`}
        </Text>
        <Text fontSize="text-sm" lineHeight={20} tone="dim">
          {`Sent to ${phoneMasked}`}
        </Text>
        <View style={{ paddingTop: 8, gap: 12 }}>
          <OTPTextView
            key={round}
            containerStyle={otpRow}
            textInputStyle={otpBox(windowWidth, color)}
            inputCount={6}
            inputCellLength={1}
            tintColor={color.brand}
            offTintColor={color.line}
            keyboardType="number-pad"
            autoFocus
            handleTextChange={(value: string) => {
              setCode(value.replace(/\D/g, "").slice(0, 6));
              setError(null);
            }}
          />
          {secondsLeft > 0 ? (
            <Text fontSize="text-sm" lineHeight={20} tone="dim" accessibilityLiveRegion="polite">
              {resendLabel(secondsLeft)}
            </Text>
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ disabled: busy || sending, busy: sending }}
              disabled={busy || sending}
              onPress={sendCode}
              hitSlop={12}
              style={{ alignSelf: "flex-start" }}
            >
              <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} style={{ color: busy || sending ? color.textDim : color.brandText }}>
                Send again
              </Text>
            </TouchableOpacity>
          )}
          {error ? (
            <Text fontSize="text-sm" lineHeight={20} accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: color.dangerStrong }}>
              {error}
            </Text>
          ) : null}
        </View>
      </View>
      <SheetFooter
        primary={{ label: "Unlock", onPress: unlock, loading: busy, disabled: !isCode(code) }}
        secondary={{ label: "Cancel", onPress: () => modal.current?.dismiss(), disabled: busy }}
      />
    </CustomBottomSheetModal>
  );
}
