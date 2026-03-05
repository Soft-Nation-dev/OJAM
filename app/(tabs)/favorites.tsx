import { router, useFocusEffect } from "expo-router";
import React from "react";
import { BackHandler, FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SermonRowCard } from "@/components/sermon-row-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFavorites } from "@/hooks/use-favorites";

export default function FavoritesScreen() {
  const { favoriteSermons = [], loading } = useFavorites();
  const { playFromList } = useAudioPlayer();

  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        router.replace("/library");
        return true;
      };

      const sub = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => sub.remove();
    }, []),
  );

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ThemedText style={[styles.title, { color: themeColors.text }]}>
          Favorites
        </ThemedText>

        <FlatList
          style={styles.scrollView}
          data={favoriteSermons}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? (
              <ThemedText
                style={[styles.loadingText, { color: themeColors.text }]}
              >
                Loading favorites...
              </ThemedText>
            ) : (
              <ThemedText
                style={[styles.emptyText, { color: themeColors.text }]}
              >
                No favorites yet.
              </ThemedText>
            )
          }
          renderItem={({ item: sermon }) => (
            <SermonRowCard
              sermon={sermon}
              onPress={async () => {
                playFromList(favoriteSermons, sermon.id);
                router.push("/player");
              }}
            />
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 32, fontWeight: "bold", margin: 16, paddingTop: 3 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  loadingText: { marginTop: 32, textAlign: "center" },
  emptyText: { marginTop: 32, textAlign: "center", opacity: 0.7 },
});
