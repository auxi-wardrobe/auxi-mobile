import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MBottomSheet, MButton, MChip } from '../../components/design-system/lib';
import { theme } from '../../theme/theme';
import {
  CATEGORY_FILTERS,
  CategoryFilter,
  isAllSelected,
  toggleCategory,
} from './wardrobe-filter';

interface WardrobeTypeSheetProps {
  visible: boolean;
  selected: CategoryFilter[];
  onDismiss: () => void;
  onApply: (selected: CategoryFilter[]) => void;
}

// Type filter chooser (Figma "item type"). A wrap grid of multi-select chips —
// "All" plus each category — over a Default / Show button row. Selection is a
// DRAFT: nothing changes on the grid until "Show" commits it; "Default" resets
// the draft to All. The draft re-seeds from the committed selection each time
// the sheet opens, so cancelling (backdrop / swipe-down) discards edits.
export const WardrobeTypeSheet = ({
  visible,
  selected,
  onDismiss,
  onApply,
}: WardrobeTypeSheetProps) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<CategoryFilter[]>(selected);

  // Re-seed the draft from the committed selection whenever the sheet opens.
  useEffect(() => {
    if (visible) {
      setDraft(selected);
    }
  }, [visible, selected]);

  const label = (category: CategoryFilter) =>
    t(`common.categoryFilters.${category}`, { defaultValue: category });

  return (
    <MBottomSheet
      visible={visible}
      onDismiss={onDismiss}
      testID="wardrobe-type-sheet"
    >
      <Text style={styles.title}>{t('wardrobe.list.filter.title')}</Text>
      <View style={styles.chips}>
        <MChip
          selected={isAllSelected(draft)}
          onPress={() => setDraft([])}
          testID="wardrobe-type-chip-all"
          accessibilityLabel={t('common.categoryFilters.All')}
        >
          {t('common.categoryFilters.All')}
        </MChip>
        {CATEGORY_FILTERS.map(category => (
          <MChip
            key={category}
            selected={draft.includes(category)}
            onPress={() => setDraft(prev => toggleCategory(prev, category))}
            testID={`wardrobe-type-chip-${category}`}
            accessibilityLabel={label(category)}
          >
            {label(category)}
          </MChip>
        ))}
      </View>
      <View style={styles.actions}>
        <View style={styles.actionButton}>
          <MButton
            variant="secondary"
            onPress={() => setDraft([])}
            testID="wardrobe-type-default"
            accessibilityLabel={t('wardrobe.list.filter.reset')}
          >
            {t('wardrobe.list.filter.reset')}
          </MButton>
        </View>
        <View style={styles.actionButton}>
          <MButton
            variant="primary"
            onPress={() => {
              onApply(draft);
              onDismiss();
            }}
            testID="wardrobe-type-apply"
            accessibilityLabel={t('wardrobe.list.filter.apply')}
          >
            {t('wardrobe.list.filter.apply')}
          </MButton>
        </View>
      </View>
    </MBottomSheet>
  );
};

const styles = StyleSheet.create({
  title: {
    ...theme.typography.aliases.poppinsSemiboldSm,
    color: theme.colors.figmaTextPrimary,
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
