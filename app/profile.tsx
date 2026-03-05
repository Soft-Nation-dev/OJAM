import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    View
} from "react-native";

export default function ProfileScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ThemedText type="title" style={styles.title}>
          Sign In Required
        </ThemedText>
        <ThemedText style={styles.info}>
          Please log in to view your profile.
        </ThemedText>
        {/* Add login/signup button or form here */}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: user.user_metadata?.avatar_url || undefined }}
          style={styles.avatar}
        />
      </View>
      <ThemedText type="title" style={styles.title}>
        Profile
      </ThemedText>
      <ThemedText style={styles.info}>
        Name: {user.user_metadata?.full_name || user.email}
      </ThemedText>
      <ThemedText style={styles.info}>Email: {user.email}</ThemedText>
      {/* Add more profile fields and edit options here */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  avatarContainer: {
    marginTop: 32,
    marginBottom: 16,
    alignItems: "center",
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#e5e7eb",
  },
  title: {
    fontSize: 24,
    marginBottom: 12,
    textAlign: "center",
  },
  info: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
  },
});
