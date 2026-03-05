import { Colors } from "@/constants/theme";
import type { AudioQuality } from "@/contexts/SettingsContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface AudioQualityModalProps {
  visible: boolean;
  onClose: () => void;
  currentQuality: AudioQuality;
  onSelect: (quality: AudioQuality) => void;
}

const qualities: { label: string; value: AudioQuality }[] = [
  { label: "Low (64kbps)", value: "low" },
  { label: "Standard (128kbps)", value: "medium" },
  { label: "High (320kbps)", value: "high" },
];

const AudioQualityModal: React.FC<AudioQualityModalProps> = ({
  visible,
  onClose,
  currentQuality,
  onSelect,
}) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text
              style={[
                styles.closeText,
                {
                  color: theme.tint,
                  fontSize: 38,
                  width: 44,
                  height: 44,
                  textAlign: "center",
                  textAlignVertical: "center",
                },
              ]}
            >
              ×
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>
            Select Audio Quality
          </Text>
          {qualities.map((q) => {
            const isSelected = currentQuality === q.value;
            const optionBg =
              colorScheme === "dark"
                ? isSelected
                  ? "#333"
                  : "#fff"
                : isSelected
                  ? theme.tint + "33"
                  : "#f3f4f6";
            const optionTextColor = isSelected
              ? theme.text
              : colorScheme === "dark"
                ? "#000"
                : "#222";
            return (
              <TouchableOpacity
                key={q.value}
                style={[styles.option, { backgroundColor: optionBg }]}
                onPress={() => {
                  onSelect(q.value);
                  onClose();
                }}
              >
                <Text style={[styles.optionText, { color: optionTextColor }]}>
                  {q.label}
                </Text>
              </TouchableOpacity>
            );
          })}
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
  option: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    marginBottom: 10,
    alignItems: "center",
  },
  selected: {
    backgroundColor: "#3b82f6",
  },
  optionText: {
    fontSize: 16,
    color: "#222",
  },
});

export default AudioQualityModal;
