import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface CircularSeekBarProps {
  size: number;
  strokeWidth: number;
  progress: number;
  onSeek: (progress: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
}

export function CircularSeekBar({
  size,
  strokeWidth,
  progress,
  onSeek,
  isPlaying,
  onPlayPause,
}: CircularSeekBarProps) {
  const colorScheme = useColorScheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress * circumference);

  const center = size / 2;

  const handlePress = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const dx = locationX - center;
    const dy = locationY - center;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Only respond to touches within the ring area (between inner and outer radius)
    const innerRadius = radius - strokeWidth / 2;
    const outerRadius = radius + strokeWidth / 2;

    if (distance >= innerRadius && distance <= outerRadius) {
      const angle = Math.atan2(dy, dx);
      let progressFromAngle = (angle + Math.PI) / (2 * Math.PI);
      progressFromAngle = Math.max(0, Math.min(1, progressFromAngle));
      onSeek(progressFromAngle);
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <TouchableOpacity
        style={[styles.touchable, { width: size, height: size }]}
        onPress={handlePress}
        activeOpacity={1}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(0, 122, 255, 0.2)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#007AFF"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />
          {/* Glow effect */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#007AFF"
            strokeWidth={strokeWidth + 1}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            opacity={0.3}
          />
        </Svg>

        {/* Play/Pause button in center */}
        <TouchableOpacity
          style={[styles.playButton, { shadowColor: Colors[colorScheme ?? 'light'].tint }]}
          onPress={onPlayPause}
          activeOpacity={0.7}>
          <MaterialIcons
            name={isPlaying ? 'pause-circle-filled' : 'play-circle-filled'}
            size={32}
            color={Colors[colorScheme ?? 'light'].tint}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchable: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    position: 'absolute',
    zIndex: 1,
    shadowOffset: { width: 0, height: 5},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});