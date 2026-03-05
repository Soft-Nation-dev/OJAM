import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrivacyPolicyScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
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
            Privacy Policy
          </ThemedText>

          <ThemedText style={styles.meta}>
            Last updated: January 2026
          </ThemedText>

          {/* INTRO */}
          <ThemedText style={styles.body}>
            Ojam (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is
            committed to protecting your privacy. This Privacy Policy explains
            how we collect, use, and safeguard your information when you use the
            Ojam mobile application.
          </ThemedText>

          {/* INFORMATION WE COLLECT */}
          <ThemedText
            type="subtitle"
            style={[styles.sectionTitle, { color: theme.tint }]}
          >
            Information We Collect
          </ThemedText>

          <ThemedText style={styles.body}>
            • Account Information – such as your email address for account
            creation, authentication, and communication.{"\n\n"}• Usage Data –
            limited analytics data to improve performance and user experience.
            {"\n\n"}• Device Information – basic device type and app version to
            ensure compatibility and stability.
          </ThemedText>

          {/* HOW WE USE DATA */}
          <ThemedText
            type="subtitle"
            style={[styles.sectionTitle, { color: theme.tint }]}
          >
            How We Use Your Information
          </ThemedText>

          <ThemedText style={styles.body}>
            We use your information to:
            {"\n\n"}• Provide and maintain your account.{"\n"}• Enable streaming
            and downloading of content.{"\n"}• Send important service
            notifications.{"\n"}• Improve app functionality and user experience.
            {"\n"}• Prevent fraud and ensure security.
          </ThemedText>

          {/* DATA STORAGE */}
          <ThemedText
            type="subtitle"
            style={[styles.sectionTitle, { color: theme.tint }]}
          >
            Data Storage & Security
          </ThemedText>

          <ThemedText style={styles.body}>
            We implement industry-standard security measures to protect your
            data. Downloads and playlists are stored locally on your device. We
            do not sell, rent, or trade your personal information.
          </ThemedText>

          {/* THIRD PARTY */}
          <ThemedText
            type="subtitle"
            style={[styles.sectionTitle, { color: theme.tint }]}
          >
            Third-Party Services
          </ThemedText>

          <ThemedText style={styles.body}>
            Ojam may use trusted third-party services for hosting,
            authentication, analytics, and content delivery. These services only
            access information necessary to perform their functions and are
            obligated to protect your data.
          </ThemedText>

          {/* YOUR RIGHTS */}
          <ThemedText
            type="subtitle"
            style={[styles.sectionTitle, { color: theme.tint }]}
          >
            Your Rights
          </ThemedText>

          <ThemedText style={styles.body}>
            You may:
            {"\n\n"}• Access or update your account information.{"\n"}• Opt out
            of non-essential notifications.{"\n"}• Request deletion of your
            account and associated data.
          </ThemedText>

          {/* CHILDREN */}
          <ThemedText
            type="subtitle"
            style={[styles.sectionTitle, { color: theme.tint }]}
          >
            Children&apos;s Privacy
          </ThemedText>

          <ThemedText style={styles.body}>
            Ojam is not intended for children under the age of 13. We do not
            knowingly collect personal information from children.
          </ThemedText>

          {/* POLICY UPDATES */}
          <ThemedText
            type="subtitle"
            style={[styles.sectionTitle, { color: theme.tint }]}
          >
            Policy Updates
          </ThemedText>

          <ThemedText style={styles.body}>
            We may update this Privacy Policy from time to time. Changes will be
            reflected within the app along with an updated revision date.
          </ThemedText>

          {/* CONTACT */}
          <ThemedText
            type="subtitle"
            style={[styles.sectionTitle, { color: theme.tint }]}
          >
            Contact Us
          </ThemedText>

          <ThemedText style={styles.body}>
            If you have questions regarding this Privacy Policy or your data,
            please contact us at:
            {"\n\n"}
            support@ojamapp.com
          </ThemedText>
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
    padding: 24,
    alignItems: "center",
    textAlign: "center",
  },

  card: {
    borderRadius: 24,
    borderWidth: 1,
    textAlign: "center",
    padding: 8,
    width: "100%",
    maxWidth: 520,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },

  meta: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 18,
    textAlign: "center",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 26,
    marginBottom: 10,
  },

  body: {
    fontSize: 15.5,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 10,
    opacity: 0.9,
  },
});
