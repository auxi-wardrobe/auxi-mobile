import React from 'react';
import ClearDay from '../../assets/images/weather/weather_clear_day.svg';
import ClearNight from '../../assets/images/weather/weather_clear_night.svg';
import FewCloudsDay from '../../assets/images/weather/weather_few_clouds_day.svg';
import FewCloudsNight from '../../assets/images/weather/weather_few_clouds_night.svg';
import CloudyDay from '../../assets/images/weather/weather_cloudy_day.svg';
import CloudyNight from '../../assets/images/weather/weather_cloudy_night.svg';
import Overcast from '../../assets/images/weather/weather_overcast.svg';
import ShowerRain from '../../assets/images/weather/weather_shower_rain.svg';
import RainDay from '../../assets/images/weather/weather_rain_day.svg';
import RainNight from '../../assets/images/weather/weather_rain_night.svg';
import ThunderstormDay from '../../assets/images/weather/weather_thunderstorm_day.svg';
import ThunderstormNight from '../../assets/images/weather/weather_thunderstorm_night.svg';
import Mist from '../../assets/images/weather/weather_mist.svg';

type Props = {
  code?: string; // OpenWeather icon code, e.g. "10d"
  size?: number; // square px, default 32
};

type SvgComponent = React.FC<{ width: number; height: number }>;

// OpenWeather 2-char group + day/night suffix → Figma SVG icon (node 1767:9974)
const ICON_MAP: Record<string, SvgComponent> = {
  '01d': ClearDay,
  '01n': ClearNight,
  '02d': FewCloudsDay,
  '02n': FewCloudsNight,
  '03d': CloudyDay,
  '03n': CloudyNight,
  '04d': CloudyDay,
  '04n': CloudyNight,
  '09d': ShowerRain,
  '09n': ShowerRain,
  '10d': RainDay,
  '10n': RainNight,
  '11d': ThunderstormDay,
  '11n': ThunderstormNight,
  '13d': Overcast,
  '13n': Overcast,
  '50d': Mist,
  '50n': Mist,
};

export const WeatherIcon: React.FC<Props> = ({ code = '01d', size = 32 }) => {
  const Icon: SvgComponent = ICON_MAP[code] ?? CloudyDay;
  return <Icon width={size} height={size} />;
};
