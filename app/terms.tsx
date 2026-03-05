import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TermsScreen() {
  const colorScheme = useColorScheme();
  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: Colors[colorScheme ?? "light"].background },
      ]}
      edges={["top"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <ThemedText type="title" style={styles.title}>
            Terms of Service
          </ThemedText>
          <ThemedText type="default" style={styles.body}>
            By using Ojam, you agree to use the app for personal, non-commercial
            purposes. All content is provided for spiritual growth and
            inspiration. Do not redistribute or misuse downloaded content. We
            reserve the right to update these terms as needed. Continued use of
            the app means you accept any changes.
          </ThemedText>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            User Responsibilities
          </ThemedText>
          <ThemedText type="default" style={styles.body}>
            • Respect copyright and intellectual property rights. {"\n"}• Do not
            attempt to reverse engineer or tamper with the app. {"\n"}• Use the
            app in accordance with local laws and regulations.
          </ThemedText>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Contact
          </ThemedText>
          <ThemedText type="default" style={styles.body}>
            For questions about these terms, contact us at support@ojamapp.com.
          </ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    alignItems: "center",
    width: "100%",
    maxWidth: 420,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 8,
    textAlign: "center",
  },
  body: { fontSize: 15, lineHeight: 24, marginBottom: 8, textAlign: "center" },
});
