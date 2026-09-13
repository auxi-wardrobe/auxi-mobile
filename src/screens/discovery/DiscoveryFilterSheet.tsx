import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MButton, MChip } from '../../components/design-system/lib';
import { ContextualBottomSheet } from '../../components/features/ContextualBottomSheet';
import { theme } from '../../theme/theme';

export interface DiscoveryFilterOption<T extends string> {
  value: T;
  label: string;
}

interface DiscoveryFilterSheetProps<T extends string> {
  visible: boolean;
  title: string;
  /** Copy for the "everything" chip — e.g. "All season". */
  allLabel: string;
  options: DiscoveryFilterOption<T>[];
  /** Committed selection. Empty === the "All" chip is on. */
  selected: T[];
  /** Pure toggle for one value; supplies the canonical result order. */
  onToggle: (selected: T[], value: T) => T[];
  onDismiss: () => void;
  onApply: (selected: T[]) => void;
  /** Prefix for this sheet's testIDs, e.g. `discovery-season`. */
  testIDPrefix: string;
}

/**
 * Multi-select filter chooser for the Discovery feed — the same sheet the
 * wardrobe type filter uses (`WardrobeTypeSheet`), generic over its options so
 * season and trend tag share one implementation.
 *
 * A wrap grid of chips — "All" plus every option — over a Default / Show row.
 * Selection is a DRAFT: the feed does not change until "Show" commits it, and
 * "Default" resets the draft back to All. The draft re-seeds from the committed
 * selection every time the sheet opens, so cancelling (backdrop / swipe-down)
 * discards the edits.
 */
export const DiscoveryFilterSheet = <T extends string>({
  visible,
  title,
  allLabel,
  options,
  selected,
  onToggle,
  onDismiss,
  onApply,
  testIDPrefix,
}: DiscoveryFilterSheetProps<T>) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<T[]>(selected);

  // Re-seed the draft from the committed selection whenever the sheet opens.
  useEffect(() => {
    if (visible) {
      setDraft(selected);
    }
  }, [visible, selected]);

  return (
    <ContextualBottomSheet
      visible={visible}
      onDismiss={onDismiss}
      testID={`${testIDPrefix}-sheet`}
    >
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chips}>
        <MChip
          selected={draft.length === 0}
          onPress={() => setDraft([])}
          testID={`${testIDPrefix}-chip-all`}
          accessibilityLabel={allLabel}
        >
          {allLabel}
        </MChip>
        {options.map(option => (
          <MChip
            key={option.value}
            selected={draft.includes(option.value)}
            onPress={() => setDraft(prev => onToggle(prev, option.value))}
            testID={`${testIDPrefix}-chip-${option.value}`}
            accessibilityLabel={option.label}
          >
            {option.label}
          </MChip>
        ))}
      </View>
      <View style={styles.actions}>
        <View style={styles.actionButton}>
          <MButton
            variant="secondary"
            onPress={() => setDraft([])}
            testID={`${testIDPrefix}-default`}
            accessibilityLabel={t('discovery.filter.reset')}
          >
            {t('discovery.filter.reset')}
          </MButton>
        </View>
        <View style={styles.actionButton}>
          <MButton
            variant="primary"
            onPress={() => {
              onApply(draft);
              onDismiss();
            }}
            testID={`${testIDPrefix}-apply`}
            accessibilityLabel={t('discovery.filter.apply')}
          >
            {t('discovery.filter.apply')}
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
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.figmaTextPrimary,
    paddingBottom: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
