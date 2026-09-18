// `resolveItemImageSources` is the ordered chain behind every garment tile.
// Precedence must match the single-winner helper it replaced, and the list
// must stay free of empties and duplicates so the fallback walk terminates.

import { resolveItemImage, resolveItemImageSources } from '../url';

const CUTOUT = 'https://cdn.test/processed/cutout.png';
const STUDIO = 'https://cdn.test/processed/studio.png';
const ORIGINAL = 'https://cdn.test/common_items/TOP_W_U/SYS_L2_TEE.png';

describe('resolveItemImageSources', () => {
  it('orders studio, then cutout, then original', () => {
    expect(
      resolveItemImageSources({
        image_studio: STUDIO,
        image_png: CUTOUT,
        image_url: ORIGINAL,
      }),
    ).toEqual([STUDIO, CUTOUT, ORIGINAL]);
  });

  it('keeps the clone case intact: dead cutout first, live original last', () => {
    // An onboarding clone carries the SYSTEM item's processed URL verbatim.
    const sources = resolveItemImageSources({
      image_studio: null,
      image_png: CUTOUT,
      image_url: ORIGINAL,
    });

    expect(sources).toEqual([CUTOUT, ORIGINAL]);
  });

  it('drops empty and whitespace-only values', () => {
    expect(
      resolveItemImageSources({
        image_studio: '   ',
        image_png: '',
        image_url: ORIGINAL,
      }),
    ).toEqual([ORIGINAL]);
  });

  it('de-duplicates so the same URL is never retried as a fallback', () => {
    expect(
      resolveItemImageSources({
        image_studio: ORIGINAL,
        image_png: ORIGINAL,
        image_url: ORIGINAL,
      }),
    ).toEqual([ORIGINAL]);
  });

  it('returns [] when nothing resolves', () => {
    expect(
      resolveItemImageSources({
        image_studio: null,
        image_png: null,
        image_url: '',
      }),
    ).toEqual([]);
  });

  it('resolveItemImage still returns the single best candidate', () => {
    expect(
      resolveItemImage({
        image_studio: null,
        image_png: CUTOUT,
        image_url: ORIGINAL,
      }),
    ).toBe(CUTOUT);

    expect(
      resolveItemImage({
        image_studio: null,
        image_png: null,
        image_url: '',
      }),
    ).toBeUndefined();
  });
});
