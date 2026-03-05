import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface FavoritesModalProps {
  visible: boolean;
  onClose: () => void;
}

const FavoritesModal: React.FC<FavoritesModalProps> = ({
  visible,
  onClose,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Favorites</Text>
          {/* Render favorites list here */}
          <Text style={styles.info}>
            Your favorite messages will appear here.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    borderRadius: 24,
    backgroundColor: "#fff",
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 2,
  },
  closeText: {
    fontSize: 28,
    color: "#888",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  info: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
  },
});

export default FavoritesModal;
