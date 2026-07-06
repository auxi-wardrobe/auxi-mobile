import { parseTokenParam, TOKEN_PARAM } from '../tokenParam';

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
