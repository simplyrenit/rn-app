import { Button, Text } from "@/components/core";
import { DeleteProblem, itemLabel } from "@/lib/delete-account";
import { useTheme } from "@/lib/theme";
import { memo } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { radius } from "@/lib/design-tokens";

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
  const { color, shadow } = useTheme();
  return <Modal
        // Android: draw under the status bar too, so the scrim covers it and
        // insets.top means the same thing as on iOS.
        statusBarTranslucent
    visible={open}
    transparent={true}
    animationType="slide"
    onRequestClose={onCancel}
    style={styles.modalStyle}
  >
    <TouchableOpacity
      style={[styles.modalBackground, { backgroundColor: color.scrim }]}
      activeOpacity={1}
      onPress={onCancel} // Close modal when clicking on the background
    >

      <View style={[styles.container, shadow, { backgroundColor: color.surface }]}>
        <Text fontSize="text-md">
          {problem?.blocked ? "Your account can't be closed yet" : "Are you sure you want to delete your account?"}
        </Text>
        {problem ? (
          <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ marginTop: 12, gap: 12 }}>
            <Text fontSize="text-sm" lineHeight={20} tone={problem.blocked ? "body" : "danger"}>{problem.text}</Text>
            {problem.items.map((item, index) => (
              <View key={`${item.kind}-${item.booking ?? "none"}-${index}`} accessible style={{ gap: 2 }}>
                <Text fontSize="text-xs" tone="body">{itemLabel(item)}</Text>
                <Text fontSize="text-sm" lineHeight={20}>{item.text}</Text>
              </View>
            ))}
            {problem.blocked ? (
              <Text fontSize="text-sm" lineHeight={20} tone="body">You are still signed in. Nothing was changed.</Text>
            ) : null}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'space-between', marginTop: 32, }}>
          <Button onPress={onCancel} style={{ flex: 1 }} disabled={busy}>{problem?.blocked ? "Close" : "Cancel"}</Button>
          {problem?.blocked ? null : (
            <Button onPress={onDelete} loading={busy} disabled={busy} style={{ flex: 1, backgroundColor: color.danger }}>Delete</Button>
          )}
        </View>
      </View>

    </TouchableOpacity>
  </Modal>
});

export default DeleteAccountModal;


// The scrim is pinned to all four edges, so it follows the window as it is now. The heights read
// once from Dimensions at import were the launch-time window and went stale on a display-size or
// split-screen change. The core Text above caps font scaling and picks the app face; the raw Text
// here fell back to the system font, uncapped.
const styles = StyleSheet.create({
  modalStyle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    borderRadius: radius.input,
    overflow: "hidden",
    width: '90%',
    padding: 32,
  },
  buttons: { paddingVertical: 10 },
});