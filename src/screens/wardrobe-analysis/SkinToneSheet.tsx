import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MButton, MRadio } from '../../components/design-system/lib';
import { ContextualBottomSheet } from '../../components/features/ContextualBottomSheet';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import {
  SKIN_TONES,
  SkinToneGender,
  SkinToneId,
  skinTonePortrait,
} from '../../content/skin-tones';

const { height: screenHeight } = Dimensions.get('window');
// Guide + four tone rows run taller than a small phone; the body scrolls and
// the Cancel / OK row stays pinned under it.
const BODY_MAX_HEIGHT = Math.round(screenHeight * 0.62);

const MEN_SKIN_CHECK_KEYS = ['1', '2', '3', '4'] as const;
const MEN_UNDERTONE_KEYS = ['1', '2', '3'] as const;
const WOMEN_GUIDE_KEYS = ['1', '2', '3'] as const;

interface SkinToneSheetProps {
  visible: boolean;
  /** Portrait set + guide copy (Figma has a men and a women variant). */
  gender: SkinToneGender;
  value: SkinToneId | null;
  saving?: boolean;
  onDismiss: () => void;
  onApply: (next: SkinToneId) => void;
}

/**
 * "Change your skin tone" (Figma skin-tone sheet, men + women variants).
 * Single-select over the four tones; like the wardrobe sort sheet the pick is
 * a DRAFT that only commits on OK, and re-seeds from the saved value on every
 * open so dismissing discards it.
 */
export const SkinToneSheet = ({
  visible,
  gender,
  value,
  saving = false,
  onDismiss,
  onApply,
}: SkinToneSheetProps) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<SkinToneId | null>(value);

  useEffect(() => {
    if (visible) {
      setDraft(value);
    }
  }, [visible, value]);

  return (
    <ContextualBottomSheet
      visible={visible}
      onDismiss={onDismiss}
      testID="analysis-skin-tone-sheet"
    >
      <View style={styles.titleRow}>
        <View style={styles.titleIcon}>
          <Icons.Edit
            width={16}
            height={16}
            color={theme.colors.figmaPrimaryButtonIcon}
          />
        </View>
        <Text style={styles.title}>{t('wardrobe.analysis.sheet.title')}</Text>
      </View>

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        testID="analysis-skin-tone-scroll"
      >
        {gender === 'men' ? (
          <View style={styles.guideColumns}>
            <View style={styles.guideColumn}>
              <Text style={styles.guideHeading}>
                {t('wardrobe.analysis.sheet.skin_check_title')}
              </Text>
              {MEN_SKIN_CHECK_KEYS.map(key => (
                <Text key={key} style={styles.guideLine}>
                  {t(`wardrobe.analysis.sheet.skin_check_${key}`)}
                </Text>
              ))}
            </View>
            <View style={styles.guideColumn}>
              <Text style={styles.guideHeading}>
                {t('wardrobe.analysis.sheet.undertone_title')}
              </Text>
              {MEN_UNDERTONE_KEYS.map(key => (
                <Text key={key} style={styles.guideLine}>
                  {t(`wardrobe.analysis.sheet.undertone_${key}`)}
                </Text>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.guideStack}>
            {WOMEN_GUIDE_KEYS.map(key => (
              <Text key={key} style={styles.guideLine}>
                {t(`wardrobe.analysis.sheet.guide_${key}`)}
              </Text>
            ))}
          </View>
        )}

        {SKIN_TONES.map((tone, index) => {
          const selected = draft === tone.id;
          const label = t(`wardrobe.analysis.tones.${tone.labelKey}.label`);
          return (
            <Pressable
              key={tone.id}
              style={[styles.toneRow, index > 0 && styles.toneRowDivider]}
              onPress={() => setDraft(tone.id)}
              testID={`analysis-skin-tone-option-${tone.id}${
                selected ? '-selected' : ''
              }`}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={label}
            >
              <Image
                source={skinTonePortrait(gender, tone.id)}
                style={styles.portrait}
                accessibilityIgnoresInvertColors
              />
              <View style={styles.toneText}>
                <Text style={styles.toneLabel}>{label}</Text>
                <Text style={styles.toneUndertone}>
                  {t(`wardrobe.analysis.tones.${tone.labelKey}.undertone`)}
                </Text>
                <View style={styles.swatchStrip}>
                  {tone.palette.map(swatch => (
                    <View
                      key={swatch.nameKey}
                      style={[styles.swatch, { backgroundColor: swatch.hex }]}
                    />
                  ))}
                </View>
              </View>
              <MRadio
                selected={selected}
                onSelect={() => setDraft(tone.id)}
                testID={`analysis-skin-tone-radio-${tone.id}`}
                accessibilityLabel={label}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.actions}>
        <View style={styles.actionButton}>
          <MButton
            variant="text"
            onPress={onDismiss}
            disabled={saving}
            testID="analysis-skin-tone-cancel"
            accessibilityLabel={t('wardrobe.analysis.sheet.cancel')}
          >
            {t('wardrobe.analysis.sheet.cancel')}
          </MButton>
        </View>
        <View style={styles.actionButton}>
          <MButton
            variant="primary"
            onPress={() => {
              if (draft) {
                onApply(draft);
              }
            }}
            disabled={!draft || saving}
            testID="analysis-skin-tone-ok"
            accessibilityLabel={t('wardrobe.analysis.sheet.ok')}
          >
            {t('wardrobe.analysis.sheet.ok')}
          </MButton>
        </View>
      </View>
    </ContextualBottomSheet>
  );
};

const PORTRAIT_WIDTH = 44;
const PORTRAIT_HEIGHT = 54;
const SWATCH_SIZE = 10;

const styles = StyleSheet.create({
  // ContextualBottomSheet owns the full-width surface, radius, horizontal +
  // top padding and the bottom inset — this content only owns its rhythm.
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    paddingBottom: theme.spacing.uacDimension12,
  },
  titleIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.ds.radius.full,
    backgroundColor: theme.colors.figmaPrimaryButtonBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.figmaTextPrimary,
  },
  body: {
    maxHeight: BODY_MAX_HEIGHT,
  },
  guideColumns: {
    flexDirection: 'row',
    gap: theme.spacing.m,
    paddingBottom: theme.spacing.m,
  },
  guideColumn: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  guideStack: {
    gap: theme.spacing.uacDimension12,
    paddingBottom: theme.spacing.m,
  },
  guideHeading: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextPrimary,
    paddingBottom: theme.spacing.s,
  },
  guideLine: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextPrimary,
  },
  toneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.uacDimension12,
    paddingVertical: theme.spacing.uacDimension12,
  },
  toneRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.ds.line,
  },
  portrait: {
    width: PORTRAIT_WIDTH,
    height: PORTRAIT_HEIGHT,
    borderRadius: theme.spacing.s,
    backgroundColor: theme.ds.color.cream,
  },
  toneText: {
    flex: 1,
    gap: 2,
  },
  toneLabel: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.figmaTextPrimary,
  },
  toneUndertone: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextPrimary,
  },
  swatchStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    paddingTop: theme.spacing.xs,
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: theme.ds.radius.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.ds.line,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.uacDimension12,
    paddingTop: theme.spacing.m,
  },
  actionButton: {
    flex: 1,
  },
});
