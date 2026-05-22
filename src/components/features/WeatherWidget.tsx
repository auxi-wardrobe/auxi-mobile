import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';

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
  // Kept for backward compat with HomeScreen call site; Figma 1769:10382
  // ships a single illustrated sun-cloud asset, so dynamic OpenWeather
  // codes are no longer honored. Remove this prop after callers update.
  iconCode?: string;
};

// Figma-faithful weather block from header node 1769:10380:
// - Row layout: day + temp text column on the LEFT, illustrated sun-cloud
//   icon on the RIGHT (35×32 in design, scaled for screen density).
// - Day uses the FULL name ("Monday") not the 3-letter abbrev.
// - Temperature integer at Inter 600 / 16px; "°C" suffix at ~10px to match
//   the Figma typographic hierarchy.
// - Icon is the local sun-cloud PNG exported from Figma (Ellipse4/5 + cloud
//   Union composited), replacing the prior remote OpenWeather PNG.
export const WeatherWidget: React.FC<Props> = ({ tempC }) => {
  const dayName = DAY_FULL_NAMES[new Date().getDay()];

  return (
    <View style={styles.container}>
      <View style={styles.textColumn}>
        <Text style={styles.day} numberOfLines={1}>
          {dayName}
        </Text>
        <Text style={styles.temp} numberOfLines={1}>
          {tempC}
          <Text style={styles.tempUnit}>°C</Text>
        </Text>
      </View>
      <Image
        source={require('../../assets/images/weather_sun_cloud.png')}
        style={styles.icon}
        accessibilityLabel="current weather icon"
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textColumn: {
    alignItems: 'flex-end',
  },
  day: {
    ...theme.typography.aliases.poppinsBody,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.figmaTextSecondary,
  },
  temp: {
    ...theme.typography.aliases.poppinsButton,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.figmaText,
  },
  tempUnit: {
    fontSize: 10,
    lineHeight: 24,
  },
  icon: {
    width: 35,
    height: 32,
  },
});
