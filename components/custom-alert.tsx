import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import {
    Animated,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
  confirmText?: string;
}

export function CustomAlert({
  visible,
  title,
  message,
  type = "info",
  onClose,
  confirmText = "OK",
}: CustomAlertProps) {
  const colorScheme = useColorScheme();
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [slideAnim, visible]);

  const iconName =
    type === "success" ? "check-circle" : type === "error" ? "error" : "info";
  const iconColor =
    type === "success"
      ? "#4CAF50"
      : type === "error"
        ? "#F44336"
        : Colors[colorScheme ?? "light"].tint;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.alertContainer,
            {
              backgroundColor: Colors[colorScheme ?? "light"].background,
              transform: [
                {
                  scale: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
              opacity: slideAnim,
            },
          ]}
        >
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: iconColor + "15" },
            ]}
          >
            <MaterialIcons name={iconName} size={48} color={iconColor} />
          </View>

          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>

          <ThemedText type="default" style={styles.message}>
            {message}
          </ThemedText>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: Colors[colorScheme ?? "light"].tint },
            ]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <ThemedText
              type="defaultSemiBold"
              style={[
                styles.buttonText,
                { color: colorScheme === "dark" ? "#000" : "#fff" },
              ]}
            >
              {confirmText}
            </ThemedText>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  alertContainer: {
    borderRadius: 24,
    padding: 32,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    opacity: 0.8,
    lineHeight: 22,
    marginBottom: 28,
  },
  button: {
    width: "100%",
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
  },
});
