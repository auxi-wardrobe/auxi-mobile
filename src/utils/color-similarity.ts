/**
 * Perceptual colour similarity — "is this garment close enough to one of my
 * best colours?" (Wardrobe Analysis skin-tone card).
 *
 * Distance is CIEDE2000 (ΔE00), the standard perceptual colour difference,
 * with the lightness weight kL = 2 — the textile convention (as in CMC 2:1):
 * people read a light and a dark shade of one hue as "the same colour"
 * (navy ↔ light navy, dark ↔ light yellow) far more readily than two hues of
 * similar lightness. Plain ΔE00 (kL = 1) rated dark ↔ light yellow (21) as
 * further apart than black ↔ navy (18), which is the opposite of what users
 * expect.
 *
 * Similarity = 1 − ΔE / SIMILARITY_SCALE, clamped to 0..1. With scale 50 the
 * 70% threshold is ΔE ≤ 15, which gives (kL = 2):
 *   navy ↔ light navy 87% ✓ · dark ↔ light yellow 72% ✓ · blue ↔ baby blue
 *   83% ✓ · black ↔ soft navy 68% ✗ · red ↔ dusty rose 57% ✗ · navy ↔ mint
 *   19% ✗.
 */

export const SIMILARITY_THRESHOLD = 0.7;
const SIMILARITY_SCALE = 50;
const LIGHTNESS_WEIGHT = 2;

export type Lab = [number, number, number];

const HEX_PATTERN = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i;

export const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && HEX_PATTERN.test(value.trim());

const hexToRgb = (hex: string): [number, number, number] => {
  let body = hex.trim().replace('#', '');
  if (body.length === 3) {
    body = body
      .split('')
      .map(ch => ch + ch)
      .join('');
  }
  return [0, 2, 4].map(i => parseInt(body.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
};

// sRGB (D65) → CIELAB.
const hexToLab = (hex: string): Lab => {
  const linear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const [r, g, b] = hexToRgb(hex).map(linear);
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/**
 * CIEDE2000 colour difference between two CIELAB colours (Sharma, Wu &
 * Dalal 2005), with a lightness weight `kL` (1 = standard).
 */
export const deltaE2000Lab = (
  [L1, a1, b1]: Lab,
  [L2, a2, b2]: Lab,
  kL: number = 1,
): number => {
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar7 = ((C1 + C2) / 2) ** 7;
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const hue = (a: number, b: number) => {
    if (a === 0 && b === 0) return 0;
    const h = toDeg(Math.atan2(b, a));
    return h < 0 ? h + 360 : h;
  };
  const h1p = hue(a1p, b1);
  const h2p = hue(a2p, b2);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(toRad(dhp / 2));

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbarp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hbarp += h1p + h2p < 360 ? 360 : -360;
    hbarp /= 2;
  }
  const T =
    1 -
    0.17 * Math.cos(toRad(hbarp - 30)) +
    0.24 * Math.cos(toRad(2 * hbarp)) +
    0.32 * Math.cos(toRad(3 * hbarp + 6)) -
    0.2 * Math.cos(toRad(4 * hbarp - 63));
  const dTheta = 30 * Math.exp(-(((hbarp - 275) / 25) ** 2));
  const Cbarp7 = Cbarp ** 7;
  const RC = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + 25 ** 7));
  const SL =
    1 + (0.015 * (Lbarp - 50) ** 2) / Math.sqrt(20 + (Lbarp - 50) ** 2);
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;
  const RT = -Math.sin(toRad(2 * dTheta)) * RC;

  const lTerm = dLp / (kL * SL);
  const cTerm = dCp / SC;
  const hTerm = dHp / SH;
  return Math.sqrt(lTerm ** 2 + cTerm ** 2 + hTerm ** 2 + RT * cTerm * hTerm);
};

/** CIEDE2000 between two sRGB hex colours. */
export const deltaE2000 = (
  hexA: string,
  hexB: string,
  kL: number = 1,
): number => deltaE2000Lab(hexToLab(hexA), hexToLab(hexB), kL);

/** 0..1 — how alike two colours look (1 = identical). */
export const colorSimilarity = (hexA: string, hexB: string): number =>
  Math.max(0, 1 - deltaE2000(hexA, hexB, LIGHTNESS_WEIGHT) / SIMILARITY_SCALE);

/** True when `hex` is at least SIMILARITY_THRESHOLD alike to any of `palette`. */
export const isSimilarToAny = (hex: string, palette: string[]): boolean =>
  palette.some(p => colorSimilarity(hex, p) >= SIMILARITY_THRESHOLD);
