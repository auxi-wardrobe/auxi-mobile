import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Props = {
  tempC: number;
  iconCode: string;
};

// Whitelist: OpenWeather icon codes are 2–4 alphanumeric chars + 'd'|'n' suffix (e.g. "01d", "10n")
const ICON_CODE_RE = /^[a-z0-9]{2,4}[dn]$/i;
const FALLBACK_ICON = '01d';

export const WeatherWidget: React.FC<Props> = ({ tempC, iconCode }) => {
  const dayName = DAY_NAMES[new Date().getDay()];
  const safeCode = ICON_CODE_RE.test(iconCode) ? iconCode : FALLBACK_ICON;
  const iconUrl = `https://openweathermap.org/img/wn/${safeCode}.png`;

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: iconUrl }}
        style={styles.icon}
        accessibilityLabel="current weather icon"
      />
      <View style={styles.textGroup}>
        <Text style={styles.temp}>{tempC}°C</Text>
        <Text style={styles.day}>{dayName}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    width: 32,
    height: 32,
  },
  textGroup: {
    alignItems: 'flex-start',
  },
  temp: {
    ...theme.typography.aliases.poppinsButton,
    fontSize: 16,
    lineHeight: 20,
    color: theme.colors.figmaText,
  },
  day: {
    ...theme.typography.aliases.poppinsBody,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.figmaTextSecondary,
  },
});
