import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useSermons } from "@/contexts/SermonsContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFavorites } from "@/hooks/use-favorites";
import { fetchSermonById } from "@/lib/sermons";
import { Sermon } from "@/types/sermon";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SermonDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { playSermon } = useAudioPlayer();
  const { sermons, loading: sermonsLoading } = useSermons();
  const { isFavorited, toggleFavorite } = useFavorites();
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [loading, setLoading] = useState(true);
  const sermonId = Array.isArray(id) ? id[0] : id;

  const showToast = (message: string, type: "success" | "info" | "error") => {
    if (Platform.OS === "android") {
      ToastAndroid.show(
        message,
        type === "error" ? ToastAndroid.LONG : ToastAndroid.SHORT,
      );
    }
  };

  useEffect(() => {
    if (!sermonId) {
      setSermon(null);
      setLoading(false);
      return;
    }

    if (sermonsLoading) {
      setLoading(true);
      return;
    }

    const load = async () => {
      const listFound = sermons.find((item) => item.id === sermonId) ?? null;

      if (!listFound) {
        const detailOnly = await fetchSermonById(sermonId);
        setSermon(detailOnly);
        setLoading(false);
        return;
      }

      if (listFound.description) {
        setSermon(listFound);
        setLoading(false);
        return;
      }

      const full = await fetchSermonById(sermonId);
      setSermon(full ?? listFound);
      setLoading(false);
    };
    void load();
  }, [sermonId, sermons, sermonsLoading]);

  const formattedDate = useMemo(() => {
    if (!sermon?.date) return "";
    return formatFullDate(sermon.date);
  }, [sermon?.date]);

  const handleToggleFavorite = async () => {
    if (!sermon) return;
    const wasFavorited = isFavorited(sermonId);
    const success = await toggleFavorite(sermon);

    if (success) {
      showToast(
        wasFavorited ? "Removed from favorites" : "Added to favorites",
        "success",
      );
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="default">Loading...</ThemedText>
      </ThemedView>
    );
  }

  if (!sermon) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="default">Sermon not found.</ThemedText>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ThemedText type="default">Go back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

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
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Sermon Details
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Profile Picture */}
          <View style={styles.centeredSection}>
            {sermon.imageUrl ? (
              <ExpoImage
                source={{ uri: sermon.imageUrl }}
                style={styles.detailsImage}
                contentFit="cover"
                cachePolicy="disk"
                recyclingKey={`sermon-detail-artwork-${sermon.id}`}
              />
            ) : (
              <View
                style={[
                  styles.detailsImage,
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].tint + "20",
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <MaterialIcons
                  name="headphones"
                  size={60}
                  color={Colors[colorScheme ?? "light"].tint}
                />
              </View>
            )}
          </View>

          {/* Meta Information */}
          <View style={[styles.detailsMeta, styles.centeredSection]}>
            <View style={styles.metaItem}>
              <MaterialIcons
                name="schedule"
                size={20}
                color={Colors[colorScheme ?? "light"].text}
              />
              <ThemedText type="default" style={styles.metaText}>
                {formatDuration(sermon.duration)}
              </ThemedText>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons
                name="play-circle-outline"
                size={20}
                color={Colors[colorScheme ?? "light"].text}
              />
              <ThemedText type="default" style={styles.metaText}>
                {sermon.plays?.toLocaleString() || "N/A"}
              </ThemedText>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons
                name="category"
                size={20}
                color={Colors[colorScheme ?? "light"].text}
              />
              <ThemedText type="default" style={styles.metaText}>
                {sermon.category || "General"}
              </ThemedText>
            </View>
            <View style={styles.metaItem}>
              <TouchableOpacity onPress={handleToggleFavorite}>
                {isFavorited(sermonId) ? (
                  <MaterialIcons name="favorite" size={20} color="#FF6B6B" />
                ) : (
                  <View style={styles.favoriteOutlineStack}>
                    <MaterialIcons
                      name="favorite-outline"
                      size={22}
                      color="#000000"
                      style={styles.favoriteOutlineBack}
                    />
                    <MaterialIcons
                      name="favorite-outline"
                      size={20}
                      color="#FFFFFF"
                      style={styles.favoriteOutlineFront}
                    />
                  </View>
                )}
              </TouchableOpacity>
              <ThemedText type="default" style={styles.metaText}>
                {sermon.favorites ?? 0}
              </ThemedText>
            </View>
          </View>

          {/* Title */}
          <View style={styles.centeredSection}>
            <ThemedText type="title" style={styles.detailsTitle}>
              {sermon.title}
            </ThemedText>
          </View>

          <TouchableOpacity
            style={styles.playButton}
            onPress={() => {
              playSermon(sermon);
              router.push("/player");
            }}
          >
            <MaterialIcons name="play-arrow" size={22} color="#FFFFFF" />
            <ThemedText type="defaultSemiBold" style={styles.playButtonText}>
              Play Sermon
            </ThemedText>
          </TouchableOpacity>

          {/* Preacher Section */}
          <View style={styles.detailsInfoSection}>
            <ThemedText type="default" style={styles.detailsInfoLabel}>
              Preacher
            </ThemedText>
            <ThemedText type="default" style={styles.detailsInfoValue}>
              {sermon.preacher}
            </ThemedText>
          </View>

          {/* Production Date Section */}
          <View style={styles.detailsInfoSection}>
            <ThemedText type="default" style={styles.detailsInfoLabel}>
              Production Date
            </ThemedText>
            <ThemedText type="default" style={styles.detailsInfoValue}>
              {formattedDate}
            </ThemedText>
          </View>

          {/* Genre */}
          {sermon.genre ? (
            <View style={styles.detailsInfoSection}>
              <ThemedText type="default" style={styles.detailsInfoLabel}>
                Genre
              </ThemedText>
              <ThemedText type="default" style={styles.detailsGenre}>
                {sermon.genre}
              </ThemedText>
            </View>
          ) : null}

          {/* Description */}
          {sermon.description ? (
            <ThemedText type="default" style={styles.detailsDescription}>
              {sermon.description}
            </ThemedText>
          ) : null}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const formatDuration = (seconds: number) => {
  if (!seconds || seconds <= 0) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

const formatFullDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString("default", { month: "long" });
  const year = date.getFullYear();

  const getDaySuffix = (value: number) => {
    if (value > 3 && value < 21) return "th";
    switch (value % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  return `${day}${getDaySuffix(day)} of ${month} ${year}`;
};

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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
  },
  headerSpacer: {
    width: 40,
  },
  iconButton: {
    padding: 8,
  },
  backButton: {
    marginTop: 16,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  centeredSection: {
    alignItems: "center",
    width: "100%",
  },
  detailsImage: {
    width: "90%",
    height: 400,
    borderRadius: 12,
    marginBottom: 20,
    alignSelf: "center",
  },
  detailsMeta: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    marginBottom: 20,
    paddingHorizontal: 10,
    gap: 12,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    opacity: 0.8,
  },
  detailsTitle: {
    fontSize: 20,
    marginBottom: 16,
    textAlign: "center",
  },
  detailsInfoSection: {
    width: "100%",
    marginBottom: 16,
  },
  detailsInfoLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  detailsInfoValue: {
    fontSize: 16,
  },
  detailsGenre: {
    fontSize: 14,
    opacity: 0.8,
  },
  detailsDescription: {
    fontSize: 16,
    marginTop: 16,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    marginBottom: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#2063FA",
  },
  playButtonText: {
    color: "#FFFFFF",
  },
  favoriteOutlineStack: {
    width: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteOutlineBack: {
    position: "absolute",
  },
  favoriteOutlineFront: {
    position: "absolute",
  },
});
