import { parseTokenParam, stripTokenFromUrl, TOKEN_PARAM } from '../tokenParam';

describe('parseTokenParam', () => {
  it('reads a non-empty token param', () => {
    expect(parseTokenParam('?embed=1&token=abc.def')).toBe('abc.def');
    expect(parseTokenParam(`?${TOKEN_PARAM}=xyz`)).toBe('xyz');
  });
  it('returns null when absent or empty', () => {
    expect(parseTokenParam('')).toBeNull();
    expect(parseTokenParam('?embed=1')).toBeNull();
    expect(parseTokenParam('?token=')).toBeNull();
  });
  it('returns null on malformed input', () => {
    expect(parseTokenParam('%')).toBeNull();
  });
});

describe('stripTokenFromUrl', () => {
  const origLocation = (globalThis as any).location;
  const origHistory = (globalThis as any).history;
  afterEach(() => {
    (globalThis as any).location = origLocation;
    (globalThis as any).history = origHistory;
  });

  it('removes token but keeps other params, via replaceState (no reload)', () => {
    let replacedUrl: string | null = null;
    (globalThis as any).location = {
      search: '?embed=1&token=secret.jwt&screen=home',
      pathname: '/',
    };
    (globalThis as any).history = {
      replaceState: (_s: unknown, _t: unknown, url: string) => {
        replacedUrl = url;
      },
    };
    stripTokenFromUrl();
    expect(replacedUrl).toBe('/?embed=1&screen=home');
  });

  it('is a no-op when there is no token param', () => {
    let called = false;
    (globalThis as any).location = { search: '?embed=1', pathname: '/' };
    (globalThis as any).history = {
      replaceState: () => {
        called = true;
      },
    };
    stripTokenFromUrl();
    expect(called).toBe(false);
  });
});
