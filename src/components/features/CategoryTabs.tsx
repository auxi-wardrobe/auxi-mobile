import React, { useEffect, useRef } from 'react';
import {
  Animated,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { motion, useReducedMotion } from '../../theme/motion';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

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
interface CategoryChipProps {
  category: string;
  isSelected: boolean;
  onPress: () => void;
}

// F3: selection-emphasis motion — the selected chip animates to
// `motion.scale.select` (1.03) over `fast` (120ms); unselected rest at 1.
// Reduce-motion skips the animation (state still flips). Used by Wardrobe and
// Database (shared component).
const CategoryChip = ({ category, isSelected, onPress }: CategoryChipProps) => {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const scale = useRef(
    new Animated.Value(isSelected ? motion.scale.select : 1),
  ).current;

  useEffect(() => {
    const target = isSelected ? motion.scale.select : 1;
    if (reduced) {
      scale.setValue(target);
      return;
    }
    Animated.timing(scale, {
      toValue: target,
      duration: motion.duration.fast,
      easing: motion.easing.standard,
      useNativeDriver: true,
    }).start();
  }, [isSelected, reduced, scale]);

  return (
    <AnimatedTouchable
      activeOpacity={0.85}
      style={[
        styles.tab,
        isSelected && styles.selectedTab,
        { transform: [{ scale }] },
      ]}
      onPress={onPress}
      testID={`category-tab-${category}`}
      accessibilityLabel={t('common.a11y_filter', { category })}
      accessibilityState={{ selected: isSelected }}
    >
      <Text style={[styles.tabText, isSelected && styles.selectedTabText]}>
        {t(`common.categoryFilters.${category}`, { defaultValue: category })}
      </Text>
    </AnimatedTouchable>
  );
};

export const CategoryTabs = ({
  categories,
  selectedCategory,
  onSelectCategory,
  wrap = false,
}: CategoryTabsProps) => {
  const chips = categories.map(category => (
    <CategoryChip
      key={category}
      category={category}
      isSelected={selectedCategory === category}
      onPress={() => onSelectCategory(category)}
    />
  ));

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
