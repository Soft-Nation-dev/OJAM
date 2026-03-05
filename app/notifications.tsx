import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  NotificationType,
  useNotifications,
} from "@/contexts/NotificationContext";

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { notifications, markAsRead, markAllAsRead, clearAll } =
    useNotifications();

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );
  const [selectedNotificationId, setSelectedNotificationId] = useState<
    string | null
  >(null);

  const selectedNotification = useMemo(
    () =>
      selectedNotificationId
        ? (notifications.find((n) => n.id === selectedNotificationId) ?? null)
        : null,
    [notifications, selectedNotificationId],
  );

  const getNotificationIcon = useCallback((type: NotificationType["type"]) => {
    switch (type) {
      case "new_sermon":
        return "library-music";
      case "playlist":
        return "queue-music";
      case "reminder":
        return "alarm";
      case "update":
        return "system-update";
      default:
        return "notifications";
    }
  }, []);

  const getNotificationColor = useCallback(
    (type: NotificationType["type"]) => {
      switch (type) {
        case "new_sermon":
          return "#3b82f6";
        case "reminder":
          return "#ec4899";
        case "update":
          return "#10b981";
        case "playlist":
          return "#8b5cf6";
        default:
          return Colors[colorScheme ?? "light"].tint;
      }
    },
    [colorScheme],
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleCloseModal = useCallback(() => {
    setSelectedNotificationId(null);
  }, []);

  const handleNotificationPress = useCallback(
    (notification: NotificationType) => {
      markAsRead(notification.id);
      setSelectedNotificationId(notification.id);
    },
    [markAsRead],
  );

  const keyExtractor = useCallback((item: NotificationType) => item.id, []);

  const renderNotificationItem = useCallback(
    ({ item: notification }: { item: NotificationType }) => (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          {
            backgroundColor: notification.read
              ? Colors[colorScheme ?? "light"].background
              : Colors[colorScheme ?? "light"].tint + "12",
            borderLeftWidth: notification.read ? 0 : 3,
            borderLeftColor: notification.read
              ? "transparent"
              : getNotificationColor(notification.type),
          },
        ]}
        activeOpacity={0.7}
        onPress={() => handleNotificationPress(notification)}
      >
        <View
          style={[
            styles.notificationIcon,
            {
              backgroundColor: getNotificationColor(notification.type) + "20",
            },
          ]}
        >
          <MaterialIcons
            name={getNotificationIcon(notification.type)}
            size={24}
            color={getNotificationColor(notification.type)}
          />
        </View>

        <View style={styles.notificationContent}>
          <View style={styles.notificationTitleRow}>
            <ThemedText type="defaultSemiBold" style={{ flex: 1 }}>
              {notification.title}
            </ThemedText>

            {!notification.read && (
              <View
                style={[
                  styles.unreadDot,
                  {
                    backgroundColor: getNotificationColor(notification.type),
                  },
                ]}
              />
            )}
          </View>

          <ThemedText numberOfLines={2} style={{ opacity: 0.7 }}>
            {notification.message}
          </ThemedText>

          <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>
            {notification.time}
          </ThemedText>
        </View>
      </TouchableOpacity>
    ),
    [
      colorScheme,
      getNotificationColor,
      getNotificationIcon,
      handleNotificationPress,
    ],
  );

  return (
    <>
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: Colors[colorScheme ?? "light"].background,
          },
        ]}
        edges={["top"]}
      >
        <StatusBar
          barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={Colors[colorScheme ?? "light"].text}
            />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <ThemedText type="title" style={styles.headerTitle}>
              Notifications
            </ThemedText>

            {unreadCount > 0 && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].tint,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.badgeText,
                    {
                      color:
                        colorScheme === "dark"
                          ? Colors.dark.background
                          : "#fff",
                    },
                  ]}
                >
                  {unreadCount}
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.headerSpacer} />
        </View>

        {/* Actions */}
        {notifications.length > 0 && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={markAllAsRead}
            >
              <MaterialIcons
                name="done-all"
                size={18}
                color={Colors[colorScheme ?? "light"].tint}
              />
              <ThemedText style={styles.actionText}>Mark all read</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={clearAll}>
              <MaterialIcons name="delete-outline" size={18} color="#ef4444" />
              <ThemedText style={[styles.actionText, { color: "#ef4444" }]}>
                Clear all
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Notifications List */}
        <FlatList
          style={styles.scrollView}
          data={notifications}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons
                name="notifications-none"
                size={64}
                color={Colors[colorScheme ?? "light"].tint}
              />
              <ThemedText type="subtitle">No Notifications</ThemedText>
              <ThemedText style={{ opacity: 0.6 }}>
                You&apos;re all caught up!
              </ThemedText>
            </View>
          }
          renderItem={renderNotificationItem}
        />
      </SafeAreaView>

      {/* Modal */}
      <Modal
        visible={!!selectedNotification}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <BlurView
          intensity={60}
          tint={colorScheme ?? "light"}
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalBox,
                {
                  backgroundColor: Colors[colorScheme ?? "light"].background,
                  borderColor:
                    Colors[colorScheme ?? "light"].tabIconDefault + "25",
                },
              ]}
            >
              {selectedNotification && (
                <>
                  <View
                    style={[
                      styles.modalIconWrap,
                      {
                        backgroundColor:
                          getNotificationColor(selectedNotification.type) +
                          "20",
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={getNotificationIcon(selectedNotification.type)}
                      size={32}
                      color={getNotificationColor(selectedNotification.type)}
                    />
                  </View>

                  <ThemedText type="subtitle" style={styles.modalTitle}>
                    {selectedNotification.title}
                  </ThemedText>

                  <ThemedText style={styles.modalMessage}>
                    {selectedNotification.message}
                  </ThemedText>

                  <ThemedText style={styles.modalTime}>
                    {selectedNotification.time}
                  </ThemedText>

                  <TouchableOpacity
                    style={[
                      styles.modalCloseButton,
                      {
                        backgroundColor:
                          Colors[colorScheme ?? "light"].tint + "1A",
                      },
                    ]}
                    onPress={handleCloseModal}
                  >
                    <ThemedText
                      style={{ color: Colors[colorScheme ?? "light"].tint }}
                    >
                      Close
                    </ThemedText>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </BlurView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  backButton: { padding: 8 },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: { fontSize: 20 },
  headerSpacer: { width: 40 },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#fff",
  },
  actions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: { fontSize: 13 },
  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  notificationCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationContent: { flex: 1 },
  notificationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: "center",
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  modalBox: {
    width: "85%",
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  modalTitle: {
    textAlign: "center",
    fontSize: 20,
  },
  modalMessage: {
    opacity: 0.8,
    textAlign: "center",
  },
  modalTime: {
    fontSize: 12,
    opacity: 0.6,
  },
  modalCloseButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
});
