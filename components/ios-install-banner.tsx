import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const DISMISS_KEY = "@pwa_ios_install_dismissed";

export default function IOSInstallBanner() {
  const [isClient, setIsClient] = useState(false);
  const [show, setShow] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || Platform.OS !== "web") return;

    const checkStatus = async () => {
      try {
        // Detect iOS
        const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
        // Safari check (excluding Chrome/Firefox/etc. on iOS)
        const isSafari =
          /Safari/.test(navigator.userAgent) &&
          !/CriOS|FxiOS|OPiOS|mercury/i.test(navigator.userAgent);
        // Standalone check (PWA running as installed app)
        const isStandalone = (window.navigator as any).standalone === true;
        // Check if user previously dismissed it
        const dismissed = await AsyncStorage.getItem(DISMISS_KEY);

        if (isIOS && isSafari && !isStandalone && !dismissed) {
          // Delayed display to look professional
          setTimeout(() => {
            setShow(true);
            // Trigger animation fade/slide
            setTimeout(() => setAnimate(true), 100);
          }, 2000);
        }
      } catch (e) {
        console.warn("[IOSInstallBanner] Error checking status", e);
      }
    };

    void checkStatus();
  }, [isClient]);

  const handleDismiss = async () => {
    setAnimate(false);
    setTimeout(async () => {
      setShow(false);
      try {
        await AsyncStorage.setItem(DISMISS_KEY, "true");
      } catch {}
    }, 400);
  };

  if (!isClient || !show) return null;

  return (
    <View style={[styles.wrapper, animate ? styles.wrapperVisible : null]}>
      {/* Glow top border */}
      <View style={styles.glow} />

      {/* Close button */}
      <TouchableOpacity
        onPress={handleDismiss}
        style={styles.closeButton}
        activeOpacity={0.7}
      >
        <Text style={styles.closeText}>×</Text>
      </TouchableOpacity>

      <View style={styles.container}>
        <Text style={styles.title}>Install Ojam</Text>
        <Text style={styles.body}>To install this app on your iPhone:</Text>
        <View style={styles.stepContainer}>
          <Text style={styles.stepText}>1. Tap the Share button below</Text>
          <View style={styles.iconContainer}>
            <ShareIcon />
          </View>
        </View>
        <Text style={styles.stepText}>
          2. Scroll down and select{" "}
          <Text style={styles.boldText}>'Add to Home Screen'</Text>.
        </Text>
      </View>

      {/* Pointer triangle pointing downwards to Safari Share Icon */}
      <View style={styles.triangle} />
    </View>
  );
}

function ShareIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2f80ed"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 30,
    left: "5%",
    right: "5%",
    backgroundColor: "rgba(21, 23, 24, 0.95)",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    zIndex: 999999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    // Web only smooth transitions and glassmorphism
    ...Platform.select({
      web: {
        transform: [{ translateY: 50 }, { scale: 0.95 }],
        opacity: 0,
        transition:
          "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease-out",
        maxWidth: 380,
        alignSelf: "center",
        backdropFilter: "blur(20px)",
      } as any,
      default: {},
    }),
  },
  wrapperVisible: Platform.select({
    web: {
      transform: [{ translateY: 0 }, { scale: 1 }],
      opacity: 1,
    } as any,
    default: {},
  }),
  glow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: "#2f80ed",
    opacity: 0.8,
  },
  closeButton: {
    position: "absolute",
    top: 8,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  closeText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 18,
    fontWeight: "bold",
    lineHeight: 18,
  },
  container: {
    alignItems: "flex-start",
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  body: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  stepText: {
    color: "#fff",
    fontSize: 13,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: "bold",
    color: "#2f80ed",
  },
  iconContainer: {
    marginLeft: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 4,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  triangle: {
    position: "absolute",
    bottom: -10,
    left: "50%",
    marginLeft: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderLeftColor: "transparent",
    borderRightWidth: 10,
    borderRightColor: "transparent",
    borderTopWidth: 10,
    borderTopColor: "rgba(21, 23, 24, 0.95)",
  },
});
