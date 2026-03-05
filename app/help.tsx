import React from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function HelpScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  const handlePress = async (url: string, label: string) => {
    Alert.alert("Opening " + label, "Please wait...");
    Linking.openURL(url);
  };

  const ContactCard = ({
    title,
    description,
    url,
  }: {
    title: string;
    description: string;
    url: string;
  }) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Pressable
        onPressIn={() => (scale.value = withSpring(0.97))}
        onPressOut={() => (scale.value = withSpring(1))}
        onPress={() => handlePress(url, title)}
      >
        <Animated.View
          style={[
            styles.contactCard,
            animatedStyle,
            {
              borderColor: theme.tint,
              backgroundColor: colorScheme === "dark" ? "#23272e" : "#ffffff",
            },
          ]}
        >
          <ThemedText style={styles.contactTitle}>{title}</ThemedText>
          <ThemedText style={styles.contactText}>{description}</ThemedText>
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top", "bottom"]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: colorScheme === "dark" ? "#23272e" : "#ffffff",
              borderColor: theme.tint + "30",
            },
          ]}
        >
          <ThemedText
            type="title"
            style={[styles.title, { color: theme.tint }]}
          >
            Help & Support
          </ThemedText>

          <ThemedText style={styles.body}>
            Need assistance? We&apos;re here to make your experience smooth,
            uplifting, and stress-free. Browse common questions or contact us
            directly below.
          </ThemedText>

          {/* <ThemedText
            type="subtitle"
            style={[styles.sectionTitle, { color: theme.tint }]}
          >
            Frequently Asked Questions
          </ThemedText>

          <ThemedText style={styles.body}>
            <ThemedText style={styles.bold}>
              How do I download sermons?
            </ThemedText>
            {"\n"}
            Tap the download icon on any sermon to save it offline.
            {"\n\n"}
            <ThemedText style={styles.bold}>
              How do I create a playlist?
            </ThemedText>
            {"\n"}
            Go to Playlists and tap "+".
            {"\n\n"}
            <ThemedText style={styles.bold}>
              How do I adjust playback speed?
            </ThemedText>
            {"\n"}
            Use the speed control in the audio player.
          </ThemedText>

          <ThemedText
            type="subtitle"
            style={[styles.sectionTitle, { color: theme.tint }]}
          >
            Contact Us
          </ThemedText> */}

          <View style={styles.contactContainer}>
            <ContactCard
              title="WhatsApp"
              description="Chat with us instantly."
              url="https://wa.me/2348141787294"
            />

            <ContactCard
              title="Facebook"
              description="Send us a message."
              url="https://facebook.com/yourpage"
            />

            <ContactCard
              title="Email"
              description="support@ojamapp.com"
              url="mailto:support@ojamapp.com"
            />

            <ContactCard
              title="YouTube"
              description="Watch and stay inspired."
              url="https://youtube.com/yourchannel"
            />
          </View>
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
    padding: 4,
    alignItems: "center",
    textAlign: "center",
  },

  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    width: "100%",
    maxWidth: 520,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 14,
    textAlign: "center",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 26,
    marginBottom: 12,
  },

  body: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 10,
    opacity: 0.9,
  },

  bold: {
    fontWeight: "600",
  },

  contactContainer: {
    marginTop: 12,
    gap: 14,
  },

  contactCard: {
    borderWidth: 1.2,
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },

  contactTitle: {
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 4,
  },

  contactText: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.7,
  },
});
