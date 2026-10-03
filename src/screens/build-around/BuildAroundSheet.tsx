import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../assets/icons';
import IconHomePin from '../../assets/images/icon_home_pin.svg';
import { MButton, MChip } from '../../components/design-system/lib';
import { ContextualBottomSheet } from '../../components/features/ContextualBottomSheet';
import { MacgieLoader } from '../../components/macgie/MacgieLoader';
import { theme } from '../../theme/theme';
import { useDiscoveryTrendTags } from '../../hooks/useDiscovery';
import {
  BUILD_AROUND_TAG_CHIP_COUNT,
  pickRandomTags,
} from '../../services/buildAroundMatchService';
import type { MakeItYoursErrorCode } from '../make-it-yours/useMakeItYoursRun';
import { buildAroundSheetStyles as styles } from './buildAroundSheetStyles';

export type BuildAroundMethod = 'wardrobe' | 'discovery';

export type BuildAroundSheetMode =
  | { kind: 'choose' }
  | { kind: 'loading' }
  | { kind: 'error'; code: MakeItYoursErrorCode | null }
  /** Search finished but nothing in Discovery can be built around the item. */
  | { kind: 'empty'; reason: 'no_match' | 'no_wardrobe' };

type Props = {
  visible: boolean;
  mode: BuildAroundSheetMode;
  /** Scrim tap / swipe-down / Android back. Cancels a running search. */
  onDismiss: () => void;
  /** Method 1 — the existing wardrobe-only algorithm (pin + rebuild on Home). */
  onBuildWithWardrobe: () => void;
  /** Method 2 — find the Discovery outfit the user can build around the item. */
  /** `null` = "Surprise me" (no tag constraint). */
  onBuildFromDiscovery: (trendTag: string | null) => void;
  onCancelLoading: () => void;
  onRetry: () => void;
  /** Empty state → back to the method choice. */
  onBackToChoice: () => void;
};

const LOADING_STEPS = ['loading_step_1', 'loading_step_2', 'loading_step_3'] as const;

const ERROR_BODY: Record<MakeItYoursErrorCode, string> = {
  network_error: 'buildAround.error_body',
  timeout: 'buildAround.error_body',
  server_error: 'buildAround.error_server_body',
  not_found: 'buildAround.error_not_found_body',
  rate_limited: 'buildAround.error_rate_limited_body',
};

const MASCOT_SIZE = 56;

