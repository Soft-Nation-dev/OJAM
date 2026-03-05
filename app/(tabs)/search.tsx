import { SermonCard } from "@/components/sermon-card";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useDownloadsContext } from "@/contexts/DownloadsContext";
import { useSermons } from "@/contexts/SermonsContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  BackHandler,
  FlatList,
  Keyboard,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SearchScreen() {
  const { downloadedSermons } = useDownloadsContext();
  const { sermons } = useSermons();
  const colorScheme = useColorScheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const typingTimeout = useRef<NodeJS.Timeout | number | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const { height } = useWindowDimensions();

  const searchableSermons = useMemo(() => {
    const downloaded = downloadedSermons.map((item) => item.sermon);
    const downloadedIds = new Set(downloaded.map((item) => item.id));
    return [...downloaded, ...sermons.filter((s) => !downloadedIds.has(s.id))];
  }, [downloadedSermons, sermons]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, []);

  const normalizedQuery = useMemo(
    () => searchQuery.trim().toLowerCase(),
    [searchQuery],
  );

  const filteredSermons = useMemo(() => {
    if (!normalizedQuery) return [];

    return searchableSermons.filter(
      (sermon) =>
        sermon.title.toLowerCase().includes(normalizedQuery) ||
        sermon.preacher.toLowerCase().includes(normalizedQuery) ||
        sermon.category?.toLowerCase().includes(normalizedQuery),
    );
  }, [normalizedQuery, searchableSermons]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Debounce saving to history: only save if user stops typing for 3 seconds
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    if (query.trim().length > 0) {
      typingTimeout.current = setTimeout(() => {
        addToHistory(query);
      }, 3000);
    }
  };

  const shouldDock = useMemo(
    () => isInputFocused || searchQuery.trim().length > 0,
    [isInputFocused, searchQuery],
  );

  const heroOffset = useMemo(
    () =>
      focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [Math.min(180, height * 0.18), 0],
      }),
    [focusAnim, height],
  );
  const heroHeight = useMemo(
    () =>
      focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [Math.min(360, height * 0.4), 160],
      }),
    [focusAnim, height],
  );
  const historyOpacity = useMemo(
    () =>
      focusAnim.interpolate({
        inputRange: [0, 0.6, 1],
        outputRange: [1, 0.2, 0],
      }),
    [focusAnim],
  );

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: shouldDock ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [focusAnim, shouldDock]);

  const addToHistory = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearchHistory((prev) => {
      const next = [trimmed, ...prev.filter((item) => item !== trimmed)];
      return next.slice(0, 5);
    });
  };

  const handleSubmit = () => {
    addToHistory(searchQuery);
  };

  const handleHistoryPress = (query: string) => {
    setSearchQuery(query);
    // Immediately save to history when a chip is clicked
    addToHistory(query);
    handleSearch(query);
    setIsInputFocused(true);
    inputRef.current?.focus();
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (!isKeyboardVisible && (searchQuery.length > 0 || isInputFocused)) {
          setSearchQuery("");
          setIsInputFocused(false);
          inputRef.current?.blur();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, [isKeyboardVisible, searchQuery.length, isInputFocused]),
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: Colors[colorScheme ?? "light"].background },
      ]}
      edges={["top"]}
    >
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />
      <Animated.View style={[styles.heroWrap, { height: heroHeight }]}>
        <View style={styles.heroBackground} pointerEvents="none">
          <View
            style={[
              styles.heroBlob,
              styles.heroBlobLeft,
              { backgroundColor: Colors[colorScheme ?? "light"].tint + "20" },
            ]}
          />
          <View
            style={[
              styles.heroBlob,
              styles.heroBlobRight,
              { backgroundColor: Colors[colorScheme ?? "light"].tint + "12" },
            ]}
          />
        </View>
        <Animated.View
          style={[
            styles.hero,
            {
              marginTop: heroOffset,
            },
          ]}
        >
          <ThemedText type="title" style={styles.title}>
            Search
          </ThemedText>
          <ThemedText type="default" style={styles.subtitle}>
            Find messages and series
          </ThemedText>
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: Colors[colorScheme ?? "light"].background,
                borderColor:
                  Colors[colorScheme ?? "light"].tabIconDefault + "30",
              },
            ]}
          >
            <IconSymbol
              name="magnifyingglass"
              size={20}
              color={Colors[colorScheme ?? "light"].tabIconDefault}
              style={styles.searchIcon}
            />
            <TextInput
              ref={inputRef}
              style={[
                styles.searchInput,
                {
                  color: Colors[colorScheme ?? "light"].text,
                },
              ]}
              placeholder="Search sermons, preachers..."
              placeholderTextColor={
                Colors[colorScheme ?? "light"].tabIconDefault
              }
              value={searchQuery}
              onChangeText={handleSearch}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onSubmitEditing={handleSubmit}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <IconSymbol
                  name="xmark.circle.fill"
                  size={20}
                  color={Colors[colorScheme ?? "light"].tabIconDefault}
                />
              </TouchableOpacity>
            )}
          </View>

          {searchQuery.length === 0 && (
            <Animated.View
              style={[styles.heroSection, { opacity: historyOpacity }]}
            >
              <View style={styles.sectionHeaderRow}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Recent searches
                </ThemedText>
                {searchHistory.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchHistory([])}
                    style={styles.clearHistory}
                  >
                    <ThemedText type="default" style={styles.clearHistoryText}>
                      Clear
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
              {searchHistory.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <MaterialIcons
                    name="history"
                    size={28}
                    color={Colors[colorScheme ?? "light"].tabIconDefault}
                  />
                  <ThemedText type="default" style={styles.emptyHistoryText}>
                    Your recent searches will show here.
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.historyList}>
                  {searchHistory.slice(0, 5).map((item, index) => (
                    <TouchableOpacity
                      key={`${item}-${index}`}
                      style={[
                        styles.historyChip,
                        {
                          borderColor:
                            Colors[colorScheme ?? "light"].tabIconDefault +
                            "30",
                          backgroundColor:
                            Colors[colorScheme ?? "light"].background,
                        },
                      ]}
                      onPress={() => handleHistoryPress(item)}
                    >
                      <MaterialIcons
                        name="history"
                        size={16}
                        color={Colors[colorScheme ?? "light"].tabIconDefault}
                      />
                      <ThemedText type="default" style={styles.historyText}>
                        {item}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Animated.View>
          )}
        </Animated.View>
      </Animated.View>

      <FlatList
        style={styles.scrollView}
        data={searchQuery.length > 0 ? filteredSermons : []}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          searchQuery.length > 0 && filteredSermons.length > 0 ? (
            <View style={styles.resultsContainer}>
              <ThemedText type="subtitle" style={styles.resultsTitle}>
                {filteredSermons.length} result
                {filteredSermons.length !== 1 ? "s" : ""} found
              </ThemedText>
            </View>
          ) : null
        }
        ListEmptyComponent={
          searchQuery.length > 0 ? (
            <View style={styles.emptyState}>
              <ThemedText type="default" style={styles.emptyText}>
                No sermons found
              </ThemedText>
            </View>
          ) : null
        }
        renderItem={({ item: sermon }) => (
          <View style={styles.resultsContainer}>
            <SermonCard
              sermon={sermon}
              onPress={() => router.push(`/sermon/${sermon.id}` as any)}
            />
          </View>
        )}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroWrap: {
    minHeight: 160,
    paddingHorizontal: 16,
    justifyContent: "flex-start",
  },
  heroBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  heroBlob: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  heroBlobLeft: {
    top: -60,
    left: -80,
  },
  heroBlobRight: {
    bottom: -90,
    right: -70,
  },
  hero: {
    alignItems: "center",
    gap: 10,
  },
  heroSection: {
    alignSelf: "stretch",
    marginTop: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  clearHistory: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearHistoryText: {
    fontSize: 13,
    opacity: 0.6,
  },
  historyList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  historyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  historyText: {
    fontSize: 13,
  },
  emptyHistory: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  emptyHistoryText: {
    opacity: 0.6,
  },
  resultsContainer: {
    paddingHorizontal: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    opacity: 0.7,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyText: {
    opacity: 0.6,
    fontSize: 16,
  },
});
