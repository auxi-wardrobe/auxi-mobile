import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TopIconButton } from '../../../components/primitives/FigmaPrimitives';
import { WeatherIcon } from '../../../components/atoms/WeatherIcon';
import { Icons } from '../../../assets/icons';
import type { HomeWeather } from '../hooks/useHomeWeather';
import { styles } from '../styles';

type Props = {
  greeting: string;
  weather: HomeWeather | null;
  /** Unopened results behind the bell — >0 shows the badge dot. */
  unseenNotifications: number;
  onOpenMenu: () => void;
  onOpenNotifications: () => void;
};

/**
 * Landing header: drawer button · notification button, then the time-of-day
 * greeting and today's weather.
 *
 * The bell is NOT a settings shortcut: it opens the results the user started
 * and walked away from (a finished "See this on me" render, a ready
 * Enhance-image studio shot) and carries an unread dot while any is unopened.
 *
 * The right-hand weather column shows the CONDITION reported by `/weather`.
 * That endpoint returns `{ temp_c, condition, icon_code }` and nothing else —
 * no locality, humidity, or feels-like — so there is no city line here rather
 * than a hardcoded one.
 */
export const HomeLandingHeader: React.FC<Props> = ({
  greeting,
  weather,
  unseenNotifications,
  onOpenMenu,
  onOpenNotifications,
}) => {
  const { t, i18n } = useTranslation();
  // Today's date, localised. The second weather line is a real fact about the
  // day rather than a "feels like" / humidity figure — `/weather` returns
  // neither, and inventing one would be worse than omitting it.
  const now = new Date();
  const todayLabel = now.toLocaleDateString(i18n.language, {
    day: 'numeric',
    month: 'long',
  });
  const weekdayLabel = now.toLocaleDateString(i18n.language, {
    weekday: 'long',
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
        {/* testID flips its suffix rather than going undefined, so Maestro can
            select the bell in either state (CLAUDE.md). */}
        <TopIconButton
          testID={
            unseenNotifications > 0
              ? 'home-landing-notifications-button-unread'
              : 'home-landing-notifications-button'
          }
          accessibilityRole="button"
          accessibilityLabel={
            unseenNotifications > 0
              ? t('homeLanding.a11y_notifications_unread', {
                  count: unseenNotifications,
                })
              : t('homeLanding.a11y_notifications')
          }
          onPress={onOpenNotifications}
          icon={
            <>
              <Icons.Bell width={24} height={24} />
              {unseenNotifications > 0 ? (
                <View style={styles.bellBadge} testID="home-landing-bell-badge" />
              ) : null}
            </>
          }
        />
      </View>

      <Text style={styles.greeting} testID="home-landing-greeting">
        {greeting}
      </Text>

      {weather ? (
        <View style={styles.weatherRow} testID="home-landing-weather">
          <View style={styles.weatherLeft}>
            <WeatherIcon code={weather.icon_code} size={35} />
            <View>
              <Text style={styles.weatherTemp} numberOfLines={1}>
                {t('homeLanding.weather_temp', {
                  temp: Math.round(weather.temp_c),
                })}
              </Text>
              <Text style={styles.weatherDay} numberOfLines={1}>
                {weekdayLabel}
              </Text>
            </View>
          </View>
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
