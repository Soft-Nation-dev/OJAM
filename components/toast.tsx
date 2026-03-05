import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useRef } from "react";
import { Animated, Modal, StyleSheet, Text, View } from "react-native";

interface ToastProps {
  visible: boolean;
  message: string;
  type?: "success" | "info" | "error";
  duration?: number;
  onHide?: () => void;
}

export function Toast({
  visible,
  message,
  type = "success",
  duration = 2000,
  onHide,
}: ToastProps) {
  const colorScheme = useColorScheme();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show toast
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (onHide) onHide();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide, translateY, opacity]);

  if (!visible) return null;

  const iconName =
    type === "success" ? "check-circle" : type === "error" ? "error" : "info";

  const backgroundColor =
    type === "success"
      ? colorScheme === "dark"
        ? "#1F7B3E"
        : "#4CAF50"
      : type === "error"
        ? colorScheme === "dark"
          ? "#B71C1C"
          : "#F44336"
        : colorScheme === "dark"
          ? "#2F6FEB"
          : "#2063FA";

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onHide}
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor,
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <MaterialIcons name={iconName} size={20} color="#FFFFFF" />
          <Text style={styles.message}>{message}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 10,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 9999,
  },
  message: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
});
