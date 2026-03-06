import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect, useRouter } from "expo-router";
import React from "react";
import {
    BackHandler,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SermonRowCard } from "@/components/sermon-row-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useDownloadsContext } from "@/contexts/DownloadsContext";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function DownloadsScreen() {
  const {
    downloadedSermons = [],
    loading,
    loadDownloads,
    getProgress,
    startDownload,
    cancelDownload,
  } = useDownloadsContext();

  const { playFromList } = useAudioPlayer();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];

  React.useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

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
    }, [router]),
  );

  const downloadsInProgress =
    downloadedSermons?.filter((item) => {
      const status = getProgress(item.sermon.id)?.status;
      return status === "downloading" || status === "pending";
    }).length ?? 0;

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ThemedText style={[styles.title, { color: themeColors.text }]}>
          Downloads
        </ThemedText>

        {/* Counts */}
        <View style={{ marginLeft: 16, marginBottom: 8 }}>
          <ThemedText
            style={{
              fontSize: 16,
              fontWeight: "bold",
              color: themeColors.text,
            }}
          >
            {downloadedSermons.length} messages downloaded
          </ThemedText>

          {downloadsInProgress > 0 && (
            <ThemedText
              style={{
                fontSize: 15,
                color: themeColors.tint,
                marginTop: 2,
              }}
            >
              {downloadsInProgress} message
              {downloadsInProgress > 1 ? "s" : ""} downloading
            </ThemedText>
          )}
        </View>

        <FlatList
          style={styles.scrollView}
          data={downloadedSermons}
          keyExtractor={(item) => item.sermon.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? (
              <ThemedText
                style={[styles.loadingText, { color: themeColors.text }]}
              >
                Loading downloads...
              </ThemedText>
            ) : (
              <ThemedText
                style={[styles.emptyText, { color: themeColors.text }]}
              >
                No downloads yet.
              </ThemedText>
            )
          }
          renderItem={({ item }) => {
            const sermon = {
              ...item.sermon,
              localPath: item.localPath,
            };

            const progress = getProgress(sermon.id);
            const downloading =
              progress?.status === "downloading" ||
              progress?.status === "pending";
            const isError = progress?.status === "error";

            return (
              <View style={{ marginBottom: 16 }}>
                <SermonRowCard
                  sermon={sermon}
                  onPress={async () => {
                    if (isError) {
                      await startDownload(sermon);
                      return;
                    }

                    if (downloading) {
                      await cancelDownload(sermon.id);
                      return;
                    }

                    void playFromList(
                      downloadedSermons.map((item) => ({
                        ...item.sermon,
                        localPath: item.localPath,
                      })),
                      sermon.id,
                    )
                      .then(() => {
                        router.push("/player");
                      })
                      .catch((error) => {
                        console.error(
                          "[Downloads] Failed to start playback",
                          error,
                        );
                        router.push("/player");
                      });
                  }}
                />

                {isError && (
                  <TouchableOpacity
                    style={styles.errorWrapper}
                    onPress={() => startDownload(sermon)}
                  >
                    <MaterialIcons
                      name="arrow-downward"
                      size={32}
                      color={themeColors.tabIconSelected}
                    />
                    <ThemedText
                      style={[
                        styles.errorText,
                        { color: themeColors.tabIconSelected },
                      ]}
                    >
                      Download failed. Tap to retry.
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
        {/* Up Next queue removed from downloads. Now only in player screen. */}
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

  errorWrapper: {
    marginTop: 8,
    alignItems: "center",
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
});
