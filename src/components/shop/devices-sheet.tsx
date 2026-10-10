import { Button, EmptyState, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { Device } from "@/backend/shop";
import { SCREEN_GUTTER, space } from "@/lib/design-tokens";
import { istWhen } from "@/lib/shop";
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
}

/**
 * "Signed-in devices": every phone and computer signed in to this account. A
 * device other than this one can be signed out; its next call fails and it needs
 * a new code to come back.
 */
export const DevicesSheet = forwardRef<BottomSheetModal, Props>(
  ({ devices, failed, signingOut, onSignOut, onRetry }, ref) => {
    const { color, isDark } = useTheme();
    return (
      <CustomBottomSheetModal ref={ref} isDark={isDark} snapPoints={["70%"]} frame>
        <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.sm, paddingBottom: space.xl }}>
          <Text role="sectionTitle" accessibilityRole="header" style={{ marginBottom: space.xs }}>
            Signed-in devices
          </Text>
          <Text fontSize="text-md" tone="body" style={{ marginBottom: space.md }}>
            Each one needs a code sent to your shop's number to sign in.
          </Text>
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
            devices.map((device) => (
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
            ))
          )}
        </View>
      </CustomBottomSheetModal>
    );
  }
);
DevicesSheet.displayName = "DevicesSheet";
