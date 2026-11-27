import { Button, EmptyState, SheetHeader, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { Device } from "@/backend/shop";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { DEVICE_SIGN_OUT_NOTE, SIGN_OUT_EVERYWHERE_NOTE, devicesNote, istWhen } from "@/lib/shop";
import { useTheme } from "@/lib/theme";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef, useState } from "react";
import { View } from "react-native";
import { ExclamationCircleIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  devices: Device[] | undefined;
  failed: boolean;
  /** The id being signed out, so its button shows it is working. */
  signingOut: number | null;
  onSignOut: (device: Device) => void;
  onRetry: () => void;
  /** The shop has the dashboard (an approved merchant): only then is it sent there to sign every device out. */
  dashboard?: boolean;
}

// Sheet · Signed-in devices (2096:29570 list 448, 29658 error 463, 29735 empty 295): the gorhom grabber row (21),
// the kit Sheet header without its X (52), then the content, gap 8, ending 8 above the home strip that
// `insets.bottom` stands in for. The sheet is as tall as what it holds: measured, with a first guess from the frames.
const GRABBER = 21;
const HEADER = 52;
const END_PAD = 8;
const GAP = 8;
const ROW = 71;

/**
 * "Signed-in devices": every phone and computer signed in to this account. A
 * device other than this one can be signed out; its next call fails. The password is not touched
 * (it can sign in again with it); "Sign out everywhere", on the dashboard, switches the password off too (T-43).
 */
export const DevicesSheet = forwardRef<BottomSheetModal, Props>(
  ({ devices, failed, signingOut, onSignOut, onRetry, dashboard = false }, ref) => {
    const { color, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const note = devicesNote(devices ?? []);
    const [measured, setMeasured] = useState<number | null>(null);
    const guess =
      HEADER + 40 + (dashboard ? GAP + 64 : 0) + GAP + (failed ? 228 : !devices ? 20 : devices.length ? ROW * devices.length : 60) + END_PAD;
    return (
      <CustomBottomSheetModal
        ref={ref}
        isDark={isDark}
        snapPoints={[GRABBER + (measured ?? guess) + insets.bottom]}
        frame
      >
        <View onLayout={(event) => setMeasured(Math.ceil(event.nativeEvent.layout.height))}>
          <SheetHeader title="Signed-in devices" grabber={false} />
          <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: END_PAD, gap: GAP }}>
            <Text fontSize="text-sm" tone="body">
              {DEVICE_SIGN_OUT_NOTE}
            </Text>
            {dashboard ? (
              <Text fontSize="text-xs" tone="dim">
                {SIGN_OUT_EVERYWHERE_NOTE}
              </Text>
            ) : null}
            {failed ? (
              // The kit Empty state with its body hidden and the tonal action (29658).
              <EmptyState
                icon={<ExclamationCircleIcon size={32} color={color.text} />}
                title="Couldn't load your devices"
                actionLabel="Try again"
                onAction={onRetry}
              />
            ) : !devices ? (
              <Text fontSize="text-sm" tone="dim">
                Loading…
              </Text>
            ) : (
              <>
                {devices.length ? (
                  <View>
                    {devices.map((device) => (
                      // A row: 12 above and below, a hairline under it, the name SemiBold 16/24 over "Last used …".
                      <View
                        key={device.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 16,
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: color.line,
                        }}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text fontSize="text-md" fontWeight="font-semibold" numberOfLines={1}>
                            {device.name || "Unnamed device"}
                            {device.this_device ? " · this phone" : ""}
                          </Text>
                          <Text fontSize="text-sm" tone="dim">
                            {`Last used ${istWhen(device.last_seen_at) || "recently"}`}
                          </Text>
                        </View>
                        {device.this_device ? null : (
                          // The kit destructive button: a red label on a neutral box (REVIEW, device Sign out is red).
                          <Button
                            variant="warning"
                            size="compact"
                            loading={signingOut === device.id}
                            disabled={signingOut !== null}
                            onPress={() => onSignOut(device)}
                          >
                            Sign out
                          </Button>
                        )}
                      </View>
                    ))}
                  </View>
                ) : null}
                {note.empty ? (
                  <Text fontSize="text-sm" tone="body" accessibilityLiveRegion="polite">
                    {note.empty}
                  </Text>
                ) : null}
                {note.thisPhone ? (
                  <Text fontSize="text-sm" tone="body">
                    {note.thisPhone}
                  </Text>
                ) : null}
              </>
            )}
          </View>
        </View>
      </CustomBottomSheetModal>
    );
  }
);
DevicesSheet.displayName = "DevicesSheet";
