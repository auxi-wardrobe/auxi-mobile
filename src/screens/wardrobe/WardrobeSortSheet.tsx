import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MButton, MRadioMenu } from '../../components/design-system/lib';
import { ContextualBottomSheet } from '../../components/features/ContextualBottomSheet';
import { theme } from '../../theme/theme';
import { DEFAULT_SORT, SORT_OPTIONS, SortValue } from './wardrobe-sort';

interface WardrobeSortSheetProps {
  visible: boolean;
  value: SortValue;
  onDismiss: () => void;
  onApply: (value: SortValue) => void;
}

// Sort chooser (Figma "item sort"). A single-select radio list over a
// Default / Save button row. Like the type sheet the choice is a DRAFT — the
// grid only reorders once "Save" commits it; "Default" resets the draft to
// Newest first. The draft re-seeds from the committed value each open, so
// dismissing without saving discards the change.
export const WardrobeSortSheet = ({
  visible,
  value,
  onDismiss,
  onApply,
}: WardrobeSortSheetProps) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<SortValue>(value);

  useEffect(() => {
    if (visible) {
      setDraft(value);
    }
  }, [visible, value]);

  return (
    <ContextualBottomSheet
      visible={visible}
      onDismiss={onDismiss}
      testID="wardrobe-sort-sheet"
    >
      <Text style={styles.title}>{t('wardrobe.list.sort.title')}</Text>
      <View style={styles.menu}>
        <MRadioMenu
          options={SORT_OPTIONS.map(o => ({
            value: o.value,
            label: t(o.labelKey),
          }))}
          value={draft}
          onChange={next => setDraft(next as SortValue)}
          style={styles.menuInner}
          testID="wardrobe-sort-menu"
        />
      </View>
      <View style={styles.actions}>
        <View style={styles.actionButton}>
          <MButton
            variant="secondary"
            onPress={() => setDraft(DEFAULT_SORT)}
            testID="wardrobe-sort-default"
            accessibilityLabel={t('wardrobe.list.sort.reset')}
          >
            {t('wardrobe.list.sort.reset')}
          </MButton>
        </View>
        <View style={styles.actionButton}>
          <MButton
            variant="primary"
            onPress={() => {
              onApply(draft);
              onDismiss();
            }}
            testID="wardrobe-sort-apply"
            accessibilityLabel={t('common.save')}
          >
            {t('common.save')}
          </MButton>
        </View>
      </View>
    </ContextualBottomSheet>
  );
};

const styles = StyleSheet.create({
  // ContextualBottomSheet provides the full-width surface, top radius, scrim,
  // horizontal + top padding and the home-indicator bottom inset — this content
  // only owns its vertical rhythm.
  title: {
    ...theme.typography.aliases.poppinsSemiboldSm,
    color: theme.colors.figmaTextPrimary,
    paddingBottom: 12,
  },
  menu: {
    paddingBottom: 20,
  },
  // The DS radio menu defaults to maxWidth 280; stretch it to the sheet width so
  // the rows fill the card like the Figma "item sort" list.
  menuInner: {
    maxWidth: '100%',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
