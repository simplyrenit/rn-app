import { Button } from "@/components/core";
import { useTheme } from "@/lib/theme";
import { memo } from "react";
import { Dimensions, Modal, StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { radius } from "@/lib/design-tokens";

const DeleteAccountModal = memo(({ onDelete, onCancel, open }: { onDelete: () => void; onCancel: () => void; open: boolean }) => {
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
        <Text style={{ color: color.text, fontSize: 16, lineHeight: 24 }}>Are you sure you want to delete your account?</Text>
        <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'space-between', marginTop: 32, }}>
          <Button onPress={onCancel} style={{ flex: 1 }}>Cancel</Button>
          <Button onPress={onDelete} style={{ flex: 1, backgroundColor: color.danger }}>Delete</Button>
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