import { SermonRowCard } from "@/components/sermon-row-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useSermons } from "@/contexts/SermonsContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RelatedSermonsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { playFromList } = useAudioPlayer();
  const { sermons, loading } = useSermons();
  const sermonId = Array.isArray(id) ? id[0] : id;

  const resolvedBaseSermon = useMemo(
    () => sermons.find((item) => item.id === sermonId) ?? null,
    [sermonId, sermons],
  );

  const relatedSermons = useMemo(() => {
    if (!resolvedBaseSermon?.genre) {
      return [];
    }

    return sermons.filter(
      (item) =>
        item.genre === resolvedBaseSermon.genre &&
        item.id !== resolvedBaseSermon.id,
    );
  }, [resolvedBaseSermon, sermons]);

  const subtitle = useMemo(() => {
    if (resolvedBaseSermon?.genre) return resolvedBaseSermon.genre;
    return "No genre available";
  }, [resolvedBaseSermon]);

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: Colors[colorScheme ?? "light"].background },
      ]}
      edges={["top"]}
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.iconButton}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={Colors[colorScheme ?? "light"].text}
            />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <ThemedText type="subtitle" style={styles.headerTitle}>
              More messages like this
            </ThemedText>
            <ThemedText type="default" style={styles.headerSubtitle}>
              {subtitle}
            </ThemedText>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <FlatList
          data={loading ? [] : relatedSermons}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: sermon }) => (
            <SermonRowCard
              sermon={sermon}
              onPress={() => {
                playFromList(relatedSermons, sermon.id);
                router.push("/player");
              }}
            />
          )}
          ListEmptyComponent={
            loading ? (
              <ThemedText type="default">Loading...</ThemedText>
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons
                  name="queue-music"
                  size={44}
                  color={Colors[colorScheme ?? "light"].tabIconDefault}
                />
                <ThemedText type="default" style={styles.emptyText}>
                  No related messages found.
                </ThemedText>
              </View>
            )
          }
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
  },
  headerSubtitle: {
    fontSize: 13,
    opacity: 0.7,
  },
  headerSpacer: {
    width: 40,
  },
  iconButton: {
    padding: 8,
  },
  content: {
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 12,
    opacity: 0.7,
  },
});
