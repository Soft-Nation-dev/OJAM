import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSermons } from "@/contexts/SermonsContext";
import { useSettings } from "@/contexts/SettingsContext";
import {
  RealtimeAppNotification,
  subscribeToRealtimeNotifications,
} from "@/services/realtime-notifications";
import * as Notifications from "expo-notifications";
import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { Platform } from "react-native";
import uuid from "react-native-uuid";

export type NotificationType = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "new_sermon" | "reminder" | "update" | "playlist";
  read: boolean;
  eventKey?: string;
  sourceNotificationId?: string;
};

interface NotificationContextProps {
  notifications: NotificationType[];
  addNotification: (
    notification: Omit<NotificationType, "id" | "read" | "time">,
    options?: { mirrorToSystem?: boolean },
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export const NotificationContext = createContext<
  NotificationContextProps | undefined
>(undefined);

const NOTIFICATIONS_KEY = "@notifications";
const MAX_NOTIFICATIONS = 100;
const APP_NOTIFICATION_CHANNEL_ID = "service-reminders";

const normalizeStoredNotifications = (value: unknown): NotificationType[] => {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const result: NotificationType[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const notification = item as Partial<NotificationType>;
    if (typeof notification.id !== "string" || seen.has(notification.id)) {
      continue;
    }

    if (
      notification.type !== "new_sermon" &&
      notification.type !== "reminder" &&
      notification.type !== "update" &&
      notification.type !== "playlist"
    ) {
      continue;
    }

    if (
      typeof notification.title !== "string" ||
      typeof notification.message !== "string"
    ) {
      continue;
    }

    seen.add(notification.id);
    result.push({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      time:
        typeof notification.time === "string"
          ? notification.time
          : new Date().toISOString(),
      type: notification.type,
      read: !!notification.read,
      eventKey:
        typeof notification.eventKey === "string"
          ? notification.eventKey
          : undefined,
      sourceNotificationId:
        typeof notification.sourceNotificationId === "string"
          ? notification.sourceNotificationId
          : undefined,
    });

    if (result.length >= MAX_NOTIFICATIONS) break;
  }

  return result;
};

let notificationInfraInitialized = false;

const ensureNotificationInfra = async () => {
  if (!notificationInfraInitialized) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(
        APP_NOTIFICATION_CHANNEL_ID,
        {
          name: "App Notifications",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#2063FA",
        },
      );
    }

    notificationInfraInitialized = true;
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { settings } = useSettings();
  const { refresh: refreshSermons } = useSermons();

  const appendNotification = useCallback(
    (
      notification: Omit<NotificationType, "id" | "read" | "time">,
      id?: string,
    ) => {
      const newNotification: NotificationType = {
        ...notification,
        id: id ?? (uuid.v4() as string),
        read: false,
        time: new Date().toISOString(),
      };

      setNotifications((prev) => {
        if (
          (newNotification.eventKey &&
            prev.some((n) => n.eventKey === newNotification.eventKey)) ||
          (newNotification.sourceNotificationId &&
            prev.some(
              (n) =>
                n.sourceNotificationId ===
                newNotification.sourceNotificationId,
            ))
        ) {
          return prev;
        }

        return [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS);
      });
    },
    [],
  );

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
        if (!stored) return;
        const parsed = JSON.parse(stored);
        setNotifications(normalizeStoredNotifications(parsed));
      } catch {
        setNotifications([]);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  }, [hydrated, notifications]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const toNotificationType = (value: unknown): NotificationType["type"] => {
      if (
        value === "new_sermon" ||
        value === "reminder" ||
        value === "update" ||
        value === "playlist"
      ) {
        return value;
      }
      return "update";
    };

