import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import {
    StyleSheet,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { ThemedText } from "./themed-text";

interface SeeAllCardProps {
  title: string;
  subtitle?: string;
  count?: number;
  onPress: () => void;
  size?: "compact" | "full";
}

export function SeeAllCard({
  title,
  subtitle,
  count,
  onPress,
  size = "compact",
}: SeeAllCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { width } = useWindowDimensions();
  const compactSize = Math.round(width * 0.55);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        size === "full"
          ? styles.full
          : [styles.compact, { width: compactSize, height: compactSize }],
        {
          borderColor: colors.tint + "40",
          backgroundColor: colors.tint + "10",
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View
        style={[styles.orb, styles.orbTop, { backgroundColor: colors.tint }]}
      />
      <View
        style={[
          styles.orb,
          styles.orbBottom,
          { backgroundColor: colors.tabIconDefault },
        ]}
      />
      <View style={styles.content}>
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="default" style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        ) : null}
        {typeof count === "number" ? (
          <View style={styles.countPill}>
            <ThemedText type="defaultSemiBold" style={styles.countText}>
              {count}
            </ThemedText>
            <ThemedText type="default" style={styles.countLabel}>
              items
            </ThemedText>
          </View>
        ) : null}
      </View>
      <View style={styles.iconWrap}>
        <MaterialIcons name="arrow-forward" size={20} color={colors.text} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  compact: {
    marginRight: 16,
  },
  full: {
    width: "100%",
    marginTop: 12,
  },
  content: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 15,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 8,
  },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  countText: {
    fontSize: 18,
  },
  countLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  orb: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    opacity: 0.12,
  },
  orbTop: {
    top: -40,
    right: -30,
  },
  orbBottom: {
    bottom: -50,
    left: -40,
  },
});
