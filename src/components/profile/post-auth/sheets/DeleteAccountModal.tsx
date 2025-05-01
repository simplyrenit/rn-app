import { Button } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import { memo } from "react";
import { Dimensions, Modal, StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";

const DeleteAccountModal = memo(({ onDelete, onCancel, open }: { onDelete: () => void; onCancel: () => void; open: boolean }) => {
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";
  return <Modal
    visible={open}
    transparent={true}
    animationType="slide"
    onRequestClose={onCancel}
    style={styles.modalStyle}
  >
    <TouchableOpacity
      style={styles.modalBackground}
      activeOpacity={1}
      onPress={onCancel} // Close modal when clicking on the background
    >

      <View style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
        <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 16, lineHeight: 24 }}>Are you sure you want to delete your account?</Text>
        <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'space-between', marginTop: 32, }}>
          <Button onPress={onCancel} style={{ flex: 1 }}>Cancel</Button>
          <Button onPress={onDelete} style={{ flex: 1, backgroundColor: '#E50914' }}>Delete</Button>
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
    borderColor: 'green',
    borderWidth: 1,
    height: Dimensions.get('window').height,
    width: Dimensions.get('window').width,
  },
  modalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: Dimensions.get('window').height,
  },
  container: {
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: 'red',
    width: '90%',
    padding: 32,
    elevation: 5,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 1,
  },
  darkBg: { backgroundColor: '#000', shadowColor: '#fff', },
  lightBg: { backgroundColor: '#fff', shadowColor: '#000', },
  buttons: { paddingVertical: 10 },
});