import { SeeAllCard } from "@/components/see-all-card";
import { SermonRowCard } from "@/components/sermon-row-card";
import { ThemedText } from "@/components/themed-text";
import { Sermon } from "@/types/sermon";
import React from "react";
import { StyleSheet, View } from "react-native";

interface LatestMessagesProps {
  sermons: Sermon[];
  onSermonPress: (sermon: Sermon) => void;
  onSeeAllPress?: () => void;
  totalCount?: number;
}

const LatestMessages: React.FC<LatestMessagesProps> = ({
  sermons,
  onSermonPress,
  onSeeAllPress,
  totalCount,
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Latest Messages
        </ThemedText>
      </View>
      <View style={styles.sermonList}>
        {sermons.length === 0 ? (
          <ThemedText type="default" style={styles.emptyState}>
            No sermons yet.
          </ThemedText>
        ) : (
          sermons.map((sermon) => (
            <SermonRowCard
              key={sermon.id}
              sermon={sermon}
              onPress={() => onSermonPress(sermon)}
            />
          ))
        )}
        {onSeeAllPress && (
          <SeeAllCard
            title="See all messages"
            subtitle="Browse the full library"
            count={totalCount}
            onPress={onSeeAllPress}
            size="full"
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  sermonList: {
    gap: 0,
  },
  emptyState: {
    paddingHorizontal: 16,
    opacity: 0.7,
  },
});

export default LatestMessages;
