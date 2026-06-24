import { REFINE_AFTER_OUTFITS } from '../constants';
import {
  registerTierView,
  shouldOpenRefineGate,
  shouldPauseGeneration,
} from '../refinement-gate';

// REFINE_AFTER_OUTFITS is 6 (2 batches of 3). The tests below are written
// against the constant so they stay correct if the tier size is re-tuned.

describe('shouldPauseGeneration', () => {
  it('does not pause below a full tier', () => {
    expect(shouldPauseGeneration(0, false)).toBe(false);
    expect(shouldPauseGeneration(REFINE_AFTER_OUTFITS - 1, false)).toBe(false);
  });

  it('pauses once a tier of outfits exists', () => {
    expect(shouldPauseGeneration(REFINE_AFTER_OUTFITS, false)).toBe(true);
    expect(shouldPauseGeneration(REFINE_AFTER_OUTFITS + 3, false)).toBe(true);
  });

  it('a forced fetch bypasses the pause regardless of count', () => {
    expect(shouldPauseGeneration(REFINE_AFTER_OUTFITS, true)).toBe(false);
    expect(shouldPauseGeneration(REFINE_AFTER_OUTFITS * 2, true)).toBe(false);
  });
});

describe('shouldOpenRefineGate', () => {
  it('stays closed before the threshold of distinct views', () => {
    expect(shouldOpenRefineGate(0, false)).toBe(false);
    expect(shouldOpenRefineGate(REFINE_AFTER_OUTFITS - 1, false)).toBe(false);
  });

  it('opens at exactly the threshold', () => {
    expect(shouldOpenRefineGate(REFINE_AFTER_OUTFITS, false)).toBe(true);
  });

  it('never re-opens while the sheet is already open', () => {
    expect(shouldOpenRefineGate(REFINE_AFTER_OUTFITS, true)).toBe(false);
    expect(shouldOpenRefineGate(REFINE_AFTER_OUTFITS * 2, true)).toBe(false);
  });
});

describe('registerTierView (tier dedup)', () => {
  it('counts distinct outfit hashes', () => {
    const viewed = new Set<string>();
    expect(registerTierView(viewed, 'a')).toBe(1);
    expect(registerTierView(viewed, 'b')).toBe(2);
    expect(registerTierView(viewed, 'c')).toBe(3);
  });

  it('does not double-count a re-viewed outfit', () => {
    const viewed = new Set<string>();
    registerTierView(viewed, 'a');
    registerTierView(viewed, 'b');
    expect(registerTierView(viewed, 'a')).toBe(2);
    expect(registerTierView(viewed, 'b')).toBe(2);
  });

  it('fires the gate at exactly the threshold of distinct views', () => {
    const viewed = new Set<string>();
    let count = 0;
    for (let i = 0; i < REFINE_AFTER_OUTFITS; i++) {
      count = registerTierView(viewed, `outfit-${i}`);
      // Re-viewing the same outfit must not advance the count toward the gate.
      registerTierView(viewed, `outfit-${i}`);
      const gateOpen = shouldOpenRefineGate(count, false);
      expect(gateOpen).toBe(i === REFINE_AFTER_OUTFITS - 1);
    }
  });

  it('re-arms after a tier reset (clearing the Set restarts the count)', () => {
    const viewed = new Set<string>();
    for (let i = 0; i < REFINE_AFTER_OUTFITS; i++) {
      registerTierView(viewed, `t1-${i}`);
    }
    expect(shouldOpenRefineGate(viewed.size, false)).toBe(true);

    // resetRefineTier clears the Set (submit/skip) — the next tier starts fresh.
    viewed.clear();
    expect(viewed.size).toBe(0);
    expect(shouldOpenRefineGate(viewed.size, false)).toBe(false);
    expect(registerTierView(viewed, 't2-0')).toBe(1);
    expect(shouldOpenRefineGate(1, false)).toBe(false);
  });
});
