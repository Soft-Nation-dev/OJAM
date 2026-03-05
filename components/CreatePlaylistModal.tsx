import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "./themed-text";

interface CreatePlaylistModalProps {
  visible: boolean;
  onDone: (name: string) => void;
  onCancel: () => void;
}

export default function CreatePlaylistModal({
  visible,
  onDone,
  onCancel,
}: CreatePlaylistModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const handleDone = () => {
    if (!name.trim()) {
      setError("Playlist name is required");
      return;
    }
    onDone(name.trim());
    setName("");
    setError("");
  };

  const handleCancel = () => {
    setName("");
    setError("");
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* themed bg */}
          <ThemedText style={[styles.title, { color: theme.text }]}>
            Create Playlist
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colorScheme === "dark" ? "#222" : "#fff",
                color: theme.text,
                borderColor:
                  theme.border || (colorScheme === "dark" ? "#444" : "#ddd"),
              },
            ]}
            placeholder="Playlist name"
            placeholderTextColor={colorScheme === "dark" ? "#aaa" : "#888"}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error) setError("");
            }}
            autoFocus
            maxLength={40}
          />
          {error ? (
            <ThemedText style={{ color: "#E57373", marginBottom: 8 }}>
              {error}
            </ThemedText>
          ) : null}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: colorScheme === "dark" ? "#222" : "#eee" },
              ]}
              onPress={handleCancel}
            >
              <ThemedText style={[styles.cancelText, { color: theme.text }]}>
                Cancel
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: theme.tint }]}
              onPress={handleDone}
            >
              <ThemedText
                style={[
                  styles.doneText,
                  { color: colorScheme === "dark" ? "#222" : "#fff" },
                ]}
              >
                Done
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    borderRadius: 16,
    padding: 24,
    width: 320,
    alignItems: "center",
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    marginRight: 8,
    alignItems: "center",
  },
  doneButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  doneText: {
    fontWeight: "bold",
    fontSize: 16,
  },
});
