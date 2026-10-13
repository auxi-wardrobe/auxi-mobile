// discoveryService — the item-type filter's wire contract.
//
//   • `item_type` goes out as ONE comma-separated string (FastAPI does not
//     read axios' `item_type[]=` array encoding), omitted when empty.
//   • `/discovery/item-types` 404 = backend not shipped yet → `[]`, so the
//     filter pill hides instead of the screen erroring.

const mockGet = jest.fn();
jest.mock('../apiClient', () => ({
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

import { discoveryService } from '../discoveryService';

beforeEach(() => {
  mockGet.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('listOutfits — item_type param', () => {
  it('joins the selected item types into one comma-separated value', async () => {
    mockGet.mockResolvedValue({ data: { outfits: [] } });
    await discoveryService.listOutfits({
      itemTypes: ['a_line_skirt', 'pleated_skirt'],
    });
    expect(mockGet.mock.calls[0][1].params.item_type).toBe(
      'a_line_skirt,pleated_skirt',
    );
  });

  it('omits item_type when nothing is selected', async () => {
    mockGet.mockResolvedValue({ data: { outfits: [] } });
    await discoveryService.listOutfits({ itemTypes: [] });
    expect(mockGet.mock.calls[0][1].params.item_type).toBeUndefined();
  });
});

describe('listItemTypes', () => {
  it('returns the served item types', async () => {
    const served = [{ code: 'a_line_skirt', label: 'A-line skirt', count: 3 }];
    mockGet.mockResolvedValue({ data: { item_types: served } });
    await expect(discoveryService.listItemTypes()).resolves.toEqual(served);
    expect(mockGet).toHaveBeenCalledWith('/discovery/item-types');
  });

  it('resolves [] on a 404 (endpoint not deployed yet)', async () => {
    mockGet.mockRejectedValue({ response: { status: 404 } });
    await expect(discoveryService.listItemTypes()).resolves.toEqual([]);
  });

  it('rethrows any other error', async () => {
    const err = { response: { status: 500 } };
    mockGet.mockRejectedValue(err);
    await expect(discoveryService.listItemTypes()).rejects.toBe(err);
  });
});
