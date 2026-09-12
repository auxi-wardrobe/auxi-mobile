import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TopIconButton } from '../../../components/primitives/FigmaPrimitives';
import { WeatherWidget } from '../../../components/features/WeatherWidget';
import { Icons } from '../../../assets/icons';
import type { HomeWeather } from '../hooks/useHomeWeather';
import { styles } from '../styles';

type Props = {
  greeting: string;
  weather: HomeWeather | null;
  onOpenMenu: () => void;
  onOpenNotifications: () => void;
};

/**
 * Landing header: drawer button · notification button, then the time-of-day
 * greeting and today's weather.
 *
 * The right-hand weather column shows the CONDITION reported by `/weather`.
 * That endpoint returns `{ temp_c, condition, icon_code }` and nothing else —
 * no locality, humidity, or feels-like — so there is no city line here rather
 * than a hardcoded one.
 */
export const HomeLandingHeader: React.FC<Props> = ({
  greeting,
  weather,
  onOpenMenu,
  onOpenNotifications,
}) => {
  const { t, i18n } = useTranslation();
  // Today's date, localised. The second weather line is a real fact about the
  // day rather than a "feels like" / humidity figure — `/weather` returns
  // neither, and inventing one would be worse than omitting it.
  const todayLabel = new Date().toLocaleDateString(i18n.language, {
    day: 'numeric',
    month: 'long',
  });

  return (
    <View>
      <View style={styles.headerRow}>
        <TopIconButton
          testID="home-landing-menu-button"
          accessibilityRole="button"
          accessibilityLabel={t('home.a11y_open_menu')}
          onPress={onOpenMenu}
          icon={<Icons.Menu width={24} height={24} />}
        />
        <TopIconButton
          testID="home-landing-notifications-button"
          accessibilityRole="button"
          accessibilityLabel={t('homeLanding.a11y_notifications')}
          onPress={onOpenNotifications}
          icon={<Icons.Bell width={24} height={24} />}
        />
      </View>

      <Text style={styles.greeting} testID="home-landing-greeting">
        {greeting}
      </Text>

      {weather ? (
        <View style={styles.weatherRow} testID="home-landing-weather">
          <WeatherWidget
            tempC={Math.round(weather.temp_c)}
            iconCode={weather.icon_code}
          />
          <View style={styles.weatherRight}>
            <Text style={styles.weatherCondition} numberOfLines={1}>
              {weather.condition}
            </Text>
            <Text style={styles.weatherDetail} numberOfLines={1}>
              {todayLabel}
            </Text>
          </View>
        </View>
      ) : (
        // Reserve the row's height so the sections below don't jump when the
        // reading lands.
        <View style={[styles.weatherRow, styles.weatherPlaceholder]} />
      )}
    </View>
  );
};
