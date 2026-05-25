import { apiClient } from './apiClient';

export type WeatherData = {
  temp_c: number;
  condition: string;
  icon_code: string;
};

const MOCK_FALLBACK: WeatherData = {
  temp_c: 22,
  condition: 'Clear',
  icon_code: '01d',
};

export const weatherService = {
  async getWeather(lat: number, lon: number): Promise<WeatherData> {
    try {
      const res = await apiClient.get<WeatherData>('/weather', {
        params: { lat, lon },
      });
      return res.data;
    } catch {
      return MOCK_FALLBACK;
    }
  },
};
