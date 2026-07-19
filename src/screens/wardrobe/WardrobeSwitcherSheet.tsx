import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MBottomSheet, MRadio } from '../../components/design-system/lib';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import type { Capsule } from '../../services/capsuleService';
import {
  buildWardrobeSwitcherRows,
  type WardrobeContext,
} from './wardrobe-switcher';

interface WardrobeSwitcherSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Active context — 'entire' or a capsule id — drives which row is radio-on. */
  activeContext: WardrobeContext;
  /** Item count for the "Entire Wardrobe" row (current wardrobe items length). */
  wardrobeItemCount: number;
  capsules: Capsule[];
  onSelectEntire: () => void;
  onSelectCapsule: (capsuleId: string) => void;
  onCreateCapsule: () => void;
}

/**
 * "Choose a wardrobe" bottom sheet (design revision §9.2). Lists the entire
 * wardrobe + each capsule (radio-selected for the active context) and a footer
 * "Create Capsule" row. Selecting entire → stay on wardrobe; a capsule →
 * CapsuleDetail; create → CapsuleCreate. Reused on the Wardrobe AND CapsuleDetail
 * headers.
 */
export const WardrobeSwitcherSheet: React.FC<WardrobeSwitcherSheetProps> = ({
  visible,
  onClose,
  activeContext,
  wardrobeItemCount,
  capsules,
  onSelectEntire,
  onSelectCapsule,
  onCreateCapsule,
}) => {
  const { t } = useTranslation();
  const rows = buildWardrobeSwitcherRows(
    wardrobeItemCount,
    capsules,
    activeContext,
  );

  return (
    <MBottomSheet
      visible={visible}
      onDismiss={onClose}
      testID="wardrobe-switcher-sheet"
    >
      <Text style={styles.title}>{t('capsule.switcher_title')}</Text>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {rows.map(row => {
          const isEntire = row.kind === 'entire';
          const label = isEntire ? t('capsule.entire_wardrobe') : row.name;
          const key = isEntire ? 'entire' : row.capsuleId;
          const testID = isEntire
            ? 'wardrobe-switcher-row-entire'
            : `wardrobe-switcher-row-${row.capsuleId}`;
          const onPress = isEntire
            ? onSelectEntire
            : () => onSelectCapsule(row.capsuleId);
          return (
            <Pressable
              key={key}
              style={styles.row}
              onPress={onPress}
              testID={testID}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: row.selected }}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {label}
                </Text>
                <Text style={styles.rowMeta}>
                  {t('capsule.items_count', { count: row.count })}
                </Text>
              </View>
              <MRadio
                selected={row.selected}
                onSelect={onPress}
                testID={`${testID}-radio`}
                accessibilityLabel={label}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        style={styles.createRow}
        onPress={onCreateCapsule}
        testID="wardrobe-switcher-create"
        accessibilityRole="button"
        accessibilityLabel={t('capsule.create_capsule_row')}
      >
        <View style={styles.createIcon}>
          <Icons.Capsule
            width={22}
            height={22}
            color={theme.colors.figmaAction}
          />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.createTitle}>
            {t('capsule.create_capsule_row')}
          </Text>
          <Text style={styles.rowMeta}>
            {t('capsule.create_capsule_subtitle')}
          </Text>
        </View>
      </Pressable>
    </MBottomSheet>
  );
};

const styles = StyleSheet.create({
  title: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.figmaTextDark,
    textAlign: 'center',
    paddingBottom: theme.spacing.s,
  },
  scroll: {
    maxHeight: 320,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.s,
    paddingVertical: theme.spacing.s,
    borderTopWidth: 1,
    borderTopColor: theme.colors.figmaListDivider,
  },
  rowText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  rowName: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.figmaTextDark,
  },
  rowMeta: {
    ...theme.typography.aliases.poppinsBodySm,
    color: theme.colors.uacTextSubtle200,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    paddingVertical: theme.spacing.m,
    marginTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.figmaListDivider,
  },
  createIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.figmaCardSurface,
  },
  createTitle: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.figmaAction,
  },
});