/** `quiet-luxury` → `Quiet luxury` (Discovery tags are slugs). */
export const tagLabel = (tag: string): string => {
  const spaced = tag.replace(/[-_]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const OptionRow: React.FC<{
  method: BuildAroundMethod;
  selected: boolean;
  onSelect: (method: BuildAroundMethod) => void;
}> = ({ method, selected, onSelect }) => {
  const { t } = useTranslation();
  const Icon = method === 'wardrobe' ? Icons.Wardrobe : Icons.Globe;
  return (
    <Pressable
      onPress={() => onSelect(method)}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={t(`buildAround.option_${method}_title`)}
      testID={`build-around-option-${method}${selected ? '-selected' : ''}`}
      style={styles.option}
    >
      <View style={styles.optionIcon}>
        <Icon width={24} height={24} color={theme.ds.color.ink} />
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{t(`buildAround.option_${method}_title`)}</Text>
        <Text style={styles.optionDescription}>{t(`buildAround.option_${method}_body`)}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
};

/**
 * "How should we build your outfit?" — the choice made after tapping
 * "Build around this" on a wardrobe item, plus the in-place loading / error
 * states of the Discovery search (Figma: pop when click build around this →
 * when click find the best → find the best). One sheet, content swapped in
 * place, so the panel never flickers between states.
 */
export const BuildAroundSheet: React.FC<Props> = ({
  visible,
  mode,
  onDismiss,
  onBuildWithWardrobe,
  onBuildFromDiscovery,
  onCancelLoading,
  onRetry,
  onBackToChoice,
}) => {
  const { t } = useTranslation();
  const [method, setMethod] = useState<BuildAroundMethod>('wardrobe');
  // `null` = Surprise me. Otherwise one of the randomly offered Discovery tags.
  const [tag, setTag] = useState<string | null>(null);

  // Random Discovery tags, drawn once per open (not on every re-render, or the
  // chips would reshuffle under the user's finger).
  const { data: allTags } = useDiscoveryTrendTags();
  const tagChips = useMemo(
    () => (visible ? pickRandomTags(allTags ?? [], BUILD_AROUND_TAG_CHIP_COUNT) : []),
    [visible, allTags],
  );

  // A fresh open always starts from the default (the existing behaviour).
  useEffect(() => {
    if (!visible) {
      setMethod('wardrobe');
      setTag(null);
    }
  }, [visible]);

  const onBuild = () => {
    if (method === 'wardrobe') {
      onBuildWithWardrobe();
    } else {
      onBuildFromDiscovery(tag);
    }
  };

  return (
    <ContextualBottomSheet visible={visible} onDismiss={onDismiss} testID="build-around-sheet">
      {mode.kind === 'choose' ? (
        <View testID="build-around-choose">
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <IconHomePin width={14} height={14} color={theme.ds.color.white} />
            </View>
            <Text style={styles.headerTitle} accessibilityRole="header">
              {t('buildAround.title')}
            </Text>
          </View>
          <Text style={styles.intro}>{t('buildAround.intro')}</Text>

          <View style={styles.options} accessibilityRole="radiogroup">
            <OptionRow method="wardrobe" selected={method === 'wardrobe'} onSelect={setMethod} />
            <OptionRow method="discovery" selected={method === 'discovery'} onSelect={setMethod} />
          </View>

          {method === 'discovery' ? (
            <View testID="build-around-style-section">
              <View style={styles.styleHeader}>
                <View style={styles.headerIcon}>
                  <Icons.Remix width={14} height={14} color={theme.ds.color.white} />
                </View>
                <Text style={styles.headerTitle}>{t('buildAround.style_title')}</Text>
              </View>
              <View style={styles.chips}>
                <MChip
                  selected={tag === null}
                  onPress={() => setTag(null)}
                  testID={`build-around-style-surprise-me${tag === null ? '-selected' : ''}`}
                >
                  {t('buildAround.style_surprise_me')}
                </MChip>
                {tagChips.map(key => (
                  <MChip
                    key={key}
                    selected={tag === key}
                    onPress={() => setTag(key)}
                    testID={`build-around-style-${key}${tag === key ? '-selected' : ''}`}
                  >
                    {tagLabel(key)}
                  </MChip>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.actions}>
            <View style={styles.grow}>
              <MButton variant="text" onPress={onDismiss} testID="build-around-cancel">
                {t('buildAround.cancel')}
              </MButton>
            </View>
            <View style={styles.grow}>
              <MButton onPress={onBuild} testID="build-around-build">
                {t('buildAround.build')}
              </MButton>
            </View>
          </View>
        </View>
      ) : mode.kind === 'loading' ? (
        <View
          testID="build-around-loading"
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t('buildAround.a11y_loading')}
          accessibilityState={{ busy: true }}
        >
          <View style={styles.stateBlock}>
            <MacgieLoader variant="inline" size={MASCOT_SIZE} asLogo />
            <Text style={styles.stateTitle}>{t('buildAround.loading_title')}</Text>
            <View>
              {LOADING_STEPS.map(key => (
                <Text key={key} style={styles.step}>
                  {`•  ${t(`buildAround.${key}`)}`}
                </Text>
              ))}
            </View>
          </View>
          <View style={styles.actions}>
            <View style={styles.grow}>
              <MButton loading disabled testID="build-around-build-loading">
                {t('buildAround.build')}
              </MButton>
            </View>
            <View style={styles.grow}>
              <MButton
                variant="secondary"
                onPress={onCancelLoading}
                testID="build-around-loading-cancel"
              >
                {t('buildAround.cancel')}
              </MButton>
            </View>
          </View>
        </View>
      ) : mode.kind === 'empty' ? (
        <View testID={`build-around-${mode.reason.replace('_', '-')}`}>
          <View style={styles.stateBlock}>
            <Text style={styles.stateTitle}>{t(`buildAround.${mode.reason}_title`)}</Text>
            <Text style={styles.stateBody}>{t(`buildAround.${mode.reason}_body`)}</Text>
          </View>
          <View style={styles.actions}>
            <View style={styles.grow}>
              <MButton variant="secondary" onPress={onBackToChoice} testID="build-around-empty-back">
                {t('buildAround.back')}
              </MButton>
            </View>
            <View style={styles.grow}>
              <MButton onPress={onBuildWithWardrobe} testID="build-around-empty-use-wardrobe">
                {t('buildAround.use_my_items')}
              </MButton>
            </View>
          </View>
        </View>
      ) : (
        <View testID="build-around-error">
          <View style={styles.stateBlock}>
            <Text style={styles.stateTitle}>{t('buildAround.error_title')}</Text>
            <Text style={styles.stateBody}>
              {t(ERROR_BODY[mode.code ?? 'network_error'])}
            </Text>
          </View>
          <View style={styles.actions}>
            <View style={styles.grow}>
              <MButton variant="secondary" onPress={onDismiss} testID="build-around-error-close">
                {t('buildAround.close')}
              </MButton>
            </View>
            {mode.code === 'not_found' ? null : (
              <View style={styles.grow}>
                <MButton onPress={onRetry} testID="build-around-retry">
                  {t('buildAround.try_again')}
                </MButton>
              </View>
            )}
          </View>
        </View>
      )}
    </ContextualBottomSheet>
  );
};
