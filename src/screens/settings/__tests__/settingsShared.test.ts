import {
  DEFAULT_SETTINGS,
  getErrorMessage,
  resolveSettings,
} from '../settingsShared';

describe('resolveSettings', () => {
  it('null/undefined metadata → DEFAULT_SETTINGS', () => {
    expect(resolveSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(resolveSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('partial daily_notification → other fields fall back', () => {
    const r = resolveSettings({ daily_notification: { enabled: false } });
    expect(r.dailyNotification).toEqual({
      enabled: false,
      time: DEFAULT_SETTINGS.dailyNotification.time,
      period: DEFAULT_SETTINGS.dailyNotification.period,
      frequency: DEFAULT_SETTINGS.dailyNotification.frequency,
    });
    expect(r.styleDirection).toBe(DEFAULT_SETTINGS.styleDirection);
  });

  it('provided style_direction overrides default', () => {
    expect(
      resolveSettings({ style_direction: 'more_polished' }).styleDirection,
    ).toBe('more_polished');
  });
});

describe('getErrorMessage', () => {
  it('prefers detail[0].msg, then message, then fallback', () => {
    expect(
      getErrorMessage({ response: { data: { detail: [{ msg: 'bad' }] } } }, 'fb'),
    ).toBe('bad');
    expect(
      getErrorMessage({ response: { data: { message: 'nope' } } }, 'fb'),
    ).toBe('nope');
    expect(getErrorMessage(new Error('x'), 'fb')).toBe('fb');
  });
});
