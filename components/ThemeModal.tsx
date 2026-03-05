import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ThemeModalProps {
  visible: boolean;
  onClose: () => void;
  currentTheme: string;
  onSelect: (theme: string) => void;
}

const themes = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

const ThemeModal: React.FC<ThemeModalProps> = ({
  visible,
  onClose,
  currentTheme,
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
            Select Theme
          </Text>
          {themes.map((t) => {
            const isSelected = currentTheme === t.value;
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
                key={t.value}
                style={[styles.option, { backgroundColor: optionBg }]}
                onPress={() => {
                  onSelect(t.value);
                  onClose();
                }}
              >
                <Text style={[styles.optionText, { color: optionTextColor }]}>
                  {t.label}
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

export default ThemeModal;
