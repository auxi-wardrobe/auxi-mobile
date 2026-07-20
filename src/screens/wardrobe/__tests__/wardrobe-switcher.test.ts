/* eslint-env jest */
/**
 * Pure switcher-row builder tests (design revision §9.2). The helper shapes the
 * "Choose a wardrobe" sheet: an Entire-Wardrobe row + one row per capsule, with
 * exactly one radio-selected row matching the active context.
 */
import { buildWardrobeSwitcherRows } from '../wardrobe-switcher';
import type { Capsule } from '../../../services/capsuleService';

const capsule = (overrides: Partial<Capsule> = {}): Capsule => ({
  id: 'cap-1',
  name: 'Work week',
  status: 'success',
  item_count: 5,
  outfit_count: 3,
  created_at: '2026-07-18T00:00:00Z',
  ...overrides,
});

describe('buildWardrobeSwitcherRows', () => {
  it('prepends an Entire-Wardrobe row carrying the wardrobe item count', () => {
    const rows = buildWardrobeSwitcherRows(12, [], 'entire');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ kind: 'entire', count: 12, selected: true });
  });

  it('maps each capsule to a row with its name + item_count', () => {
    const rows = buildWardrobeSwitcherRows(
      4,
      [capsule({ id: 'a', name: 'Travel', item_count: 7 })],
      'entire',
    );
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual({
      kind: 'capsule',
      capsuleId: 'a',
      name: 'Travel',
      count: 7,
      selected: false,
    });
  });

  it('selects the capsule row matching the active context (not entire)', () => {
    const rows = buildWardrobeSwitcherRows(
      4,
      [capsule({ id: 'a' }), capsule({ id: 'b', name: 'Gym' })],
      'b',
    );
    expect(rows[0].selected).toBe(false);
    expect(rows[1].selected).toBe(false);
    expect(rows[2].selected).toBe(true);
  });

  it('clamps a negative wardrobe count to 0 and defaults missing item_count', () => {
    const rows = buildWardrobeSwitcherRows(
      -3,
      [capsule({ id: 'a', item_count: undefined as unknown as number })],
      'entire',
    );
    expect(rows[0].count).toBe(0);
    expect(rows[1]).toMatchObject({ kind: 'capsule', count: 0 });
  });
});
