import React from 'react';
import { Image, ImageSourcePropType } from 'react-native';

type Props = {
  code?: string; // OpenWeather icon code, e.g. "10d"
  size?: number; // square px, default 32
};

const ICON_MAP: Record<string, ImageSourcePropType> = {
  '01d': require('../../assets/images/weather/weather_clear_day.png'),
  '01n': require('../../assets/images/weather/weather_clear_night.png'),
  '02d': require('../../assets/images/weather/weather_few_clouds_day.png'),
  '02n': require('../../assets/images/weather/weather_few_clouds_night.png'),
  '03d': require('../../assets/images/weather/weather_cloudy_day.png'),
  '03n': require('../../assets/images/weather/weather_cloudy_night.png'),
  '04d': require('../../assets/images/weather/weather_cloudy_day.png'),
  '04n': require('../../assets/images/weather/weather_cloudy_night.png'),
  '09d': require('../../assets/images/weather/weather_shower_rain.png'),
  '09n': require('../../assets/images/weather/weather_shower_rain.png'),
  '10d': require('../../assets/images/weather/weather_rain_day.png'),
  '10n': require('../../assets/images/weather/weather_rain_night.png'),
  '11d': require('../../assets/images/weather/weather_thunderstorm_day.png'),
  '11n': require('../../assets/images/weather/weather_thunderstorm_night.png'),
  '13d': require('../../assets/images/weather/weather_overcast.png'),
  '13n': require('../../assets/images/weather/weather_overcast.png'),
  '50d': require('../../assets/images/weather/weather_mist.png'),
  '50n': require('../../assets/images/weather/weather_mist.png'),
};

const FALLBACK = require('../../assets/images/weather/weather_cloudy_day.png');

export const WeatherIcon: React.FC<Props> = ({ code = '01d', size = 32 }) => (
  <Image
    source={ICON_MAP[code] ?? FALLBACK}
    style={{ width: size, height: size }}
    resizeMode="contain"
    accessibilityLabel="current weather icon"
  />
);
