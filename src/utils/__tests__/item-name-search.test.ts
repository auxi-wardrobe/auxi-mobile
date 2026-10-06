import { matchesItemName, normalizeSearchText } from '../item-name-search';

describe('item-name-search', () => {
  it('folds case and Vietnamese diacritics, including đ', () => {
    expect(normalizeSearchText('  Áo Sơ Mi ĐEN ')).toBe('ao so mi den');
  });

  it('matches every term in any order', () => {
    expect(matchesItemName('White Leather Sneakers', 'sneakers white')).toBe(
      true,
    );
    expect(matchesItemName('White Leather Sneakers', 'white boots')).toBe(
      false,
    );
  });

  it('matches accent-less queries against accented names', () => {
    expect(matchesItemName('Quần jean xanh', 'quan jean')).toBe(true);
    expect(matchesItemName('Đầm dạ hội', 'dam')).toBe(true);
  });

  it('treats a blank query as match-all and a missing name as no match', () => {
    expect(matchesItemName('Anything', '   ')).toBe(true);
    expect(matchesItemName(undefined, 'shirt')).toBe(false);
  });
});
