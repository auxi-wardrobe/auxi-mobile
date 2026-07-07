import {
  DEFAULT_SORT,
  SORT_OPTIONS,
  SORT_OPTION_BY_VALUE,
  sortWardrobeItems,
} from '../wardrobe-sort';
import { WardrobeItem } from '../../../services/wardrobeService';

const item = (over: Partial<WardrobeItem> & { id: string }): WardrobeItem =>
  ({ ...over } as WardrobeItem);

const ids = (items: WardrobeItem[]): string[] => items.map(i => i.id);

describe('sortWardrobeItems', () => {
  test('default is newest-first', () => {
    expect(DEFAULT_SORT).toBe('date_added_desc');
  });

  test('date_added_desc orders newest created_at first', () => {
    const items = [
      item({ id: 'a', created_at: '2026-01-01T00:00:00Z' }),
      item({ id: 'b', created_at: '2026-03-01T00:00:00Z' }),
      item({ id: 'c', created_at: '2026-02-01T00:00:00Z' }),
    ];
    expect(ids(sortWardrobeItems(items, 'date_added_desc'))).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  test('date_added_asc orders oldest created_at first', () => {
    const items = [
      item({ id: 'a', created_at: '2026-01-01T00:00:00Z' }),
      item({ id: 'b', created_at: '2026-03-01T00:00:00Z' }),
      item({ id: 'c', created_at: '2026-02-01T00:00:00Z' }),
    ];
    expect(ids(sortWardrobeItems(items, 'date_added_asc'))).toEqual([
      'a',
      'c',
      'b',
    ]);
  });

  test('name_asc is case-insensitive A→Z; name_desc reverses', () => {
    const items = [
      item({ id: '1', name: 'banana' }),
      item({ id: '2', name: 'Apple' }),
      item({ id: '3', name: 'cherry' }),
    ];
    expect(ids(sortWardrobeItems(items, 'name_asc'))).toEqual(['2', '1', '3']);
    expect(ids(sortWardrobeItems(items, 'name_desc'))).toEqual(['3', '1', '2']);
  });

  test('missing name sorts last in both directions', () => {
    const items = [item({ id: 'none' }), item({ id: 'has', name: 'shirt' })];
    expect(ids(sortWardrobeItems(items, 'name_asc'))).toEqual(['has', 'none']);
    expect(ids(sortWardrobeItems(items, 'name_desc'))).toEqual(['has', 'none']);
  });

  test('worn_desc/asc prefer numeric exposure_count', () => {
    const items = [
      item({ id: 'low', exposure_count: 1 }),
      item({ id: 'high', exposure_count: 9 }),
      item({ id: 'mid', exposure_count: 5 }),
    ];
    expect(ids(sortWardrobeItems(items, 'worn_desc'))).toEqual([
      'high',
      'mid',
      'low',
    ]);
    expect(ids(sortWardrobeItems(items, 'worn_asc'))).toEqual([
      'low',
      'mid',
      'high',
    ]);
  });

  test('worn falls back to usage_frequency when exposure_count absent', () => {
    const items = [
      item({ id: 'less', usage_frequency: 'LESS_USED' }),
      item({ id: 'normal', usage_frequency: 'NORMAL' }),
    ];
    expect(ids(sortWardrobeItems(items, 'worn_desc'))).toEqual([
      'normal',
      'less',
    ]);
    expect(ids(sortWardrobeItems(items, 'worn_asc'))).toEqual([
      'less',
      'normal',
    ]);
  });

  test('missing created_at sorts last in both directions', () => {
    const items = [
      item({ id: 'none' }),
      item({ id: 'has', created_at: '2026-01-01T00:00:00Z' }),
    ];
    expect(ids(sortWardrobeItems(items, 'date_added_desc'))).toEqual([
      'has',
      'none',
    ]);
    expect(ids(sortWardrobeItems(items, 'date_added_asc'))).toEqual([
      'has',
      'none',
    ]);
  });

  test('does not mutate the input array', () => {
    const items = [
      item({ id: 'a', created_at: '2026-01-01T00:00:00Z' }),
      item({ id: 'b', created_at: '2026-02-01T00:00:00Z' }),
    ];
    const snapshot = ids(items);
    sortWardrobeItems(items, 'date_added_desc');
    expect(ids(items)).toEqual(snapshot);
  });

  test('empty and single-item inputs are safe', () => {
    expect(sortWardrobeItems([], 'name_asc')).toEqual([]);
    expect(
      ids(sortWardrobeItems([item({ id: 'solo', name: 'x' })], 'name_asc')),
    ).toEqual(['solo']);
  });

  test('SORT_OPTIONS has 6 entries indexed by value', () => {
    expect(SORT_OPTIONS).toHaveLength(6);
    SORT_OPTIONS.forEach(o => expect(SORT_OPTION_BY_VALUE[o.value]).toBe(o));
  });
});
