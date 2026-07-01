import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { motion, useReducedMotion } from '../../theme/motion';
import { useBackgroundScale } from '../../context/BackgroundScaleContext';
import { PillButton } from '../primitives/FigmaPrimitives';
import {
  TEMPERATURE_BUCKETS,
  bucketLabel,
  type TemperatureBucketKey,
} from '../../config/temperature-buckets';

const { height: screenHeight } = Dimensions.get('window');
const OPEN_DURATION_MS = motion.duration.medium;
const CLOSE_DURATION_MS = motion.duration.normal;

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
 * AU-362 — "Outfit Temperature" bottom sheet. Modal + slide-up Animated.View
 * cloned from ContextChipsModal / MoodFeedbackSheet (the house pattern; NOT
 * @gorhom/bottom-sheet). Presentational: receives the active bucket + applying
 * /error state, owns only the local pending selection + open/close animation.
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
  const reduceMotion = useReducedMotion();
  const [shouldRender, setShouldRender] = useState(visible);
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
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  // Pre-select the active bucket every time the sheet opens (ticket: reopen
  // after override → previous selection pre-selected; default `weather`).
  useEffect(() => {
    if (visible) {
      setPendingKey(activeBucketKey);
    }
  }, [visible, activeBucketKey]);

  // Open/close animation with open/close duration asymmetry. Reduce-motion
  // skips the slide entirely (instant snap) per the motion spec fallback.
  useEffect(() => {
    if (visible && !shouldRender) {
      setShouldRender(true);
      return;
    }
    if (visible) {
      if (reduceMotion) {
        slideAnim.setValue(0);
        return;
      }
      slideAnim.setValue(screenHeight);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: OPEN_DURATION_MS,
        easing: motion.easing.enter,
        useNativeDriver: true,
      }).start();
      return;
    }
    if (!shouldRender) {
      return;
    }
    if (reduceMotion) {
      setShouldRender(false);
      return;
    }
    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: CLOSE_DURATION_MS,
      easing: motion.easing.exit,
      useNativeDriver: true,
    }).start(() => setShouldRender(false));
  }, [shouldRender, slideAnim, visible, reduceMotion]);

  if (!shouldRender) {
    return null;
  }

  const errorText =
    errorKey === 'offline'
      ? t('home.temp_error_offline')
      : errorKey === 'recommend_failed'
      ? t('home.temp_error_recommend')
      : null;

  return (
    <Modal
      transparent
      visible={shouldRender}
      animationType="none"
      onRequestClose={isApplying ? undefined : onCancel}
    >
      <View style={styles.overlay}>
        <Pressable
          testID="temp-sheet-backdrop"
          accessibilityLabel={t('home.temp_cancel_cta')}
          style={StyleSheet.absoluteFillObject}
          onPress={isApplying ? undefined : onCancel}
        />

        <Animated.View
          testID="temp-sheet-root"
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
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
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Dim tier — RN <Modal> host carries the scrim (docs/Z_INDEX_LAYERING.md §1).
  overlay: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.figmaOverlayScrim,
  },
  sheet: {
    // Modal tier — sheet sits above the dim/dismiss layer.
    zIndex: theme.zIndex.modal,
    width: '100%',
    borderTopLeftRadius: theme.borderRadius.l,
    borderTopRightRadius: theme.borderRadius.l,
    backgroundColor: theme.colors.figmaSurface,
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.m,
    ...theme.ds.shadow.sheet,
  },
  title: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.figmaTextPrimary,
  },
  subtitle: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    marginTop: theme.spacing.s,
    marginBottom: theme.spacing.m,
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
