import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { useBackgroundScale } from '../../context/BackgroundScaleContext';
import { MBottomSheet } from '../design-system/lib';
import { PillButton } from '../primitives/FigmaPrimitives';
import {
  TEMPERATURE_BUCKETS,
  bucketLabel,
  type TemperatureBucketKey,
} from '../../config/temperature-buckets';

export type TemperatureSheetErrorKey = 'recommend_failed' | 'offline';

interface TemperatureOverrideSheetProps {
  visible: boolean;
  activeBucketKey: TemperatureBucketKey;
  /** Live temperature for the "Use current weather (XX°C)" row label. */
  liveTempC: number;
  isApplying: boolean;
  errorKey?: TemperatureSheetErrorKey | null;
  onApply: (key: TemperatureBucketKey) => void;
  onSelect?: (key: TemperatureBucketKey) => void;
  onCancel: () => void;
}

const RadioRow: React.FC<{
  label: string;
  selected: boolean;
  disabled: boolean;
  testID: string;
  onPress: () => void;
}> = ({ label, selected, disabled, testID, onPress }) => (
  <TouchableOpacity
    testID={testID}
    accessibilityRole="radio"
    accessibilityState={{ selected, disabled }}
    activeOpacity={0.82}
    disabled={disabled}
    style={styles.radioRow}
    onPress={onPress}
  >
    <Text style={styles.radioLabel}>{label}</Text>
    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
      {selected ? <View style={styles.radioInner} /> : null}
    </View>
  </TouchableOpacity>
);

/**
 * AU-362 — "Outfit Temperature" bottom sheet. GH-364: presents through the
 * design-system MBottomSheet primitive (scrim + slide-up/down motion + grab
 * handle + reduce-motion all owned by the primitive). Presentational: receives
 * the active bucket + applying/error state, owns only the local pending
 * selection. Dismiss is suppressed while applying.
 */
export const TemperatureOverrideSheet: React.FC<
  TemperatureOverrideSheetProps
> = ({
  visible,
  activeBucketKey,
  liveTempC,
  isApplying,
  errorKey,
  onApply,
  onSelect,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { pushSheet, popSheet } = useBackgroundScale();
  useEffect(() => {
    if (!visible) {
      return;
    }
    pushSheet();
    return () => popSheet();
  }, [visible, pushSheet, popSheet]);
  const [pendingKey, setPendingKey] =
    useState<TemperatureBucketKey>(activeBucketKey);

  // Pre-select the active bucket every time the sheet opens (ticket: reopen
  // after override → previous selection pre-selected; default `weather`).
  useEffect(() => {
    if (visible) {
      setPendingKey(activeBucketKey);
    }
  }, [visible, activeBucketKey]);

  const errorText =
    errorKey === 'offline'
      ? t('home.temp_error_offline')
      : errorKey === 'recommend_failed'
      ? t('home.temp_error_recommend')
      : null;

  return (
    <MBottomSheet
      visible={visible}
      onDismiss={isApplying ? () => {} : onCancel}
      testID="temp-sheet-root"
    >
      <View style={styles.body}>
        <Text style={styles.title}>{t('home.temp_sheet_title')}</Text>
        <Text style={styles.subtitle}>{t('home.temp_sheet_subtitle')}</Text>

        <View style={styles.radioList}>
          {TEMPERATURE_BUCKETS.map(bucket => (
            <RadioRow
              key={bucket.key}
              testID={`temp-sheet-option-${bucket.key}`}
              label={bucketLabel(t, bucket.key, liveTempC)}
              selected={pendingKey === bucket.key}
              disabled={isApplying}
              onPress={() => {
                setPendingKey(bucket.key);
                onSelect?.(bucket.key);
              }}
            />
          ))}
        </View>

        {errorText ? (
          <View style={styles.errorBanner}>
            <Text testID="temp-sheet-error" style={styles.errorText}>
              {errorText}
            </Text>
          </View>
        ) : null}

        <PillButton
          testID="temp-sheet-apply"
          title={t('home.temp_apply_cta')}
          variant="filled"
          disabled={isApplying}
          loading={isApplying}
          onPress={() => onApply(pendingKey)}
          style={styles.applyButton}
        />

        <TouchableOpacity
          testID="temp-sheet-cancel"
          accessibilityRole="button"
          activeOpacity={0.82}
          disabled={isApplying}
          style={styles.cancelButton}
          onPress={onCancel}
        >
          <Text style={styles.cancelText}>{t('home.temp_cancel_cta')}</Text>
        </TouchableOpacity>
      </View>
    </MBottomSheet>
  );
};

const styles = StyleSheet.create({
  // Inner content padding (the MBottomSheet primitive owns the surface, top
  // radius, grab handle, scrim and motion).
  body: {
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.s,
    paddingBottom: theme.spacing.m,
  },
  title: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
  },
  subtitle: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.s,
  },
  radioList: {
    marginTop: theme.spacing.s,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingVertical: theme.spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.uacColorNeutral100,
  },
  radioLabel: {
    ...theme.typography.aliases.interBodyMd,
    color: theme.colors.uacTextBase,
    flexShrink: 1,
    paddingRight: theme.spacing.m,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.figmaDotInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: theme.colors.figmaTextDark,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.figmaTextDark,
  },
  errorBanner: {
    marginTop: theme.spacing.m,
  },
  errorText: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaRed,
  },
  applyButton: {
    alignSelf: 'stretch',
    marginTop: theme.spacing.m,
  },
  cancelButton: {
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.m,
    marginTop: theme.spacing.xs,
  },
  cancelText: {
    ...theme.typography.aliases.uacBodyMdMedium,
    color: theme.colors.uacTextBase,
  },
});
