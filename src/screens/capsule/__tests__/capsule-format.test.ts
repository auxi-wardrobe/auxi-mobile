/* eslint-env jest */
import type { CapsuleFull } from '../../../services/capsuleService';
import {
  categoryRows,
  gapsInterpolation,
  hasGaps,
  isCapsuleNameValid,
  isTerminalStatus,
  capsuleItemIdSet,
  sortCapsulesNewestFirst,
  weatherRangeLabel,
} from '../capsule-format';

const base: CapsuleFull = {
  id: 'c1',
  name: 'Travel',
  status: 'success_with_gaps',
  item_count: 4,
  outfit_count: 2,
  created_at: '2026-07-18T00:00:00Z',
  requirements: {
    temp_min: 5,
    temp_max: 18,
    formalness_level: 4,
    outfit_target: 5,
    shoe_limit: 2,
  },
  category_groups: { outer: 1, top: 2, bottom: 0, footwear: 1, accessory: 0 },
  summary: {
    outer_count: 1,
    top_count: 2,
    bottom_count: 0,
    shoe_count: 1,
    accessory_count: 0,
    weather_range: '5°–18°C',
    formalness_score: 4,
  },
  items: [{ id: 'i1' }, { id: 'i2' }],
  outfits: [],
  missing_categories: ['Formal shoes', 'Additional trousers'],
};

describe('isTerminalStatus', () => {
  it('flags terminal states', () => {
    expect(isTerminalStatus('success')).toBe(true);
    expect(isTerminalStatus('success_with_gaps')).toBe(true);
    expect(isTerminalStatus('failed')).toBe(true);
    expect(isTerminalStatus('generating')).toBe(false);
    expect(isTerminalStatus('draft')).toBe(false);
  });
});

describe('hasGaps + gapsInterpolation', () => {
  it('detects success_with_gaps', () => {
    expect(hasGaps(base)).toBe(true);
    expect(hasGaps({ ...base, status: 'success' })).toBe(false);
  });

  it('interpolates made vs target', () => {
    expect(gapsInterpolation(base)).toEqual({ made: 2, target: 5 });
  });

  it('falls back target to made when outfit_target is null', () => {
    const c = { ...base, requirements: { ...base.requirements, outfit_target: null } };
    expect(gapsInterpolation(c)).toEqual({ made: 2, target: 2 });
  });
});

describe('categoryRows', () => {
  it('keeps only non-empty buckets in canonical order', () => {
    expect(categoryRows(base.category_groups)).toEqual([
      { key: 'outer', count: 1 },
      { key: 'top', count: 2 },
      { key: 'footwear', count: 1 },
    ]);
  });

  it('returns [] for undefined groups', () => {
    expect(categoryRows(undefined)).toEqual([]);
  });
});

describe('weatherRangeLabel', () => {
  it('prefers the server summary string', () => {
    expect(weatherRangeLabel(base)).toBe('5°–18°C');
  });

  it('derives from requirements when summary is blank', () => {
    const c = { ...base, summary: { ...base.summary, weather_range: '' } };
    expect(weatherRangeLabel(c)).toBe('5°–18°C');
  });

  it('falls back to a dash when nothing is known', () => {
    const c = {
      ...base,
      summary: { ...base.summary, weather_range: '' },
      requirements: { ...base.requirements, temp_min: null, temp_max: null },
    };
    expect(weatherRangeLabel(c)).toBe('—');
  });
});

describe('isCapsuleNameValid', () => {
  it('requires a non-blank name', () => {
    expect(isCapsuleNameValid('Work')).toBe(true);
    expect(isCapsuleNameValid('   ')).toBe(false);
    expect(isCapsuleNameValid('')).toBe(false);
  });
});

describe('capsuleItemIdSet', () => {
  it('collects the capsule item ids', () => {
    const set = capsuleItemIdSet(base);
    expect(set.has('i1')).toBe(true);
    expect(set.has('i2')).toBe(true);
    expect(set.has('nope')).toBe(false);
  });

  it('handles undefined capsule', () => {
    expect(capsuleItemIdSet(undefined).size).toBe(0);
  });
});

describe('sortCapsulesNewestFirst', () => {
  it('sorts by created_at descending', () => {
    const list = [
      { id: 'old', name: '', status: 'success' as const, item_count: 0, outfit_count: 0, created_at: '2026-01-01T00:00:00Z' },
      { id: 'new', name: '', status: 'success' as const, item_count: 0, outfit_count: 0, created_at: '2026-07-01T00:00:00Z' },
    ];
    expect(sortCapsulesNewestFirst(list).map(c => c.id)).toEqual(['new', 'old']);
  });
});
