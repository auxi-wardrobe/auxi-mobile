/* eslint-env jest */
/**
 * aiLimitStore — session memory of the "AI daily limit reached" state that lets
 * a surface gate ENTRY on a prior 429 (See-on-me shows the sheet up front).
 *
 * Locks the conservative contract: inactive until marked, active after a mark,
 * cleared by `clearAiLimit` (any AI success), and — the safety property — a mark
 * from a PREVIOUS calendar day never reads as active today.
 */
import {
  isAiLimitReached,
  markAiLimitReached,
  clearAiLimit,
} from '../aiLimitStore';

describe('aiLimitStore', () => {
  afterEach(() => {
    clearAiLimit();
    jest.useRealTimers();
  });

  it('is inactive before anything is marked', () => {
    expect(isAiLimitReached()).toBe(false);
  });

  it('is active after markAiLimitReached()', () => {
    markAiLimitReached();
    expect(isAiLimitReached()).toBe(true);
  });

  it('clearAiLimit() resets it (self-heal on AI success)', () => {
    markAiLimitReached();
    clearAiLimit();
    expect(isAiLimitReached()).toBe(false);
  });

  it('a mark from a previous day does NOT read as active today', () => {
    // Mark "yesterday", then advance the clock a day and re-check.
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-20T10:00:00Z'));
    markAiLimitReached();
    expect(isAiLimitReached()).toBe(true);

    jest.setSystemTime(new Date('2026-07-21T10:00:00Z'));
    expect(isAiLimitReached()).toBe(false);
  });
});
