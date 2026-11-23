import { Button, Text } from "@/components/core";
import { ConfirmSheet } from "@/components/core/confirm-sheet";
import { DeleteProblem, itemLabel } from "@/lib/delete-account";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { memo, useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

/**
 * Closing the account. Asking is the kit's Sheet · Confirm destructive (2096:31063, two-line title, no body); a refusal
 * because something is still open (T-20) is the centred card (2096:31168). The two never share the screen: when the
 * refusal lands while the sheet is up, the sheet goes first and the card comes up once it has gone, so there is one
 * scrim at a time.
 */
const DeleteAccountModal = memo(({
  onDelete,
  onCancel,
  open,
  busy = false,
  problem = null,
}: {
  onDelete: () => void;
  onCancel: () => void;
  open: boolean;
  /** The delete call is out: Delete waits, and a second tap does nothing. */
  busy?: boolean;
  /** Why the account was not deleted (T-20): what is open, in the server's words, or why the call failed. The person is still signed in. */
  problem?: DeleteProblem | null;
}) => {
  const { color } = useTheme();
  const sheet = useRef<BottomSheetModal>(null);
  // The sheet is being put away for the blocked card, not cancelled.
  const swapping = useRef(false);
  const [showBlocked, setShowBlocked] = useState(false);

  useEffect(() => {
    if (!problem?.blocked) return;
    swapping.current = true;
    sheet.current?.dismiss();
  }, [problem?.blocked]);

  useEffect(() => {
    if (!open) sheet.current?.dismiss();
  }, [open]);

  return (
    <>
      <ConfirmSheet
        ref={sheet}
        title="Are you sure you want to delete your account?"
        confirmLabel="Delete"
        tone="danger"
        loading={busy}
        onConfirm={onDelete}
        // The parent mounts this only while it is open, so the sheet is presented once its height is measured.
        onReady={() => {
          if (open) sheet.current?.present();
        }}
        onDismiss={() => {
          if (swapping.current) {
            swapping.current = false;
            setShowBlocked(true);
          } else onCancel();
        }}
        error={problem && !problem.blocked ? problem.text : undefined}
      />
      <Modal
        // Android: draw under the status bar too, so the scrim covers it and
        // insets.top means the same thing as on iOS.
        statusBarTranslucent
        visible={showBlocked && Boolean(problem?.blocked)}
        transparent
        animationType="fade"
        onRequestClose={onCancel}
      >
        <View style={styles.centre}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onCancel}
            style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]}
          />
          {problem?.blocked ? (
            // 2096:31168: 342 wide on the 24 gutter, r16, padded 24, 12 between the parts.
            <View style={[styles.card, { backgroundColor: color.surface }]}>
              <Text role="sectionTitle" accessibilityRole="header">
                Your account can't be closed yet
              </Text>
              <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ gap: 12 }}>
                <Text fontSize="text-sm" lineHeight={20} tone="body">
                  {problem.text}
                </Text>
                {problem.items.map((item, index) => (
                  <View key={`${item.kind}-${item.booking ?? "none"}-${index}`} accessible style={{ gap: 2 }}>
                    <Text fontSize="text-xs" fontWeight="font-medium" lineHeight={16} tone="dim">
                      {itemLabel(item)}
                    </Text>
                    <Text fontSize="text-sm" lineHeight={20}>
                      {item.text}
                    </Text>
                  </View>
                ))}
                <Text fontSize="text-sm" lineHeight={20} tone="body">
                  You are still signed in. Nothing was changed.
                </Text>
              </View>
              <View style={{ paddingTop: 12 }}>
                <Button variant="outline" onPress={onCancel}>
                  Close
                </Button>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
});

export default DeleteAccountModal;

const styles = StyleSheet.create({
  centre: { flex: 1, justifyContent: "center", paddingHorizontal: SCREEN_GUTTER },
  card: { borderRadius: 16, padding: 24, gap: 12 },
});