    const receivedSub = Notifications.addNotificationReceivedListener(
      (event) => {
        const content = event.request.content;
        const title = content.title ?? "Notification";
        const message = content.body ?? "";
        const type = toNotificationType(content.data?.type);
        const localNotificationId =
          typeof content.data?.localNotificationId === "string"
            ? content.data.localNotificationId
            : undefined;

        if (localNotificationId) {
          setNotifications((prev) => {
            const existingIndex = prev.findIndex(
              (n) => n.id === localNotificationId,
            );

            if (existingIndex < 0) {
              return [
                {
                  id: localNotificationId,
                  title,
                  message,
                  type,
                  read: false,
                  time: new Date().toISOString(),
                  sourceNotificationId: event.request.identifier,
                },
                ...prev,
              ].slice(0, MAX_NOTIFICATIONS);
            }

            const existing = prev[existingIndex];
            if (existing.sourceNotificationId === event.request.identifier) {
              return prev;
            }

            const next = [...prev];
            next[existingIndex] = {
              ...existing,
              sourceNotificationId: event.request.identifier,
            };
            return next;
          });
          return;
        }

        appendNotification({
          title,
          message,
          type,
          sourceNotificationId: event.request.identifier,
        });
      },
    );

    return () => {
      receivedSub.remove();
    };
  }, [appendNotification]);

  const addNotification = useCallback(
    (
      notification: Omit<NotificationType, "id" | "read" | "time">,
      options?: { mirrorToSystem?: boolean },
    ) => {
      const mirrorToSystem =
        (options?.mirrorToSystem ?? true) && settings.notificationsEnabled;
      const localNotificationId = uuid.v4() as string;
      appendNotification(notification, localNotificationId);

      if (!mirrorToSystem || Platform.OS === "web") {
        return;
      }

      void (async () => {
        const isAllowed = await ensureNotificationInfra();
        if (!isAllowed) {
          return;
        }

        const nativeNotificationId =
          await Notifications.scheduleNotificationAsync({
            content: {
              title: notification.title,
              body: notification.message,
              data: {
                type: notification.type,
                localNotificationId,
              },
              ...(Platform.OS === "android"
                ? { channelId: APP_NOTIFICATION_CHANNEL_ID }
                : {}),
            },
            trigger: null,
          });

        setNotifications((prev) =>
          prev.map((n) =>
            n.id === localNotificationId
              ? { ...n, sourceNotificationId: nativeNotificationId }
              : n,
          ),
        );
      })().catch(() => {});
    },
    [appendNotification, settings.notificationsEnabled],
  );

  useEffect(() => {
    if (!hydrated || !settings.notificationsEnabled) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    const handleRealtimeNotification = (
      notification: RealtimeAppNotification,
    ) => {
      addNotification(notification);

      if (notification.type === "new_sermon") {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
          void refreshSermons(true);
        }, 300);
      }
    };

    void subscribeToRealtimeNotifications(handleRealtimeNotification).then(
      (unsubscribe) => {
        if (cancelled) unsubscribe();
        else cleanup = unsubscribe;
      },
    );

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      cleanup?.();
    };
  }, [
    addNotification,
    hydrated,
    refreshSermons,
    settings.notificationsEnabled,
  ]);

  const markAsRead = useCallback((id: string) => {
    let nativeNotificationId: string | undefined;

    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          nativeNotificationId = n.sourceNotificationId;
          return { ...n, read: true };
        }
        return n;
      }),
    );

    if (nativeNotificationId) {
      void Notifications.dismissNotificationAsync(nativeNotificationId).catch(
        () => {},
      );
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      if (prev.every((n) => n.read)) {
        return prev;
      }
      return prev.map((n) => ({ ...n, read: true }));
    });
    void Notifications.dismissAllNotificationsAsync().catch(() => {});
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    void Notifications.dismissAllNotificationsAsync().catch(() => {});
  }, []);

  const contextValue = useMemo(
    () => ({
      notifications,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearAll,
    }),
    [notifications, addNotification, markAsRead, markAllAsRead, clearAll],
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context)
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  return context;
};
