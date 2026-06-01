import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { apiClient } from './apiClient';

export type WeatherData = {
  temp_c: number;
  condition: string;
  icon_code: string;
};

const LAST_WEATHER_KEY = 'auxi:last_known_weather';

// AU-306: last-resort reading used only when the API fails AND nothing is
// cached (e.g. first launch while offline). It is logged whenever used and is
// deliberately a MILD placeholder, not the old warm 22°C "all clear" default
// that silently masked cold weather and produced too-light outfits.
export const NEUTRAL_WEATHER: WeatherData = {
  temp_c: 18,
  condition: 'Clouds',
  icon_code: '03d',
};

export const weatherService = {
  async getWeather(lat: number, lon: number): Promise<WeatherData> {
    try {
      const res = await apiClient.get<WeatherData>('/weather', {
        params: { lat, lon },
      });
      // Cache the latest good reading so a later failure can fall back to a
      // real recent temperature instead of a warm constant.
      AsyncStorage.setItem(LAST_WEATHER_KEY, JSON.stringify(res.data)).catch(
        () => {},
      );
      return res.data;
    } catch (err) {
      // AU-306: surface the failure instead of silently returning warm weather.
      console.warn('[weatherService] /weather request failed', err);
      Sentry.addBreadcrumb({
        category: 'weather',
        level: 'warning',
        message: 'weather fetch failed; falling back to last-known/neutral',
      });
      const cached = await weatherService.getLastKnownWeather();
      return cached ?? NEUTRAL_WEATHER;
    }
  },

  async getLastKnownWeather(): Promise<WeatherData | null> {
    try {
      const raw = await AsyncStorage.getItem(LAST_WEATHER_KEY);
      return raw ? (JSON.parse(raw) as WeatherData) : null;
    } catch {
      return null;
    }
  },
};
