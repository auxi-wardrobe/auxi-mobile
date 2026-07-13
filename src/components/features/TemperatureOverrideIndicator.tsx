import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { Icons } from '../../assets/icons';

type Props = {
  /** Selected bucket label (e.g. "28–40°C") — D4: NOT the Figma "10-35" mock. */
  label: string;
  onPress: () => void;
};

/**
 * AU-362 — Home header override indicator. Replaces <WeatherWidget> when a
 * temperature override is active (Figma `degree selected`). Person glyph
 * (reused `Icons.User`, D4) + selected bucket label + chevron; tapping it
 * re-opens the temperature sheet (same affordance as the chevron in the mock).
 */
export const TemperatureOverrideIndicator: React.FC<Props> = ({
  label,
  onPress,
}) => {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      testID="home-temp-indicator"
      accessibilityRole="button"
      accessibilityLabel={t('home.temp_override_a11y', { range: label })}
      activeOpacity={0.82}
      style={styles.container}
      onPress={onPress}
    >
      <Icons.User width={18} height={18} color={theme.colors.uacTextBase} />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Icons.ChevronRight
        width={16}
        height={16}
        color={theme.colors.uacTextBase}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  label: {
    ...theme.typography.aliases.poppinsSemiboldXs,
    color: theme.colors.uacTextBase,
  },
  chevron: {
    transform: [{ rotate: '90deg' }],
  },
});
