import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { WeatherIcon } from '../atoms/WeatherIcon';
import { Icons } from '../../assets/icons';

const DAY_FULL_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

type Props = {
  tempC: number;
  // OpenWeather icon code (e.g. "10d"); drives the dynamic vector glyph so the
  // icon reflects the real condition instead of a fixed sun-cloud image.
  iconCode?: string;
  // When provided, the whole weather block becomes the temperature trigger
  // (tap → open the "Outfit Temperature" sheet) and shows a chevron-down
  // affordance. When absent (e.g. read-only contexts) it stays static.
  onPress?: () => void;
};

// Figma-faithful weather block from header node 1769:10380 (verified
// against rendered screenshot of 2850:9152). Row layout:
// - Weather icon on the LEFT (35×32 in design).
// - Text column on the RIGHT, left-aligned: temperature on top, day
//   name below. Temperature integer at Inter 600 / 16px; "°C" suffix
//   at ~10px to match the Figma typographic hierarchy. Day uses the
//   FULL name ("Monday") not the 3-letter abbrev.
// - Icon is the self-rendered <WeatherIcon> (react-native-svg), mapped from
//   the live OpenWeather code — replaces the static weather_sun_cloud.png,
//   which always showed sun regardless of the actual weather.
export const WeatherWidget: React.FC<Props> = ({
  tempC,
  iconCode,
  onPress,
}) => {
  const { t } = useTranslation();
  const dayName = DAY_FULL_NAMES[new Date().getDay()];

  const body = (
    <>
      <WeatherIcon code={iconCode} size={35} />
      <View style={styles.textColumn}>
        <Text style={styles.temp} numberOfLines={1}>
          {tempC}
          <Text style={styles.tempUnit}>°C</Text>
        </Text>
        <Text style={styles.day} numberOfLines={1}>
          {dayName}
        </Text>
      </View>
      {onPress ? (
        <Icons.ChevronRight
          width={16}
          height={16}
          color={theme.colors.uacTextBase}
          style={styles.chevron}
        />
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.container}>{body}</View>;
  }

  return (
    <TouchableOpacity
      testID="home-weather-trigger"
      accessibilityRole="button"
      accessibilityLabel={t('home.a11y_temp_idle')}
      activeOpacity={0.82}
      style={styles.container}
      onPress={onPress}
    >
      {body}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  textColumn: {
    alignItems: 'flex-start',
  },
  temp: {
    ...theme.typography.aliases.interSemiboldXs,
    color: theme.colors.uacTextBase,
  },
  tempUnit: {
    fontSize: 8,
    lineHeight: 16,
  },
  day: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextSubtle100,
  },
  // Chevron points down (rotate the right-chevron 90°) to signal the block
  // opens the temperature sheet — matches <TemperatureOverrideIndicator>.
  chevron: {
    transform: [{ rotate: '90deg' }],
  },
});
