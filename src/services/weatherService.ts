const OPENWEATHER_BASE = 'https://api.openweathermap.org/data/2.5';
// NOTE: replace empty string with your OpenWeather API key to enable live data.
// Falls back to a sunny mock when empty.
const API_KEY = '';

const MOCK_FALLBACK = { temp_c: 22, condition: 'Clear', icon: '01d' };

export type WeatherData = {
  temp_c: number;
  condition: string;
  icon: string;
};

export const weatherService = {
  async getWeather(lat: number, lon: number): Promise<WeatherData> {
    if (!API_KEY) {
      return MOCK_FALLBACK;
    }
    try {
      const res = await fetch(
        `${OPENWEATHER_BASE}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`,
      );
      if (!res.ok) {
        return MOCK_FALLBACK;
      }
      const data = await res.json();
      return {
        temp_c: Math.round(data.main.temp),
        condition: data.weather[0]?.main ?? 'Clear',
        icon: data.weather[0]?.icon ?? '01d',
      };
    } catch {
      return MOCK_FALLBACK;
    }
  },
};
