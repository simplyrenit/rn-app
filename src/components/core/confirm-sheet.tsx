import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import { NativeSyntheticEvent, TextLayoutEventData, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "./button";
import CustomBottomSheetModal from "./custom-bottom-sheet-modal";
import { SheetHeader } from "./sheet-header";
import { Text } from "./text";

interface Props {
  title: string;
  /** Left out for a title-only sheet (delete account, 2096:31063). */
  body?: string;
  confirmLabel: string;
  /**
   * `danger` draws the kit's Destructive button (red label on a neutral box,
   * never filled), for a delete or an archive.
   */
  tone?: "default" | "danger";
  onConfirm: () => void;
  /** The confirmed action is in flight: the button spins and blocks a second tap. */
  loading?: boolean;
  /** The sheet has closed, however it was closed (scrim, pan, Cancel, or the caller's dismiss). */
  onDismiss?: () => void;
  /**
   * Fired once, when the title and body have been measured and the snap height is final: present from here when
   * presenting on mount. Gets that height without the home indicator (DevKit computes the sheet's box from it).
   */
  onReady?: (height: number) => void;
  /** Why the confirmed action failed, said in the body slot in danger 14/20. */
  error?: string;
}

// The 2.1 kit's `Sheet · Confirm destructive` (figma/00 2110:30387; 2097:28985, 2096:31063), less the home
// indicator, which `insets.bottom` stands in for.
const GRABBER = 21;
// The title row: 44 for one line (the 24pt line centred); a wrapped title is padded 8 above and below its lines,
// as 31063 draws a two-line one (8 + 48 + 8 = 64). The kit SheetHeader grows its row to the lines alone, so the 8s
// are added here.
const TITLE_LINE = 24;
const WRAPPED_TITLE_PAD = 8;
const HEADER_BOTTOM = 8;
const BODY_LINE = 20;
const BODY_BOTTOM = 8;
// 16 + 56 Destructive + 4 + 44 Cancel + 4; a default-tone sheet's 52 Primary leaves 4 spare.
const ACTIONS = 124;

/**
 * The sheet's height without the home indicator, from its measured line counts. 2097:28985 (one-line title, two-line
 * body): 245; 2096:31063 (two-line title, no body): 217. Exported for the tests; DevKit gets the result from `onReady`.
 */
export function confirmSheetHeight(titleLines: number, bodyLines: number): number {
  const titleRow = titleLines > 1 ? titleLines * TITLE_LINE + 2 * WRAPPED_TITLE_PAD : 44;
  return GRABBER + titleRow + HEADER_BOTTOM + (bodyLines > 0 ? bodyLines * BODY_LINE + BODY_BOTTOM : 0) + ACTIONS;
}

// Before the lines are measured: today's four-line body when there is one (so no caller gets shorter than it was),
// else a one-line title alone. The sheet's own scroll view takes any overflow.
const startHeight = (hasBody: boolean) => (hasBody ? GRABBER + 52 + 4 * BODY_LINE + BODY_BOTTOM + ACTIONS : GRABBER + 52 + ACTIONS);

const linesOf = (event: NativeSyntheticEvent<TextLayoutEventData>) => event.nativeEvent.lines.length;

/**
 * "Are you sure?" as a Renit sheet rather than `Alert.alert`: the system alert
 * cannot carry the app's type or its danger colour, and reads as the OS asking
 * rather than the app. Present it through the ref; Cancel and the scrim dismiss it.
 *
 * gorhom 4 needs a snap height before the sheet draws, so the title and body are laid out in an invisible copy next
 * to the sheet from mount, and the height is made from their line counts. A caller that mounts the sheet with its
 * screen and presents it on a later tap gets the final height; one that presents on mount does it from `onReady`.
 */
export const ConfirmSheet = forwardRef<BottomSheetModal, Props>(
  ({ title, body, confirmLabel, tone = "default", onConfirm, loading = false, onDismiss, onReady, error }, ref) => {
    const { isDark, color } = useTheme();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const [titleLines, setTitleLines] = useState<number | null>(null);
    const [bodyLines, setBodyLines] = useState<number | null>(null);
    const [errorLines, setErrorLines] = useState<number | null>(null);
    const ready = useRef(false);
    // An error that appears while the sheet is open is unmeasured for a frame: it keeps the height it had until the
    // error's lines are in, rather than dropping to the start height and back (a visible double jump).
    const lastHeight = useRef<number | null>(null);

    const hasBody = Boolean(body);
    const measured = titleLines !== null && (!body || bodyLines !== null) && (!error || errorLines !== null);
    const height = measured
      ? confirmSheetHeight(titleLines, (body ? bodyLines ?? 0 : 0) + (error ? errorLines ?? 0 : 0))
      : lastHeight.current ?? startHeight(hasBody || Boolean(error));
    if (measured) lastHeight.current = height;

    // After the measured height has committed, so a present() from here opens at it.
    useEffect(() => {
      if (!measured || ready.current) return;
      ready.current = true;
      onReady?.(height);
    }, [measured]);

    const dismiss = () => {
      if (ref && "current" in ref) ref.current?.dismiss();
    };

    const textWidth = width - 2 * SCREEN_GUTTER;

    return (
      <>
        {/* The measuring copy: laid out at the sheet's text width, never seen or read out. */}
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ position: "absolute", left: 0, top: 0, opacity: 0, width: textWidth }}
        >
          <Text role="sectionTitle" onTextLayout={(event) => setTitleLines(linesOf(event))}>
            {title}
          </Text>
          {body ? (
            <Text fontSize="text-sm" lineHeight={BODY_LINE} onTextLayout={(event) => setBodyLines(linesOf(event))}>
              {body}
            </Text>
          ) : null}
          {error ? (
            <Text fontSize="text-sm" lineHeight={BODY_LINE} onTextLayout={(event) => setErrorLines(linesOf(event))}>
              {error}
            </Text>
          ) : null}
        </View>
        <CustomBottomSheetModal ref={ref} isDark={isDark} snapPoints={[height + insets.bottom]} frame onDismiss={onDismiss}>
          {/* gorhom draws the grabber above this. */}
          <View style={titleLines !== null && titleLines > 1 ? { paddingVertical: WRAPPED_TITLE_PAD } : undefined}>
            <SheetHeader title={title} grabber={false} />
          </View>
          {body || error ? (
            <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: BODY_BOTTOM }}>
              {body ? (
                <Text fontSize="text-sm" lineHeight={BODY_LINE} tone="body">
                  {body}
                </Text>
              ) : null}
              {error ? (
                <Text
                  fontSize="text-sm"
                  lineHeight={BODY_LINE}
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                  style={{ color: color.dangerStrong }}
                >
                  {error}
                </Text>
              ) : null}
            </View>
          ) : null}
          <View
            style={{
              paddingHorizontal: SCREEN_GUTTER,
              paddingTop: 16,
              paddingBottom: 4 + insets.bottom,
              alignItems: "center",
              gap: 4,
            }}
          >
            <Button
              variant={tone === "danger" ? "warning" : "primary"}
              loading={loading}
              onPress={onConfirm}
              // The kit draws this sheet's Destructive 56 high (2110:30387), taller
              // than the 52 `warning` that other screens set beside a Secondary, so
              // the 56 lives here. A minimum, so a large text size still grows it; the
              // key is left out for the default tone, where an `undefined` would
              // flatten over the Button's own 52.
              style={[{ alignSelf: "stretch" }, tone === "danger" && { minHeight: 56 }]}
            >
              {confirmLabel}
            </Button>
            <Button variant="ghost" tone="muted" disabled={loading} onPress={dismiss}>
              Cancel
            </Button>
          </View>
        </CustomBottomSheetModal>
      </>
    );
  }
);

