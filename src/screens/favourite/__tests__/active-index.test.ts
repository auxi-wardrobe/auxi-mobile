import { computeActiveIndex, ActiveIndexEntry } from '../active-index';

describe('computeActiveIndex (#164 sticky action bar)', () => {
  // Two date groups: d1 holds cards a,b; d2 holds card c. Absolute Y of each
  // card = group Y + card Y: a=0+30=30, b=0+280=280, c=500+30=530.
  const entries: ActiveIndexEntry[] = [
    { dayKey: 'd1', id: 'a' },
    { dayKey: 'd1', id: 'b' },
    { dayKey: 'd2', id: 'c' },
  ];
  const groupY = { d1: 0, d2: 500 };
  const cardY = { a: 30, b: 280, c: 30 };

  it('returns the first card at the top of the list', () => {
    expect(computeActiveIndex(entries, groupY, cardY, 0)).toBe(0);
  });

  it('picks the nearest card as the scroll offset moves down', () => {
    // 200 is closer to b(280) than a(30).
    expect(computeActiveIndex(entries, groupY, cardY, 200)).toBe(1);
    // 520 is closest to c(530).
    expect(computeActiveIndex(entries, groupY, cardY, 520)).toBe(2);
  });

  it('snaps to the exact card offset', () => {
    expect(computeActiveIndex(entries, groupY, cardY, 280)).toBe(1);
    expect(computeActiveIndex(entries, groupY, cardY, 530)).toBe(2);
  });

  it('clamps to the last card when scrolled past the end', () => {
    expect(computeActiveIndex(entries, groupY, cardY, 99999)).toBe(2);
  });

  it('skips cards whose group/card layout is not yet measured', () => {
    // Only d1 + card a measured: every other entry is skipped, so even a large
    // offset resolves to the one measured card (index 0).
    expect(computeActiveIndex(entries, { d1: 0 }, { a: 30 }, 800)).toBe(0);
  });

  it('returns 0 (safe default) when nothing is measured', () => {
    expect(computeActiveIndex(entries, {}, {}, 400)).toBe(0);
  });
});
