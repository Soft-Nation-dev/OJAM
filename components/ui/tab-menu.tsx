import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';

type TabType = 'all' | 'friday' | 'sunday' | 'tuesday';

interface TabItem {
  id: TabType;
  label: string;
}

interface TabMenuProps {
  tabs: TabItem[];
  activeTab: TabType;
  onTabPress: (tabId: TabType) => void;
}

const TabMenu: React.FC<TabMenuProps> = ({ tabs, activeTab, onTabPress }) => {
  const colorScheme = useColorScheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[
        styles.tabsContainer,
        {
          backgroundColor: Colors[colorScheme ?? 'light'].background,
          borderBottomColor: Colors[colorScheme ?? 'light'].tabIconDefault + '20',
        },
      ]}
      contentContainerStyle={styles.tabsContent}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.tab,
            {
              backgroundColor: colorScheme === 'dark' 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(0, 0, 0, 0.05)',
              borderColor: colorScheme === 'dark'
                ? 'rgba(255, 255, 255, 0.2)'
                : 'rgba(0, 0, 0, 0.1)',
            },
            activeTab === tab.id && styles.activeTab,
          ]}
          onPress={() => onTabPress(tab.id)}>
              <ThemedText
                  type="defaultSemiBold"
                  numberOfLines={1}
                  ellipsizeMode="tail"
            style={[
              styles.tabText,
              {
                color: Colors[colorScheme ?? 'light'].text,
              },
              activeTab === tab.id && styles.activeTabText,
            ]}>
            {tab.label.toUpperCase()}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tabsContainer: {
    borderBottomWidth: 1,
    display: 'flex',
    flexWrap: 'nowrap',
    marginTop: 10,
    marginBottom: 10,
  },
  tabsContent: {
    paddingHorizontal: 16,
    // paddingVertical: 12,
    gap: 12,
    
  },
  tab: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 160,
    borderWidth: 1,
  },
  activeTab: {
    backgroundColor: '#2063FA',
    borderColor: '#2063FA',
    shadowColor: '#2063FA',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tabText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.5,
    includeFontPadding: false,

  },
  activeTabText: {
    color: '#FFFFFF',
  },
});

export default TabMenu;