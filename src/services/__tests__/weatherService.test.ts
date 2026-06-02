/**
 * Regression tests for AU-306: cold weather outfit suggestions feel inappropriate.
 *
 * weatherService previously masked any /weather failure as a warm 22°C, hiding
 * cold conditions and producing too-light outfits. It now logs the failure,
 * falls back to the last cached reading, and only as a last resort returns a
 * MILD (18°C) placeholder — never a silent warm default.
 *
 * Contract verified:
 * - Returns the real temperature from the API on success (and caches it).
 * - On failure with a cached reading, returns the cached value.
 * - On failure with no cache, returns the MILD NEUTRAL_WEATHER placeholder
 *   (resolves, never rejects, so the Home weather gate always settles) and logs.
 */

import { NEUTRAL_WEATHER, weatherService } from '../weatherService';
import { apiClient } from '../apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';

jest.mock('../apiClient', () => ({
  apiClient: { get: jest.fn() },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedGetItem = AsyncStorage.getItem as jest.Mock;
const mockedSetItem = AsyncStorage.setItem as jest.Mock;
const mockedBreadcrumb = Sentry.addBreadcrumb as jest.Mock;

describe('weatherService.getWeather', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedGetItem.mockReset();
    mockedSetItem.mockReset();
    mockedBreadcrumb.mockReset();
    mockedSetItem.mockResolvedValue(undefined);
    mockedGetItem.mockResolvedValue(null);
  });

  it('returns the real temperature from the API on success and caches it', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { temp_c: 9.5, condition: 'Snow', icon_code: '13d' },
    });

    const result = await weatherService.getWeather(21.0285, 105.8542);

    expect(result.temp_c).toBe(9.5);
    expect(result.icon_code).toBe('13d');
    expect(mockedSetItem).toHaveBeenCalledWith(
      'auxi:last_known_weather',
      JSON.stringify({ temp_c: 9.5, condition: 'Snow', icon_code: '13d' }),
    );
  });

  it('falls back to the last cached reading when the API fails', async () => {
    const cached = { temp_c: 4, condition: 'Clouds', icon_code: '04d' };
    mockedGetItem.mockResolvedValueOnce(JSON.stringify(cached));
    mockedGet.mockRejectedValueOnce(new Error('network error'));

    const result = await weatherService.getWeather(21.0285, 105.8542);

    expect(result).toEqual(cached);
    expect(mockedBreadcrumb).toHaveBeenCalled();
  });

  it('returns the MILD neutral placeholder (not warm 22) when API fails and no cache', async () => {
    mockedGet.mockRejectedValueOnce(new Error('network error'));

    const result = await weatherService.getWeather(21.0285, 105.8542);

    expect(result).toEqual(NEUTRAL_WEATHER);
    expect(NEUTRAL_WEATHER.temp_c).toBe(18);
    expect(mockedBreadcrumb).toHaveBeenCalled();
  });

  it('passes lat/lon to the API endpoint', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { temp_c: 15, condition: 'Cloudy', icon_code: '04d' },
    });

    await weatherService.getWeather(48.8566, 2.3522);

    expect(mockedGet).toHaveBeenCalledWith('/weather', {
      params: { lat: 48.8566, lon: 2.3522 },
    });
  });
});

describe('weatherService.getLastKnownWeather', () => {
  beforeEach(() => {
    mockedGetItem.mockReset();
  });

  it('returns parsed cached weather when present', async () => {
    const cached = { temp_c: 7, condition: 'Rain', icon_code: '10d' };
    mockedGetItem.mockResolvedValueOnce(JSON.stringify(cached));
    await expect(weatherService.getLastKnownWeather()).resolves.toEqual(cached);
  });

  it('returns null when nothing is cached', async () => {
    mockedGetItem.mockResolvedValueOnce(null);
    await expect(weatherService.getLastKnownWeather()).resolves.toBeNull();
  });
});
