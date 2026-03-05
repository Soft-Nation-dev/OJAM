import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AboutScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  const cardBackground =
    colorScheme === "dark" ? Colors.dark.background : "#ffffff";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO SECTION */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: cardBackground,
              borderColor: theme.tint,
            },
          ]}
        >
          <ThemedText
            type="title"
            style={[styles.title, { color: theme.tint }]}
          >
            About Ojam
          </ThemedText>

          <ThemedText type="default" style={styles.body}>
            Ojam is your digital sanctuary for streaming and downloading
            transformative messages from Pst. Oluchi Japhat Aniagwu. Built with
            simplicity and purpose in mind, Ojam helps you stay spiritually
            nourished wherever life takes you.
          </ThemedText>

          <ThemedText type="default" style={styles.body}>
            Whether you&apos;re commuting, working, studying, or resting, Ojam
            keeps the Word within reach, making it easy to grow, reflect, and
            stay connected to God&apos;s voice daily.
          </ThemedText>
        </View>

        {/* WHAT YOU CAN DO */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: cardBackground,
              borderColor: theme.tint,
            },
          ]}
        >
          <ThemedText
            type="subtitle"
            style={[styles.sectionTitle, { color: theme.tint }]}
          >
            What You Can Do
          </ThemedText>

          <ThemedText style={styles.body}>
            • Stream sermons instantly with optimized audio quality.{"\n"}•
            Download messages for offline listening.{"\n"}• Create and manage
            personalized playlists.{"\n"}• Discover trending and recommended
            series.{"\n"}• Adjust playback speed to match your pace.{"\n"}•
            Receive push and email updates for new releases.
          </ThemedText>
        </View>

        {/* VISION */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: cardBackground,
              borderColor: theme.tint,
            },
          ]}
        >
          <ThemedText
            type="subtitle"
            style={[styles.sectionTitle, { color: theme.tint }]}
          >
            Our Vision
          </ThemedText>

          <ThemedText style={styles.body}>
            To leverage technology as a bridge, connecting believers to
            life-changing teachings that inspire growth, strengthen faith, and
            empower purpose.
          </ThemedText>

          <ThemedText style={styles.body}>
            We believe spiritual growth should be accessible, seamless, and
            beautifully designed. Ojam exists to make that experience possible.
          </ThemedText>
        </View>
        <View style={styles.versionContainer}>
          <ThemedText style={styles.versionText}>Version {"1.0.0"}</ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 18,
    alignItems: "center",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1.2,
    padding: 18,
    marginBottom: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 480,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 18,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  body: {
    fontSize: 15.5,
    lineHeight: 24,
    marginBottom: 10,
    textAlign: "center",
    opacity: 0.85,
  },

  versionContainer: {
    marginTop: 18,
    alignItems: "center",
  },

  versionText: {
    fontSize: 13,
    opacity: 0.5,
  },
});
