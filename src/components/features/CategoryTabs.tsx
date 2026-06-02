import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../theme/theme';

interface CategoryTabsProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  // When true, chips wrap onto multiple rows (Wardrobe / Database design,
  // node 3234:17793). Default false keeps the single-row horizontal scroll.
  wrap?: boolean;
}

// Wardrobe filter chips — Figma node 3234:17793.
// Unselected: background/primary/subtle_100 (#e0d2c4) · Selected: background/primary/bold_500 (#5b5550).
// Text: Inter Medium 14/20, white when selected. Pill height 44, radius 20.
export const CategoryTabs = ({
  categories,
  selectedCategory,
  onSelectCategory,
  wrap = false,
}: CategoryTabsProps) => {
  const chips = categories.map(category => {
    const isSelected = selectedCategory === category;
    return (
      <TouchableOpacity
        key={category}
        activeOpacity={0.85}
        style={[styles.tab, isSelected && styles.selectedTab]}
        onPress={() => onSelectCategory(category)}
        testID={`category-tab-${category}`}
        accessibilityLabel={`Filter ${category}`}
        accessibilityState={{ selected: isSelected }}
      >
        <Text style={[styles.tabText, isSelected && styles.selectedTabText]}>
          {category}
        </Text>
      </TouchableOpacity>
    );
  });

  return (
    <View style={styles.container}>
      {wrap ? (
        <View style={styles.wrapRow}>{chips}</View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {chips}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingRight: 32,
    gap: 8,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 8,
  },
  tab: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: theme.colors.figmaInsightPillBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTab: {
    backgroundColor: theme.colors.figmaChipBg,
  },
  tabText: {
    ...theme.typography.aliases.interMediumSm,
    color: theme.colors.figmaText,
  },
  selectedTabText: {
    color: theme.colors.white,
  },
});
