import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const SNOOZE_KEY = "@pwa_install_snoozed_at";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
export const SHOW_INSTALL_EVENT = "ojam:show-install";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const getDeviceInfo = () => {
  if (Platform.OS !== "web" || typeof navigator === "undefined") {
    return { isIOS: false, installed: false };
  }
  const isIOS =
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const installed =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches === true;
  return { isIOS, installed };
};

export function openPWAInstallGuide() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.dispatchEvent(new Event(SHOW_INSTALL_EVENT));
  }
}

export default function IOSInstallBanner() {
  const device = useMemo(getDeviceInfo, []);
  const [installed, setInstalled] = useState(device.installed);
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const openGuide = useCallback(() => setShowGuide(true), []);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setShowBanner(false);
      setShowGuide(false);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(SHOW_INSTALL_EVENT, openGuide);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(SHOW_INSTALL_EVENT, openGuide);
    };
  }, [openGuide]);

  useEffect(() => {
    if (Platform.OS !== "web" || installed) return;
    let active = true;
    const decide = async () => {
      const snoozedAt = Number(await AsyncStorage.getItem(SNOOZE_KEY));
      if (Number.isFinite(snoozedAt) && Date.now() - snoozedAt < SNOOZE_MS) return;
      window.setTimeout(() => {
        if (active) setShowBanner(true);
      }, 2500);
    };
    void decide();
    return () => {
      active = false;
    };
  }, [installed]);

  const snooze = async () => {
    setShowBanner(false);
    await AsyncStorage.setItem(SNOOZE_KEY, String(Date.now()));
  };

  const install = async () => {
    if (!promptEvent) {
      setShowGuide(true);
      setShowBanner(false);
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setShowBanner(false);
    setPromptEvent(null);
  };

  if (Platform.OS !== "web") return null;

  return (
    <>
      {!installed && showBanner && (
        <View style={styles.banner} accessibilityRole="alert">
          <MaterialIcons name="install-mobile" size={25} color="#fff" />
          <View style={styles.bannerCopy}>
            <Text style={styles.bannerTitle}>Install Ojam</Text>
            <Text style={styles.bannerBody}>Faster access and a full-screen app experience.</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={promptEvent ? "Install Ojam" : "Show Ojam installation instructions"}
            onPress={() => void install()}
            style={styles.installButton}
          >
            <Text style={styles.installButtonText}>{promptEvent ? "Install" : "How"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Remind me about installing Ojam next week"
            onPress={() => void snooze()}
            style={styles.closeButton}
          >
            <MaterialIcons name="close" size={20} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showGuide} transparent animationType="fade" onRequestClose={() => setShowGuide(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modal} accessibilityRole="summary">
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <MaterialIcons name={installed ? "check" : "install-mobile"} size={28} color="#155eef" />
              </View>
              <View style={styles.modalTitleCopy}>
                <Text style={styles.modalTitle}>{installed ? "Ojam is installed" : "Install Ojam"}</Text>
                <Text style={styles.modalSubtitle}>
                  {installed ? "Open it from your Home Screen." : "Follow the steps for this browser."}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close installation instructions"
                onPress={() => setShowGuide(false)}
                style={styles.modalClose}
              >
                <MaterialIcons name="close" size={22} color="#475467" />
              </TouchableOpacity>
            </View>

            {!installed && promptEvent && (
              <TouchableOpacity onPress={() => void install()} style={styles.primaryButton}>
                <MaterialIcons name="download" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Install now</Text>
              </TouchableOpacity>
            )}

            {!installed && !promptEvent && device.isIOS && (
              <View style={styles.steps}>
                <InstallStep number="1" icon="ios-share" text="Tap the Share button in your browser toolbar." />
                <InstallStep number="2" icon="add-box" text="Choose Add to Home Screen in the Share menu." />
                <InstallStep number="3" icon="check-circle" text="Tap Add to finish." />
                <Text style={styles.tip}>The Share button may appear at the top or bottom. If your browser does not show Add to Home Screen, open ojam.com.ng in Safari.</Text>
              </View>
            )}

            {!installed && !promptEvent && !device.isIOS && (
              <View style={styles.steps}>
                <InstallStep number="1" icon="more-vert" text="Open your browser menu." />
                <InstallStep number="2" icon="install-mobile" text="Choose Install app or Add to Home screen." />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

function InstallStep({ number, icon, text }: { number: string; icon: keyof typeof MaterialIcons.glyphMap; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{number}</Text></View>
      <MaterialIcons name={icon} size={23} color="#155eef" />
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { position: "absolute", bottom: 28, left: 12, right: 12, zIndex: 999999, backgroundColor: "#161b26", borderRadius: 16, padding: 14, paddingRight: 42, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, maxWidth: 440, alignSelf: "center" },
  bannerCopy: { flex: 1 },
  bannerTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  bannerBody: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 },
  installButton: { backgroundColor: "#155eef", borderRadius: 9, paddingHorizontal: 13, paddingVertical: 9 },
  installButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  closeButton: { position: "absolute", right: 7, top: 7, width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.62)", justifyContent: "center", padding: 20 },
  modal: { width: "100%", maxWidth: 460, alignSelf: "center", backgroundColor: "#fff", borderRadius: 20, padding: 18, gap: 18 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  modalIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#eaf0ff", alignItems: "center", justifyContent: "center" },
  modalTitleCopy: { flex: 1 },
  modalTitle: { color: "#101828", fontSize: 19, fontWeight: "800" },
  modalSubtitle: { color: "#667085", fontSize: 13, marginTop: 2 },
  modalClose: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  primaryButton: { borderRadius: 11, backgroundColor: "#155eef", paddingVertical: 13, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  steps: { gap: 12 },
  step: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, backgroundColor: "#f8fafc", padding: 10 },
  stepNumber: { width: 25, height: 25, borderRadius: 13, backgroundColor: "#155eef", alignItems: "center", justifyContent: "center" },
  stepNumberText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  stepText: { color: "#344054", flex: 1, fontSize: 14, lineHeight: 20 },
  tip: { color: "#667085", fontSize: 12, lineHeight: 18, paddingHorizontal: 4 },
});
