import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TopIconButton } from '../../../components/primitives/FigmaPrimitives';
import IconMenu from '../../../assets/images/icon_menu.svg';
import IconHomeHeartOutline from '../../../assets/images/icon_home_heart_outline.svg';
import { WeatherWidget } from '../../../components/features/WeatherWidget';
import { TemperatureOverrideIndicator } from '../../../components/features/TemperatureOverrideIndicator';
import {
  bucketLabel,
  type TemperatureBucketKey,
} from '../../../config/temperature-buckets';
import { styles } from '../styles';

type HomeHeaderProps = {
  onOpenMenu: () => void;
  isOverrideActive: boolean;
  activeBucketKey: TemperatureBucketKey;
  weather: { tempC: number; iconCode: string };
  onOpenTemp: () => void;
  hasUnseenFavourites: boolean;
  onOpenFavourites: () => void;
};

/**
 * Home top bar: menu button · weather / temperature-override trigger ·
 * favourites shortcut (with unseen dot). Purely presentational — all actions
 * are delegated to the screen.
 */
export const HomeHeader = ({
  onOpenMenu,
  isOverrideActive,
  activeBucketKey,
  weather,
  onOpenTemp,
  hasUnseenFavourites,
  onOpenFavourites,
}: HomeHeaderProps) => {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <TopIconButton
        testID="home-menu-button"
        accessibilityRole="button"
        accessibilityLabel={t('home.a11y_open_menu')}
        onPress={onOpenMenu}
        icon={<IconMenu width={24} height={24} />}
        style={styles.headerIconButton}
      />

      {isOverrideActive ? (
        <TemperatureOverrideIndicator
          label={bucketLabel(t, activeBucketKey, weather.tempC)}
          onPress={onOpenTemp}
        />
      ) : (
        <TouchableOpacity
          testID="home-weather-temp-trigger"
          accessibilityRole="button"
          accessibilityLabel={t('home.a11y_temp_idle')}
          activeOpacity={0.82}
          onPress={onOpenTemp}
        >
          <WeatherWidget
            tempC={weather.tempC}
            iconCode={weather.iconCode}
            showChevron
          />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        testID="home-favourites-shortcut"
        accessibilityRole="button"
        accessibilityLabel={
          hasUnseenFavourites
            ? t('home.a11y_open_favourites_new')
            : t('home.a11y_open_favourites')
        }
        activeOpacity={0.82}
        style={styles.headerIconButton}
        onPress={onOpenFavourites}
      >
        <IconHomeHeartOutline width={24} height={24} />
        {hasUnseenFavourites ? (
          <View
            testID="home-favourites-badge"
            style={styles.favDot}
            pointerEvents="none"
          />
        ) : null}
      </TouchableOpacity>
    </View>
  );
};
