import { Button, EmptyState, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { Device } from "@/backend/shop";
import { SCREEN_GUTTER, space } from "@/lib/design-tokens";
import { DEVICE_SIGN_OUT_NOTE, SIGN_OUT_EVERYWHERE_NOTE, devicesNote, istWhen } from "@/lib/shop";
import { useTheme } from "@/lib/theme";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef } from "react";
import { View } from "react-native";

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

/**
 * "Signed-in devices": every phone and computer signed in to this account. A
 * device other than this one can be signed out; its next call fails. The password is not touched
 * (it can sign in again with it); "Sign out everywhere", on the dashboard, switches the password off too (T-43).
 */
export const DevicesSheet = forwardRef<BottomSheetModal, Props>(
  ({ devices, failed, signingOut, onSignOut, onRetry, dashboard = false }, ref) => {
    const { color, isDark } = useTheme();
    const note = devicesNote(devices ?? []);
    return (
      <CustomBottomSheetModal ref={ref} isDark={isDark} snapPoints={["70%"]} frame>
        <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.sm, paddingBottom: space.xl }}>
          <Text role="sectionTitle" accessibilityRole="header" style={{ marginBottom: space.xs }}>
            Signed-in devices
          </Text>
          <Text fontSize="text-md" tone="body" style={{ marginBottom: space.xs }}>
            {DEVICE_SIGN_OUT_NOTE}
          </Text>
          {dashboard ? (
            <Text fontSize="text-sm" tone="body" style={{ marginBottom: space.md }}>
              {SIGN_OUT_EVERYWHERE_NOTE}
            </Text>
          ) : (
            <View style={{ height: space.sm }} />
          )}
          {failed ? (
            <EmptyState
              compact
              variant="error"
              title="Couldn't load your devices"
              actionLabel="Try again"
              onAction={onRetry}
            />
          ) : !devices ? (
            <Text tone="dim">Loading…</Text>
          ) : (
            <>
            {devices.map((device) => (
              <View
                key={device.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.md,
                  paddingVertical: space.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: color.line,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text fontSize="text-md" fontWeight="font-bold" numberOfLines={1}>
                    {device.name || "Unnamed device"}
                    {device.this_device ? " · this phone" : ""}
                  </Text>
                  <Text fontSize="text-sm" tone="body">
                    {`Last used ${istWhen(device.last_seen_at) || "recently"}`}
                  </Text>
                </View>
                {device.this_device ? null : (
                  <Button
                    variant="outline"
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
            {note.empty ? (
              <Text fontSize="text-md" tone="body" accessibilityLiveRegion="polite">
                {note.empty}
              </Text>
            ) : null}
            {note.thisPhone ? (
              <Text fontSize="text-sm" tone="body" style={{ marginTop: space.md }}>
                {note.thisPhone}
              </Text>
            ) : null}
            </>
          )}
        </View>
      </CustomBottomSheetModal>
    );
  }
);
DevicesSheet.displayName = "DevicesSheet";
