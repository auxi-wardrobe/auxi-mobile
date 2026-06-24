import {
  authStateForSearch,
  findScreen,
  parseScreenKey,
  screenForSearch,
  SCREEN_PARAM,
} from '../screen-intent';
import { SHAREABLE_SCREENS } from '../shareable-screens';

describe('screen-intent', () => {
  describe('parseScreenKey', () => {
    it('reads the screen param from a search string', () => {
      expect(parseScreenKey('?screen=wardrobe')).toBe('wardrobe');
      expect(parseScreenKey('?embed=1&screen=home')).toBe('home');
    });
    it('returns null when absent or malformed', () => {
      expect(parseScreenKey('')).toBeNull();
      expect(parseScreenKey('?embed=1')).toBeNull();
    });
    it('uses the SCREEN_PARAM constant', () => {
      expect(parseScreenKey(`?${SCREEN_PARAM}=settings`)).toBe('settings');
    });
  });

  describe('findScreen', () => {
    it('resolves a known key', () => {
      expect(findScreen('wardrobe')?.target).toEqual({
        kind: 'app',
        name: 'Wardrobe',
      });
    });
    it('returns undefined for unknown / empty keys', () => {
      expect(findScreen('does-not-exist')).toBeUndefined();
      expect(findScreen(null)).toBeUndefined();
      expect(findScreen(undefined)).toBeUndefined();
    });
  });

  describe('authStateForSearch', () => {
    it('maps logged-out / onboarding / app screens', () => {
      expect(authStateForSearch('?screen=welcome')).toBe('logged-out');
      expect(authStateForSearch('?screen=onboarding-wardrobe')).toBe(
        'first-login',
      );
      expect(authStateForSearch('?screen=home')).toBe('app');
    });
    it('defaults to app for no / unknown screen (today behavior)', () => {
      expect(authStateForSearch('')).toBe('app');
      expect(authStateForSearch('?screen=nope')).toBe('app');
    });
  });

  describe('screenForSearch', () => {
    it('round-trips a registry entry from a search string', () => {
      const s = screenForSearch('?embed=1&screen=design-system');
      expect(s?.key).toBe('design-system');
      expect(s?.group).toBe('App');
    });
  });

  describe('registry invariants', () => {
    it('has unique, non-empty keys', () => {
      const keys = SHAREABLE_SCREENS.map(s => s.key);
      expect(new Set(keys).size).toBe(keys.length);
      expect(keys.every(k => k.length > 0)).toBe(true);
    });
    it('auth-state and target kind agree (logged-out ⇒ auth target)', () => {
      for (const s of SHAREABLE_SCREENS) {
        if (s.authState === 'logged-out') {
          expect(s.target.kind).toBe('auth');
        } else {
          expect(s.target.kind).toBe('app');
        }
      }
    });
  });
});
