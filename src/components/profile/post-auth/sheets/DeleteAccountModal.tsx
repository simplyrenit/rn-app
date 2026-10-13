import { Button } from "@/components/core";
import { DeleteProblem, itemLabel } from "@/lib/delete-account";
import { useTheme } from "@/lib/theme";
import { memo } from "react";
import { Dimensions, Modal, StyleSheet, Text, View } from "react-native";
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
        <Text style={{ color: color.text, fontSize: 16, lineHeight: 24 }}>
          {problem?.blocked ? "Your account can't be closed yet" : "Are you sure you want to delete your account?"}
        </Text>
        {problem ? (
          <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ marginTop: 12, gap: 12 }}>
            <Text style={{ color: problem.blocked ? color.textBody : color.danger, fontSize: 14, lineHeight: 20 }}>{problem.text}</Text>
            {problem.items.map((item, index) => (
              <View key={`${item.kind}-${item.booking ?? "none"}-${index}`} accessible style={{ gap: 2 }}>
                <Text style={{ color: color.textBody, fontSize: 12 }}>{itemLabel(item)}</Text>
                <Text style={{ color: color.text, fontSize: 14, lineHeight: 20 }}>{item.text}</Text>
              </View>
            ))}
            {problem.blocked ? (
              <Text style={{ color: color.textBody, fontSize: 14, lineHeight: 20 }}>You are still signed in. Nothing was changed.</Text>
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


const styles = StyleSheet.create({
  modalStyle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: Dimensions.get('window').height,
    width: Dimensions.get('window').width,
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
    height: Dimensions.get('window').height,
  },
  container: {
    borderRadius: radius.input,
    overflow: "hidden",
    width: '90%',
    padding: 32,
  },
  buttons: { paddingVertical: 10 },
});