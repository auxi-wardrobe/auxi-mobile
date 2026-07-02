/* eslint-env jest */
/**
 * Task 9: WardrobeItem beautify fields + 4 service methods.
 *
 * Mocks the `wardrobeApi` axios instance (created via `axios.create` inside
 * wardrobeService.ts) so no real network calls are made.
 * Also mocks the side-effect imports (apiClient / tokenStorage) that run
 * during module initialisation.
 */

// Mock apiClient (provides ROOT_URL used during wardrobeApi construction)
jest.mock('../apiClient', () => ({
  ROOT_URL: 'http://localhost:5001/api',
  apiClient: {},
}));

// Mock tokenStorage (request interceptor calls getAccessToken)
jest.mock('../tokenStorage', () => ({
  getAccessToken: jest.fn().mockResolvedValue('test-token'),
}));

const mockPost = jest.fn();
const mockGet = jest.fn();

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: () => ({
      post: (...a: any[]) => mockPost(...a),
      get: (...a: any[]) => mockGet(...a),
      delete: jest.fn(),
      patch: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    }),
  },
}));

import { wardrobeService, BeautifyStatus, WardrobeItem } from '../wardrobeService';

describe('beautify service methods', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockReset();
  });

  describe('beautifyItem', () => {
    it('POSTs to the beautify route and returns job envelope', async () => {
      mockPost.mockResolvedValue({ data: { job_id: 'j1', status: 'pending', attempts: 0 } });
      const res = await wardrobeService.beautifyItem('item-1');
      expect(mockPost).toHaveBeenCalledWith('/wardrobe/items/item-1/beautify');
      expect(res.job_id).toBe('j1');
      expect(res.status).toBe('pending');
      expect(res.attempts).toBe(0);
    });
  });

  describe('getBeautifyStatus', () => {
    it('GETs the status route and returns BeautifyStatus', async () => {
      mockGet.mockResolvedValue({ data: { status: 'ready', candidate_url: 'https://cdn/candidate.jpg', attempts: 1 } });
      const res = await wardrobeService.getBeautifyStatus('item-1');
      expect(mockGet).toHaveBeenCalledWith('/wardrobe/items/item-1/beautify/status');
      expect(res.status).toBe('ready');
      expect(res.candidate_url).toBe('https://cdn/candidate.jpg');
      expect(res.attempts).toBe(1);
    });

    it('returns status without candidate_url when image not ready', async () => {
      mockGet.mockResolvedValue({ data: { status: 'pending', attempts: 0 } });
      const res = await wardrobeService.getBeautifyStatus('item-2');
      expect(res.status).toBe('pending');
      expect(res.candidate_url).toBeUndefined();
    });
  });

  describe('acceptBeautify', () => {
    it('POSTs to the accept route and unwraps the item from {message, item}', async () => {
      const item: WardrobeItem = { id: 'item-1', name: 'Blue Shirt', image_studio: 'https://cdn/studio.jpg' };
      mockPost.mockResolvedValue({ data: { message: 'Accepted', item } });
      const res = await wardrobeService.acceptBeautify('item-1');
      expect(mockPost).toHaveBeenCalledWith('/wardrobe/items/item-1/beautify/accept');
      expect(res.id).toBe('item-1');
      expect(res.image_studio).toBe('https://cdn/studio.jpg');
    });
  });

  describe('discardBeautify', () => {
    it('POSTs to the discard route and unwraps the item from {message, item}', async () => {
      const item: WardrobeItem = { id: 'item-1', name: 'Blue Shirt', image_studio: null as any };
      mockPost.mockResolvedValue({ data: { message: 'Discarded', item } });
      const res = await wardrobeService.discardBeautify('item-1');
      expect(mockPost).toHaveBeenCalledWith('/wardrobe/items/item-1/beautify/discard');
      expect(res.id).toBe('item-1');
    });
  });
});

describe('WardrobeItem beautify fields (type contract)', () => {
  it('accepts all beautify fields without TS error', () => {
    const item: WardrobeItem = {
      id: 'item-1',
      image_studio: 'https://cdn/studio.jpg',
      image_studio_candidate: 'https://cdn/candidate.jpg',
      beautify_status: 'ready',
      beautify_attempts: 2,
    };
    expect(item.beautify_status).toBe('ready');
    expect(item.beautify_attempts).toBe(2);
  });

  it('allows null for image_studio (backend may emit null when unset)', () => {
    const item: WardrobeItem = { id: 'item-1', image_studio: undefined };
    expect(item.image_studio).toBeUndefined();
  });
});

describe('BeautifyStatus interface', () => {
  it('can be constructed with required fields', () => {
    const s: BeautifyStatus = { status: 'none', attempts: 0 };
    expect(s.status).toBe('none');
  });

  it('accepts candidate_url optionally', () => {
    const s: BeautifyStatus = { status: 'ready', candidate_url: 'https://cdn/x.jpg', attempts: 1 };
    expect(s.candidate_url).toBeDefined();
  });
});
