/**
 * Regression tests for AU-306: cold weather outfit suggestions feel inappropriate.
 *
 * Root cause: HomeScreen initialised weather state to 22°C and fired the first
 * recommendation before the async weather fetch completed. The engine received
 * the placeholder temperature (WARM bucket) instead of the real temperature
 * (COOL/MILD bucket), producing warm-weather outfits for cold conditions.
 *
 * Fix: HomeScreen now gates the initial recommendation behind a `weatherLoaded`
 * flag that becomes true only after `weatherService.getWeather` settles.
 *
 * These tests verify the weatherService contract:
 * - Returns the real temperature from the API when the call succeeds.
 * - Returns an explicit numeric fallback (not undefined/null) when the call
 *   fails, so the gating logic always receives a valid temperature.
 */

import { weatherService } from '../weatherService';
import { apiClient } from '../apiClient';

jest.mock('../apiClient', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const mockedGet = apiClient.get as jest.Mock;

describe('weatherService.getWeather', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('returns the real temperature from the API on success', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { temp_c: 9.5, condition: 'Snow', icon_code: '13d' },
    });

    const result = await weatherService.getWeather(21.0285, 105.8542);

    expect(result.temp_c).toBe(9.5);
    expect(result.icon_code).toBe('13d');
  });

  it('returns an explicit numeric fallback when the API call fails', async () => {
    mockedGet.mockRejectedValueOnce(new Error('network error'));

    // Must resolve (not reject) so HomeScreen's .finally() always fires
    // and `weatherLoaded` is always set to true.
    const result = await weatherService.getWeather(21.0285, 105.8542);

    expect(result).toBeDefined();
    expect(typeof result.temp_c).toBe('number');
    expect(result.temp_c).toBe(22);
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
