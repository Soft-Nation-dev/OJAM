import { applyOtaUpdate, checkForUpdates } from "@/services/app-updates";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function PWAUpdateBanner() {
  const [available, setAvailable] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    let mounted = true;

    const check = async () => {
      const status = await checkForUpdates();
      if (mounted && status.otaAvailable) setAvailable(true);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    void check();
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(check, 60 * 60 * 1000);
    return () => {
      mounted = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, []);

  if (Platform.OS !== "web" || !available) return null;

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <MaterialIcons name="system-update" size={22} color="#fff" />
      <View style={styles.copy}>
        <Text style={styles.title}>A new Ojam version is ready</Text>
        <Text style={styles.body}>Refresh to use the latest improvements.</Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Refresh Ojam to update"
        disabled={applying}
        onPress={() => {
          setApplying(true);
          void applyOtaUpdate();
        }}
        style={styles.button}
      >
        <Text style={styles.buttonText}>{applying ? "Refreshing…" : "Refresh"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 12,
    zIndex: 1000000,
    borderRadius: 14,
    backgroundColor: "#155eef",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  copy: { flex: 1 },
  title: { color: "#fff", fontSize: 14, fontWeight: "700" },
  body: { color: "rgba(255,255,255,0.82)", fontSize: 12, marginTop: 2 },
  button: { backgroundColor: "#fff", borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 },
  buttonText: { color: "#155eef", fontSize: 13, fontWeight: "700" },
});
