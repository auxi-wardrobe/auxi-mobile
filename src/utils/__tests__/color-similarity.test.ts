import {
  SIMILARITY_THRESHOLD,
  colorSimilarity,
  deltaE2000,
  deltaE2000Lab,
  type Lab,
  isHexColor,
  isSimilarToAny,
} from '../color-similarity';

describe('deltaE2000Lab — Sharma et al. (2005) reference pairs', () => {
  it.each<[Lab, Lab, number]>([
    [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
    [[50, 0, 0], [50, -1, 2], 2.3669],
    [[50, 2.5, 0], [73, 25, -18], 27.1492],
    [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
    [[22.7233, 20.0904, -46.694], [23.0331, 14.973, -42.5619], 2.0373],
    [[2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514], 0.9082],
  ])('%j vs %j → %f', (a, b, expected) => {
    expect(deltaE2000Lab(a, b)).toBeCloseTo(expected, 3);
  });
});

describe('deltaE2000', () => {
  it('is 0 for identical colours and symmetric', () => {
    expect(deltaE2000('#193579', '#193579')).toBeCloseTo(0, 6);
    expect(deltaE2000('#193579', '#c3ebe3')).toBeCloseTo(
      deltaE2000('#c3ebe3', '#193579'),
      6,
    );
  });

  it('matches the CIEDE2000 reference for black ↔ white (100)', () => {
    expect(deltaE2000('#000000', '#ffffff')).toBeCloseTo(100, 0);
  });

  it('halves a pure-lightness difference with kL = 2', () => {
    expect(deltaE2000('#000000', '#ffffff', 2)).toBeCloseTo(50, 0);
  });
});

describe('colorSimilarity (≥70% counts as similar)', () => {
  it.each([
    ['navy ↔ light navy', '#193579', '#3b5998', true],
    ['dark ↔ light yellow', '#c9a400', '#fff59d', true],
    ['mustard ↔ pale yellow', '#e1ad01', '#f8e27a', true],
    ['blue ↔ baby blue', '#5b8fd1', '#a0c2f1', true],
    ['white ↔ pearl white', '#ffffff', '#f4f0ed', true],
    ['black ↔ soft navy', '#17181c', '#233661', false],
    ['red ↔ dusty rose', '#c62828', '#cc8698', false],
    ['navy ↔ mint', '#193579', '#c3ebe3', false],
    ['white ↔ black', '#ffffff', '#000000', false],
  ])('%s → %s', (_name, a, b, similar) => {
    expect(colorSimilarity(a, b) >= SIMILARITY_THRESHOLD).toBe(similar);
  });

  it('is 1 for identical colours and never negative', () => {
    expect(colorSimilarity('#abc', '#aabbcc')).toBeCloseTo(1, 6);
    expect(colorSimilarity('#ffffff', '#000000')).toBeGreaterThanOrEqual(0);
  });
});

describe('isSimilarToAny / isHexColor', () => {
  it('matches against any colour in the palette', () => {
    expect(isSimilarToAny('#3b5998', ['#c3ebe3', '#193579'])).toBe(true);
    expect(isSimilarToAny('#c62828', ['#c3ebe3', '#193579'])).toBe(false);
  });

  it('validates hex strings', () => {
    expect(isHexColor('#7BA5D6')).toBe(true);
    expect(isHexColor('fff')).toBe(true);
    expect(isHexColor('light blue')).toBe(false);
    expect(isHexColor(['#fff'])).toBe(false);
  });
});
