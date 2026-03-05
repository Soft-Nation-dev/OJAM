import { ThemedText } from "@/components/themed-text";
import { useNotifications } from "@/hooks/use-notifications";
import {
  cancelReminder,
  isReminderScheduled,
  presentReminderConfirmation,
  scheduleWeeklyReminder,
} from "@/lib/reminder-notifications";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useState } from "react";
import {
  Dimensions,
  ImageBackground,
  Platform,
  ScrollView,
  StyleSheet,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const cardWidth = width * 0.8;

interface ReminderCardProps {
  reminderKey: string;
  title: string;
  service: string;
  weekday: number;
  date: Date;
  backgroundImage: any;
}

const ReminderCard: React.FC<ReminderCardProps> = ({
  reminderKey,
  title,
  service,
  weekday,
  date,
  backgroundImage,
}) => {
  const { addNotification } = useNotifications();
  const [reminderSet, setReminderSet] = useState(false);
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    let active = true;

    const hydrate = async () => {
      const scheduled = await isReminderScheduled(reminderKey);
      if (active) setReminderSet(scheduled);
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, [reminderKey]);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

  const formatDetailedDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const showNativeToast = (message: string, long = false) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, long ? ToastAndroid.LONG : ToastAndroid.SHORT);
    }
  };

  const handleSetReminder = async () => {
    if (busy) return;
    setBusy(true);

    try {
      if (reminderSet) {
        await cancelReminder(reminderKey);
        setReminderSet(false);
        addNotification(
          {
            title: "Reminder Canceled",
            message: `Reminder canceled for ${service} (${formatDetailedDate(date)} at 8:00 AM)`,
            type: "reminder",
          },
          { mirrorToSystem: false },
        );
        await presentReminderConfirmation(
          "Reminder Canceled",
          `${service} reminder for ${formatDetailedDate(date)} at 8:00 AM has been canceled.`,
        );
        showNativeToast(`${service} reminder canceled`);
        return;
      }

      const result = await scheduleWeeklyReminder({
        reminderKey,
        title: `${service} Reminder`,
        body: `${title} is scheduled for ${formatDetailedDate(date)} at 8:00 AM. This reminder repeats weekly.`,
        weekday,
        hour: 8,
        minute: 0,
      });

      if (!result.ok) {
        showNativeToast("Notification permission is required", true);
        return;
      }

      setReminderSet(true);
      addNotification(
        {
          title: "Reminder Set",
          message: `Reminder set for ${service} on ${formatDetailedDate(date)} at 8:00 AM (repeats weekly).`,
          type: "reminder",
        },
        { mirrorToSystem: false },
      );
      await presentReminderConfirmation(
        "Reminder Set Successfully",
        `${service} reminder scheduled for ${formatDetailedDate(date)} at 8:00 AM (repeats weekly).`,
      );
      showNativeToast(
        result.alreadyScheduled
          ? `${service} reminder already set`
          : `${service} reminder set`,
      );
    } catch (error: any) {
      const message = error?.message
        ? `Failed to set reminder: ${error.message}`
        : "Failed to set reminder";
      showNativeToast(message, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.cardContainer}>
      <ImageBackground
        source={backgroundImage}
        style={styles.cardBackground}
        imageStyle={styles.cardImage}
      >
        <View style={styles.cardContent}>
          {/* TOP CONTENT */}
          <View>
            <ThemedText style={styles.serviceText}>{service}</ThemedText>
            <View style={styles.topLeft}>
              <MaterialIcons name="live-tv" size={20} color="#fff" />
              <ThemedText type="defaultSemiBold" style={styles.titleText}>
                {title}
              </ThemedText>
            </View>

            <View style={styles.dateContainer}>
              <MaterialIcons name="event" size={20} color="#fff" />
              <ThemedText style={styles.dateText}>
                {formatDate(date)}
              </ThemedText>
            </View>
          </View>

          {/* BUTTON */}
          <TouchableOpacity
            style={styles.reminderButton}
            onPress={handleSetReminder}
            disabled={busy}
          >
            <ThemedText type="defaultSemiBold" style={styles.buttonText}>
              {busy
                ? "Please wait..."
                : reminderSet
                  ? "Cancel Reminder"
                  : "Set a Reminder"}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
};

// Utility to get next occurrence of a weekday (0=Sunday, 2=Tuesday, 5=Friday)
function getNextWeekdayDate(weekday: number, fromDate = new Date()) {
  const date = new Date(fromDate);
  date.setHours(0, 0, 0, 0);
  const diff = (weekday + 7 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + diff);
  return date;
}

// Always get the next Sunday, Tuesday, and Friday from today
const today = new Date();
const nextSunday = getNextWeekdayDate(0, today);
const nextTuesday = getNextWeekdayDate(2, today);
const nextFriday = getNextWeekdayDate(5, today);

const reminders = [
  {
    reminderKey: "sunday_service",
    title: "Listen live on YouTube",
    service: "SUNDAY SERVICE",
    weekday: 0,
    date: nextSunday,
    backgroundImage: require("@/assets/images/test-background-1.jpg"),
  },
  {
    reminderKey: "tuesday_service",
    title: "Listen live on YouTube",
    service: "TUESDAY SERVICE",
    weekday: 2,
    date: nextTuesday,
    backgroundImage: require("@/assets/images/second image.jpg"),
  },
  {
    reminderKey: "friday_service",
    title: "Listen live on YouTube",
    service: "FRIDAY SERVICE",
    weekday: 5,
    date: nextFriday,
    backgroundImage: require("@/assets/images/test-background-2.jpg"),
  },
];

const Reminder: React.FC = () => {
  // Sort reminders in ascending order by date
  const displayReminders = [...reminders].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  return (
    <View>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.subheading}>
          UPCOMING PROGRAMS
        </ThemedText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {displayReminders.map((item, index) => (
          <ReminderCard
            key={index}
            reminderKey={item.reminderKey}
            title={item.title}
            service={item.service}
            weekday={item.weekday}
            date={item.date}
            backgroundImage={item.backgroundImage}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 6,
  },
  subheading: {
    fontSize: 18,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  cardContainer: {
    width: cardWidth + 25,
    marginRight: 15,
  },
  cardBackground: {
    width: "100%",
    height: 240,
    borderRadius: 12,
    overflow: "hidden",
  },
  cardImage: {
    borderRadius: 12,
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  topLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleText: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 8,
  },
  serviceText: {
    color: "#E5E7EB",
    fontSize: 16,
    marginTop: 6,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  dateText: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 6,
  },
  reminderButton: {
    backgroundColor: "#2063FA",
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
  },
});

export default Reminder;
