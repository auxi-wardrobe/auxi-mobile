import { ITEM_HIT_AREA_RATIO, getItemHitArea } from '../canvas-hit-area';

describe('getItemHitArea — canvas item touch target', () => {
  it('returns a centered content box at the configured ratio', () => {
    // 100x100 frame, ratio 0.72 → 72x72 box centered with a 14px inset per side.
    const hit = getItemHitArea(100, 100);
    expect(hit.left).toBeCloseTo(14);
    expect(hit.top).toBeCloseTo(14);
    expect(hit.width).toBeCloseTo(72);
    expect(hit.height).toBeCloseTo(72);
  });

  it('scales width and height independently for a non-square frame', () => {
    const hit = getItemHitArea(200, 300);
    expect(hit.width).toBeCloseTo(200 * ITEM_HIT_AREA_RATIO);
    expect(hit.height).toBeCloseTo(300 * ITEM_HIT_AREA_RATIO);
    // Inset = half the removed margin on each axis → box stays centered.
    expect(hit.left).toBeCloseTo((200 - hit.width) / 2);
    expect(hit.top).toBeCloseTo((300 - hit.height) / 2);
  });

  it('is strictly smaller than the frame so the transparent margin falls through', () => {
    const hit = getItemHitArea(120, 120);
    expect(hit.width).toBeLessThan(120);
    expect(hit.height).toBeLessThan(120);
    expect(hit.left).toBeGreaterThan(0);
    expect(hit.top).toBeGreaterThan(0);
  });

  it('keeps the hit box fully inside the frame', () => {
    const w = 250;
    const h = 180;
    const hit = getItemHitArea(w, h);
    expect(hit.left + hit.width).toBeLessThanOrEqual(w);
    expect(hit.top + hit.height).toBeLessThanOrEqual(h);
  });
});
