/* eslint-env jest */
/**
 * Capsule Wardrobe service contract tests (frozen spec §4). apiClient is fully
 * mocked — no real network. Focus: response unwrapping (bare CapsuleFull vs
 * `{ capsule }` envelope), the add-result envelope, and the query-key factory.
 */
import {
  capsuleKeys,
  capsuleService,
  type CapsuleFull,
} from '../capsuleService';
import { apiClient } from '../apiClient';

jest.mock('../apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;
const mockedDelete = apiClient.delete as jest.Mock;

const fullCapsule = (overrides: Partial<CapsuleFull> = {}): CapsuleFull => ({
  id: 'cap-1',
  name: 'Work week',
  status: 'success',
  item_count: 3,
  outfit_count: 2,
  created_at: '2026-07-18T00:00:00Z',
  requirements: {
    temp_min: 10,
    temp_max: 20,
    formalness_level: 6,
    outfit_target: 3,
    shoe_limit: 2,
  },
  category_groups: { outer: 1, top: 1, bottom: 1, footwear: 1, accessory: 0 },
  summary: {
    outer_count: 1,
    top_count: 1,
    bottom_count: 1,
    shoe_count: 1,
    accessory_count: 0,
    weather_range: '10°–20°C',
    formalness_score: 6,
  },
  items: [{ id: 'i1' }, { id: 'i2' }, { id: 'i3' }],
  outfits: [
    { id: 'o1', outfit_hash: 'h1', styling_note: null, item_ids: ['i1', 'i2'], items: [] },
  ],
  missing_categories: [],
  ...overrides,
});

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
  mockedDelete.mockReset();
});

describe('capsuleKeys', () => {
  it('exposes stable base + list + detail keys', () => {
    expect(capsuleKeys.all).toEqual(['capsules']);
    expect(capsuleKeys.list()).toEqual(['capsules']);
    expect(capsuleKeys.detail('cap-1')).toEqual(['capsules', 'cap-1']);
  });
});

describe('createCapsule', () => {
  it('POSTs /capsules and returns a bare CapsuleFull', async () => {
    mockedPost.mockResolvedValue({ data: fullCapsule() });
    const res = await capsuleService.createCapsule({ name: 'Work week' });
    expect(mockedPost).toHaveBeenCalledWith('/capsules', { name: 'Work week' });
    expect(res.id).toBe('cap-1');
    expect(res.status).toBe('success');
  });

  it('unwraps a { capsule } envelope when the backend wraps it', async () => {
    mockedPost.mockResolvedValue({ data: { capsule: fullCapsule() } });
    const res = await capsuleService.createCapsule({ name: 'Work week' });
    expect(res.id).toBe('cap-1');
  });
});

describe('listCapsules', () => {
  it('unwraps { capsules: [...] }', async () => {
    mockedGet.mockResolvedValue({
      data: { capsules: [{ id: 'a' }, { id: 'b' }] },
    });
    const res = await capsuleService.listCapsules();
    expect(res).toHaveLength(2);
    expect(res[0].id).toBe('a');
  });

  it('returns [] when the payload is malformed', async () => {
    mockedGet.mockResolvedValue({ data: {} });
    expect(await capsuleService.listCapsules()).toEqual([]);
  });
});

describe('getCapsule', () => {
  it('GETs /capsules/{id} and unwraps', async () => {
    mockedGet.mockResolvedValue({ data: fullCapsule() });
    const res = await capsuleService.getCapsule('cap-1');
    expect(mockedGet).toHaveBeenCalledWith('/capsules/cap-1');
    expect(res.item_count).toBe(3);
  });
});

describe('addItems', () => {
  it('POSTs item_ids and unwraps the add-result envelope', async () => {
    mockedPost.mockResolvedValue({
      data: {
        items_added: 2,
        already_existed: 1,
        new_outfits: 3,
        capsule: fullCapsule(),
      },
    });
    const res = await capsuleService.addItems('cap-1', ['i4', 'i5']);
    expect(mockedPost).toHaveBeenCalledWith('/capsules/cap-1/items', {
      item_ids: ['i4', 'i5'],
    });
    expect(res.items_added).toBe(2);
    expect(res.already_existed).toBe(1);
    expect(res.new_outfits).toBe(3);
    expect(res.capsule.id).toBe('cap-1');
  });
});

describe('addFromOutfits', () => {
  it('sends outfit_source + outfit_ids', async () => {
    mockedPost.mockResolvedValue({
      data: { items_added: 0, already_existed: 4, new_outfits: 0, capsule: fullCapsule() },
    });
    const res = await capsuleService.addFromOutfits('cap-1', 'favourites', [
      'f1',
    ]);
    expect(mockedPost).toHaveBeenCalledWith('/capsules/cap-1/items/from-outfits', {
      outfit_source: 'favourites',
      outfit_ids: ['f1'],
    });
    expect(res.items_added).toBe(0);
    expect(res.already_existed).toBe(4);
  });
});

describe('removeItem', () => {
  it('DELETEs and unwraps { removed, capsule }', async () => {
    mockedDelete.mockResolvedValue({
      data: { removed: true, capsule: fullCapsule() },
    });
    const res = await capsuleService.removeItem('cap-1', 'i1');
    expect(mockedDelete).toHaveBeenCalledWith('/capsules/cap-1/items/i1');
    expect(res.removed).toBe(true);
    expect(res.capsule.id).toBe('cap-1');
  });
});

describe('changeItem', () => {
  it('includes outfit_id only for scope=outfit', async () => {
    mockedPost.mockResolvedValue({ data: fullCapsule() });
    await capsuleService.changeItem('cap-1', 'i1', 'i9', 'outfit', 'o1');
    expect(mockedPost).toHaveBeenCalledWith('/capsules/cap-1/items/i1/change', {
      replacement_item_id: 'i9',
      scope: 'outfit',
      outfit_id: 'o1',
    });
  });

  it('omits outfit_id for scope=all', async () => {
    mockedPost.mockResolvedValue({ data: fullCapsule() });
    await capsuleService.changeItem('cap-1', 'i1', 'i9', 'all');
    expect(mockedPost).toHaveBeenCalledWith('/capsules/cap-1/items/i1/change', {
      replacement_item_id: 'i9',
      scope: 'all',
    });
  });
});

describe('deleteCapsule', () => {
  it('DELETEs /capsules/{id}', async () => {
    mockedDelete.mockResolvedValue({ data: { deleted: true } });
    await capsuleService.deleteCapsule('cap-1');
    expect(mockedDelete).toHaveBeenCalledWith('/capsules/cap-1');
  });
});

describe('retryGeneration', () => {
  it('POSTs the retry route', async () => {
    mockedPost.mockResolvedValue({ data: fullCapsule({ status: 'failed' }) });
    const res = await capsuleService.retryGeneration('cap-1');
    expect(mockedPost).toHaveBeenCalledWith('/capsules/cap-1/generate/retry');
    expect(res.status).toBe('failed');
  });
});
