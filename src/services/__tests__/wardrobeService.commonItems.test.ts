/* eslint-env jest */
/**
 * Database picker category filter.
 *
 * `GET /wardrobe/common-items` returns the whole system catalog and ignores the
 * `category` query param, so the Database screen's chips did nothing. These
 * tests pin the client-side narrowing that makes the filter actually work.
 */

jest.mock('../apiClient', () => ({
  ROOT_URL: 'http://localhost:5001/api',
  apiClient: {},
}));

jest.mock('../tokenStorage', () => ({
  getAccessToken: jest.fn().mockResolvedValue('test-token'),
}));

const mockGet = jest.fn();

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: () => ({
      get: (...a: any[]) => mockGet(...a),
      post: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    }),
  },
}));

import { wardrobeService } from '../wardrobeService';

const CATALOG = {
  data: {
    count: 4,
    items: [
      { id: 'a', name: 'White T-Shirt', category: 'top' },
      { id: 'b', name: 'Blue Jeans', category: 'bottom' },
      { id: 'c', name: 'White Sneakers', category: 'shoes' },
      { id: 'd', name: 'Navy Blazer', category: 'outerwear' },
    ],
  },
};

describe('getCommonItems category filter', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue(CATALOG);
  });

  it('returns the whole catalog when no category is selected (All tab)', async () => {
    const items = await wardrobeService.getCommonItems();

    expect(mockGet).toHaveBeenCalledWith('/wardrobe/common-items', {
      params: { category: undefined },
    });
    expect(items.map(i => i.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('narrows to the selected category when the backend ignores the param', async () => {
    const items = await wardrobeService.getCommonItems('top');

    expect(items.map(i => i.id)).toEqual(['a']);
  });

  it.each([
    ['bottom', ['b']],
    ['shoes', ['c']],
    ['outerwear', ['d']],
    ['one_piece', []],
    ['accessory', []],
  ])('filters %s down to %p', async (category, expected) => {
    const items = await wardrobeService.getCommonItems(category);

    expect(items.map(i => i.id)).toEqual(expected);
  });

  it('is a no-op when the backend already filtered the list', async () => {
    mockGet.mockResolvedValue({
      data: {
        count: 1,
        items: [{ id: 'a', name: 'White T-Shirt', category: 'top' }],
      },
    });

    const items = await wardrobeService.getCommonItems('top');

    expect(items.map(i => i.id)).toEqual(['a']);
  });

  it('still swallows a 404/405 catalog route into an empty list', async () => {
    mockGet.mockRejectedValue({ response: { status: 404 } });

    await expect(wardrobeService.getCommonItems('top')).resolves.toEqual([]);
  });
});
