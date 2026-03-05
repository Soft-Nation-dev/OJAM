import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useSettings } from "@/contexts/SettingsContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
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

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "This will delete all cached data. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            // Handle clear cache
            showToast("Cache cleared successfully.", "success");
          },
        },
      ],
      { cancelable: true },
    );
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
              subtitle="Free up space"
              onPress={handleClearCache}
            />
            {/* Download Location removed. */}
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
