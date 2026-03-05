import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { DownloadProgress } from "@/lib/download-service";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import {
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { ThemedText } from "./themed-text";

interface DownloadButtonProps {
  isDownloaded: boolean;
  isDownloading: boolean;
  progress?: DownloadProgress;
  onDownload: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

export function DownloadButton({
  isDownloaded,
  isDownloading,
  progress,
  onDownload,
  onCancel,
  onDelete,
  compact = false,
}: DownloadButtonProps) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];

  if (isDownloaded) {
    // Show downloaded state
    return (
      <TouchableOpacity
        style={[
          styles.button,
          compact && styles.buttonCompact,
          { backgroundColor: themeColors.tint + "20" },
        ]}
        onPress={onDelete}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="check-circle"
          size={compact ? 16 : 20}
          color={themeColors.tint}
        />
        {!compact && (
          <ThemedText style={[styles.text, { color: themeColors.tint }]}>
            Downloaded
          </ThemedText>
        )}
      </TouchableOpacity>
    );
  }

  if (isDownloading && progress) {
    // Show downloading state with progress
    const progressPercent = progress.progress || 0;

    return (
      <View
        style={[
          styles.progressContainer,
          compact && styles.progressContainerCompact,
          { backgroundColor: themeColors.tint + "10" },
        ]}
      >
        <View style={styles.progressContent}>
          <ActivityIndicator
            size={compact ? "small" : "small"}
            color={themeColors.tint}
          />
          {!compact && (
            <ThemedText
              style={[styles.progressText, { color: themeColors.tint }]}
            >
              Downloading... {progressPercent}%
            </ThemedText>
          )}
          {compact && (
            <ThemedText
              style={[
                styles.progressText,
                styles.progressTextCompact,
                { color: themeColors.tint },
              ]}
            >
              {progressPercent}%
            </ThemedText>
          )}
        </View>

        {!compact && (
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: themeColors.tint + "30" },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressPercent}%`,
                    backgroundColor: themeColors.tint,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {onCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            hitSlop={8}
          >
            <MaterialIcons
              name="close"
              size={compact ? 14 : 16}
              color={themeColors.text}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Show download button
  return (
    <TouchableOpacity
      style={[styles.button, compact && styles.buttonCompact]}
      onPress={onDownload}
      activeOpacity={0.7}
    >
      <MaterialIcons
        name="download"
        size={compact ? 16 : 20}
        color={themeColors.text}
      />
      {!compact && <ThemedText style={styles.text}>Download</ThemedText>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  buttonCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
  },
  progressContainer: {
    position: "relative",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 160,
  },
  progressContainerCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
  },
  progressContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressTextCompact: {
    fontSize: 10,
  },
  progressBarContainer: {
    marginTop: 6,
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  cancelButton: {
    position: "absolute",
    top: 4,
    right: 4,
    padding: 4,
  },
});
