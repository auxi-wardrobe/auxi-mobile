import { useEffect, useState } from 'react';
import {
  weatherService,
  type WeatherData,
} from '../../../services/weatherService';
import { getCurrentLocation } from '../../../utils/location';

// Landing-page weather. Same `/weather` endpoint the Home recommender uses,
// but it asks the device for real coordinates first and only falls back to the
// app's default coords when the permission was never granted / the fix times
// out. (`HomeScreen/hooks/useWeather` hardcodes the fallback coords inline;
// they're exported here so there is one source of truth for the default.)
//
// NOTE ON COPY: `/weather` returns `{ temp_c, condition, icon_code }` only —
// there is no city name, humidity, or feels-like in the payload, so the header
// renders the condition rather than inventing a locality.
export const DEFAULT_LAT = 21.0285;
export const DEFAULT_LON = 105.8542;

export type HomeWeather = WeatherData & { isFallbackLocation: boolean };

export const useHomeWeather = () => {
  const [weather, setWeather] = useState<HomeWeather | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      let lat = DEFAULT_LAT;
      let lon = DEFAULT_LON;
      let isFallbackLocation = true;
      try {
        const position = await getCurrentLocation();
        lat = position.latitude;
        lon = position.longitude;
        isFallbackLocation = false;
      } catch {
        // No permission / no fix — the service's own last-known + neutral
        // fallbacks still give the user a sane reading.
      }
      // `getWeather` never rejects (it falls back to last-known, then neutral),
      // so a `.catch` here would be dead code.
      const data = await weatherService.getWeather(lat, lon);
      if (!cancelled) {
        setWeather({ ...data, isFallbackLocation });
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { weather };
};
