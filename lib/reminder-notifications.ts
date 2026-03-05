import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const REMINDER_STORAGE_KEY = "@scheduled_reminders_v1";
const REMINDER_CHANNEL_ID = "service-reminders";

type ReminderMap = Record<string, string>;

let initialized = false;

function toExpoWeekday(jsWeekday: number) {
  // JS: 0=Sunday ... 6=Saturday
  // Expo trigger: 1=Sunday ... 7=Saturday
  return jsWeekday === 0 ? 1 : jsWeekday + 1;
}

async function getReminderMap(): Promise<ReminderMap> {
  const raw = await AsyncStorage.getItem(REMINDER_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as ReminderMap;
    return parsed ?? {};
  } catch {
    return {};
  }
}

async function saveReminderMap(map: ReminderMap) {
  await AsyncStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(map));
}

export async function initializeReminderNotifications() {
  if (initialized) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: "Service Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2063FA",
    });
  }

  initialized = true;
}

export async function ensureReminderPermission() {
  await initializeReminderNotifications();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function isReminderScheduled(reminderKey: string) {
  const map = await getReminderMap();
  return Boolean(map[reminderKey]);
}

export async function scheduleWeeklyReminder(params: {
  reminderKey: string;
  title: string;
  body: string;
  weekday: number; // JS weekday: 0=Sun..6=Sat
  hour?: number;
  minute?: number;
}) {
  const { reminderKey, title, body, weekday, hour = 8, minute = 0 } = params;

  if (weekday < 0 || weekday > 6) {
    throw new Error("Invalid weekday for reminder");
  }

  const hasPermission = await ensureReminderPermission();
  if (!hasPermission) return { ok: false as const, reason: "permission" };

  const map = await getReminderMap();

  if (map[reminderKey]) {
    return { ok: true as const, id: map[reminderKey], alreadyScheduled: true };
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: { reminderKey },
      ...(Platform.OS === "android" ? { channelId: REMINDER_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: toExpoWeekday(weekday),
      hour,
      minute,
    },
  });

  map[reminderKey] = notificationId;
  await saveReminderMap(map);

  return { ok: true as const, id: notificationId, alreadyScheduled: false };
}

export async function cancelReminder(reminderKey: string) {
  const map = await getReminderMap();
  const id = map[reminderKey];
  if (!id) return;

  await Notifications.cancelScheduledNotificationAsync(id);
  delete map[reminderKey];
  await saveReminderMap(map);
}

export async function presentReminderConfirmation(title: string, body: string) {
  await initializeReminderNotifications();

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: { type: "reminder_confirmation" },
      ...(Platform.OS === "android" ? { channelId: REMINDER_CHANNEL_ID } : {}),
    },
    trigger: null,
  });
}
