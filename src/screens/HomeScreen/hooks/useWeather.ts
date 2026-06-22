import { useEffect, useState } from 'react';
import { weatherService } from '../../../services/weatherService';

export const useWeather = () => {
  const [weather, setWeather] = useState<{ tempC: number; iconCode: string }>({
    tempC: 22,
    iconCode: '01d',
  });

  useEffect(() => {
    weatherService
      .getWeather(21.0285, 105.8542)
      .then(w => setWeather({ tempC: w.temp_c, iconCode: w.icon_code }))
      .catch(() => {});
  }, []);

  return { weather };
};
