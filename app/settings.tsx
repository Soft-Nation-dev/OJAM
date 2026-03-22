import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { useFocusEffect, useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AudioQualityModal from "../components/AudioQualityModal";
import PlaybackSpeedModal from "../components/PlaybackSpeedModal";
import TextSizeModal from "../components/TextSizeModal";
import ThemeModal from "../components/ThemeModal";

type SettingItemProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
};

const SettingItem = ({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
  rightElement,
  showChevron = true,
}: SettingItemProps) => {
  const colorScheme = useColorScheme();

  return (
    <TouchableOpacity
      style={[
        styles.settingItem,
        {
          borderBottomColor:
            Colors[colorScheme ?? "light"].tabIconDefault + "20",
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconColor + "20" }]}>
        <MaterialIcons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <ThemedText type="defaultSemiBold" style={styles.settingTitle}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText type="default" style={styles.settingSubtitle}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {rightElement ? (
        rightElement
      ) : showChevron && onPress ? (
        <MaterialIcons
          name="chevron-right"
          size={24}
          color={Colors[colorScheme ?? "light"].tabIconDefault}
        />
      ) : null}
    </TouchableOpacity>
  );
};

export default function SettingsScreen() {
  useFocusEffect(
    React.useCallback(() => {
      getCacheSizeMB().then(setCacheSize);
    }, []),
  );
  const [cacheSize, setCacheSize] = React.useState<string>("-");

  async function getCacheSizeMB() {
    try {
      const dir = FileSystem.cacheDirectory!;
      const files = await getAllFilesSafe(dir);

      const infos = await Promise.all(
        files.map(async (file) => {
          try {
            const info = await FileSystem.getInfoAsync(file);
            return info.exists && info.size ? info.size : 0;
          } catch {
            return 0;
          }
        }),
      );

      const total = infos.reduce((sum, size) => sum + size, 0);

      return (total / (1024 * 1024)).toFixed(2);
    } catch {
      return "-";
    }
  }
  const showToast = (
    message: string,
    type: "success" | "info" | "error" = "success",
  ) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(
        message,
        type === "error" ? ToastAndroid.LONG : ToastAndroid.SHORT,
      );
    }
  };
  const colorScheme = useColorScheme();
  const router = useRouter();

  const {
    settings,
    setThemeMode,
    setTextSize,
    setAudioQuality,
    setPlaybackSpeed,
    setNotificationsEnabled,
    setEmailNotifications,
  } = useSettings();
  const { deleteAccount, user } = useAuth();

  // Modal state
  const [modal, setModal] = React.useState<
    null | "audioQuality" | "playbackSpeed" | "theme" | "textSize"
  >(null);

  // Modal open handlers
  const openModal = (type: typeof modal) => setModal(type);
  const closeModal = () => setModal(null);

  const themeLabel =
    settings.themeMode === "system"
      ? "System"
      : settings.themeMode === "dark"
        ? "Dark"
        : "Light";
  const textSizeLabel =
    settings.textSize === "small"
      ? "Small"
      : settings.textSize === "large"
        ? "Large"
        : "Medium";
  const speedLabel = `${settings.playbackSpeed.toFixed(2)}x`;

  const PROTECTED_PATTERNS = [
    "ExponentAsset", // expo assets (fonts/images)
    ".ttf",
    ".otf",
    "google_fonts",
  ];

  function isProtected(path: string) {
    return PROTECTED_PATTERNS.some((p) => path.includes(p));
  }

  async function getAllFilesSafe(dir: string): Promise<string[]> {
    try {
      const items = await FileSystem.readDirectoryAsync(dir);
      let results: string[] = [];

      for (const item of items) {
        const path = dir + item;

        try {
          const info = await FileSystem.getInfoAsync(path);

          if (!info.exists) continue;

          if (info.isDirectory) {
            results = results.concat(await getAllFilesSafe(path + "/"));
          } else {
            results.push(path);
          }
        } catch {
          // skip unreadable files (prevents crash)
        }
      }

      return results;
    } catch {
      return [];
    }
  }

  const handleClearCache = async () => {
    return new Promise<void>((resolve) => {
      Alert.alert(
        "Clear Cache",
        "This will remove temporary files and free up space. Downloads will NOT be deleted.",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve() },
          {
            text: "Clear",
            style: "destructive",
            onPress: async () => {
              try {
                const dir = FileSystem.cacheDirectory!;

                const files = await getAllFilesSafe(dir);

                let deletedCount = 0;

                for (const file of files) {
                  if (isProtected(file)) continue;

                  try {
                    await FileSystem.deleteAsync(file, {
                      idempotent: true,
                    });
                    deletedCount++;
                  } catch {}
                }

                const keys = await AsyncStorage.getAllKeys();
                const tempKeys = keys.filter((k) => k.startsWith("@cache_"));

                if (tempKeys.length) {
                  await AsyncStorage.multiRemove(tempKeys);
                }

                showToast(`Cleared ${deletedCount} files 🧹`, "success");

                resolve();
              } catch (e) {
                console.log("Cache clear failed", e);
                showToast("Failed to clear cache 😬", "error");
                resolve();
              }
            },
          },
        ],
        { cancelable: true },
      );
    });
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: Colors[colorScheme ?? "light"].background },
      ]}
      edges={["top"]}
    >
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={Colors[colorScheme ?? "light"].text}
          />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          Settings
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Modals */}
        <AudioQualityModal
          visible={modal === "audioQuality"}
          onClose={closeModal}
          currentQuality={settings.audioQuality}
          onSelect={setAudioQuality}
        />
        <PlaybackSpeedModal
          visible={modal === "playbackSpeed"}
          onClose={closeModal}
          currentSpeed={settings.playbackSpeed}
          onSelect={(speed) =>
            setPlaybackSpeed(speed as typeof settings.playbackSpeed)
          }
        />
        <ThemeModal
          visible={modal === "theme"}
          onClose={closeModal}
          currentTheme={settings.themeMode}
          onSelect={(val) => setThemeMode(val as typeof settings.themeMode)}
        />
        <TextSizeModal
          visible={modal === "textSize"}
          onClose={closeModal}
          currentSize={settings.textSize}
          onSelect={(size) => setTextSize(size as typeof settings.textSize)}
        />
        {/* Account Section */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            ACCOUNT
          </ThemedText>
          <View style={styles.sectionContent}>
            {/* <SettingItem
              icon="person"
              iconColor="#3b82f6"
              title="Profile"
              subtitle="Edit your personal information"
              onPress={() => router.push("/profile")}
            /> */}
            <SettingItem
              icon="favorite"
              iconColor="#ec4899"
              title="Favorites"
              subtitle="Manage your favorite messages"
              onPress={() => router.push("/favorites")}
            />
            <SettingItem
              icon="queue-music"
              iconColor="#8b5cf6"
              title="Playlists"
              subtitle="Create and manage playlists"
              onPress={() => router.push("/playlists")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            PLAYBACK
          </ThemedText>
          <View style={styles.sectionContent}>
            {/* <SettingItem
              icon="high-quality"
              iconColor="#10b981"
              title="Audio Quality"
              subtitle={qualityLabel}
              onPress={() => openModal("audioQuality")}
            /> */}
            <SettingItem
              icon="speed"
              iconColor="#f59e0b"
              title="Playback Speed"
              subtitle={speedLabel}
              onPress={() => openModal("playbackSpeed")}
            />
            {/* <SettingItem
              icon="download"
              iconColor="#06b6d4"
              title="Auto Download"
              subtitle="Download new messages automatically"
              showChevron={false}
              rightElement={
                <Switch
                  value={settings.autoDownload}
                  onValueChange={setAutoDownload}
                  trackColor={{
                    false: Colors[colorScheme ?? "light"].tabIconDefault + "30",
                    true: Colors.light.tint, // Always blue
                  }}
                  thumbColor="#fff"
                />
              }
            />
            <SettingItem
              icon="wifi"
              iconColor="#8b5cf6"
              title="WiFi Only"
              subtitle="Stream and download on WiFi only"
              showChevron={false}
              rightElement={
                <Switch
                  value={settings.wifiOnly}
                  onValueChange={setWifiOnly}
                  trackColor={{
                    false: Colors[colorScheme ?? "light"].tabIconDefault + "30",
                    true: Colors.light.tint, // Always blue
                  }}
                  thumbColor="#fff"
                />
              }
            /> */}
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            NOTIFICATIONS
          </ThemedText>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="notifications"
              iconColor="#ec4899"
              title="Push Notifications"
              subtitle="Get notified about new content"
              showChevron={false}
              rightElement={
                <Switch
                  value={settings.notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{
                    false: Colors[colorScheme ?? "light"].tabIconDefault + "30",
                    true: Colors.light.tint, // Always blue
                  }}
                  thumbColor="#fff"
                />
              }
            />
            <SettingItem
              icon="email"
              iconColor="#3b82f6"
              title="Email Notifications"
              subtitle="Receive updates via email"
              showChevron={false}
              rightElement={
                <Switch
                  value={settings.emailNotifications}
                  onValueChange={setEmailNotifications}
                  trackColor={{
                    false: Colors[colorScheme ?? "light"].tabIconDefault + "30",
                    true: Colors.light.tint, // Always blue
                  }}
                  thumbColor="#fff"
                />
              }
            />
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            APPEARANCE
          </ThemedText>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="palette"
              iconColor="#f59e0b"
              title="Theme"
              subtitle={themeLabel}
              onPress={() => openModal("theme")}
            />
            <SettingItem
              icon="text-fields"
              iconColor="#10b981"
              title="Text Size"
              subtitle={textSizeLabel}
              onPress={() => openModal("textSize")}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            ABOUT
          </ThemedText>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="info"
              iconColor="#3b82f6"
              title="About Ojam"
              subtitle="Version 1.0.0"
              onPress={() => router.push("/about")}
            />
            {/* <SettingItem
              icon="policy"
              iconColor="#8b5cf6"
              title="Privacy Policy"
              onPress={() => router.push("/privacy-policy")}
            />
            <SettingItem
              icon="description"
              iconColor="#10b981"
              title="Terms of Service"
              onPress={() => router.push("/terms")}
            /> */}
            <SettingItem
              icon="help"
              iconColor="#f59e0b"
              title="Help & Support"
              onPress={() => router.push("/help")}
            />
          </View>
        </View>

        {/* Storage Section */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            STORAGE
          </ThemedText>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="cleaning-services"
              iconColor="#ef4444"
              title="Clear Cache"
              subtitle={`Cache size: ${cacheSize} MB`}
              onPress={async () => {
                await handleClearCache();
                // Refresh cache size after clearing
                setCacheSize(await getCacheSizeMB());
              }}
            />
           
           
          </View>
             <View style={styles.section}>
  {/* <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
    ACCOUNT
  </ThemedText> */}

  <View style={styles.sectionContent}>
    {user && (
      <TouchableOpacity
        style={styles.deleteButton}
        activeOpacity={0.8}
        onPress={() => {
          Alert.alert(
            "Delete Account",
            "Are you sure you want to permanently delete your account? This cannot be undone.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  try {
                    const { error } = await deleteAccount();

                    if (error) {
                      showToast(`Failed to delete account: ${error}`, "error");
                    } else {
                      showToast("Account deleted successfully!", "success");
                    }
                  } catch (err: any) {
                    console.error("Unexpected error deleting account:", err);
                    showToast("An unexpected error occurred", "error");
                  }
                },
              },
            ]
          );
        }}
      >
        <MaterialIcons
          name="delete"
          size={24}
          color="#fff"
          style={{ marginRight: 10 }}
        />
        <ThemedText type="defaultSemiBold" style={styles.buttonText}>
          Delete Account
        </ThemedText>
      </TouchableOpacity>
    )}
  </View>
</View>
        </View>

        {/* Logout Button */}
        {/* <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: "#ef4444" + "15" }]}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={20} color="#ef4444" />
          <ThemedText
            type="defaultSemiBold"
            style={[styles.logoutText, { color: "#ef4444" }]}
          >
            Logout
          </ThemedText>
        </TouchableOpacity> */}

        {/* Clear Cache moved to bottom */}

        <ThemedText type="default" style={styles.footer}>
          Made with ❤️ by Soft Nation
        </ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 30,
    margin: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5, // for android shadow
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    opacity: 0.6,
    paddingHorizontal: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: "transparent",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    opacity: 0.6,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 15,
  },
  footer: {
    textAlign: "center",
    opacity: 0.5,
    fontSize: 12,
    marginTop: 24,
  },
});
