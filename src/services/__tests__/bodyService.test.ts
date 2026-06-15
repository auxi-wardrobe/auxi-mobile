/* eslint-env jest */
/**
 * AU-346 reusable self-visualization profile — bodyService contract tests.
 *
 * Covers the new profile surface added for AU-346:
 *  - getActiveProfile: unwraps `{ profile }`, tolerates null / missing.
 *  - updateBody: PATCHes `/body/{id}` with the patch and unwraps `{ body }`.
 *  - uploadBody: forwards the optional profile opts as multipart fields, and
 *    stays backward-compatible when they're omitted.
 *  - decideEntryMode: the pure reuse-vs-capture entry helper.
 *
 * apiClient is fully mocked — no real network. FormData is mocked so we can
 * assert exactly which fields uploadBody appends.
 */
import { bodyService, BodyProfile } from '../bodyService';
import { apiClient } from '../apiClient';
import { decideEntryMode } from '../../screens/see-this-on-me/profile-entry';

jest.mock('../apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock FormData so we can inspect the appended fields without depending on the
// RN polyfill internals. Each instance records its append() calls.
class MockFormData {
  appended: Array<[string, unknown]> = [];
  append(key: string, value: unknown) {
    this.appended.push([key, value]);
  }
}
(globalThis as any).FormData = MockFormData;

const mockedGet = apiClient.get as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;
const mockedPatch = apiClient.patch as jest.Mock;

const sampleProfile: BodyProfile = {
  id: 'body-1',
  user_id: 'user-1',
  image_url: 'https://cdn/selfie.jpg',
  body_shape: 'hourglass',
  full_body_url: 'https://cdn/full.jpg',
  is_primary: true,
};

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
  mockedPatch.mockReset();
});

describe('bodyService.getActiveProfile', () => {
  it('returns the profile from the { profile } envelope', async () => {
    mockedGet.mockResolvedValueOnce({ data: { profile: sampleProfile } });

    const result = await bodyService.getActiveProfile();

    expect(mockedGet).toHaveBeenCalledWith('/body/active');
    expect(result).toEqual(sampleProfile);
  });

  it('returns null when the backend reports no profile', async () => {
    mockedGet.mockResolvedValueOnce({ data: { profile: null } });

    expect(await bodyService.getActiveProfile()).toBeNull();
  });

  it('returns null when the envelope is missing the profile field', async () => {
    mockedGet.mockResolvedValueOnce({ data: {} });

    expect(await bodyService.getActiveProfile()).toBeNull();
  });
});

describe('bodyService.updateBody', () => {
  it('PATCHes /body/{id} with the patch and unwraps { body }', async () => {
    const patched = { ...sampleProfile, body_shape: 'pear' as const };
    mockedPatch.mockResolvedValueOnce({ data: { body: patched } });

    const result = await bodyService.updateBody('body-1', {
      body_shape: 'pear',
      is_primary: true,
      full_body_url: 'https://cdn/full.jpg',
    });

    expect(mockedPatch).toHaveBeenCalledWith('/body/body-1', {
      body_shape: 'pear',
      is_primary: true,
      full_body_url: 'https://cdn/full.jpg',
    });
    expect(result).toEqual(patched);
  });

  it('falls back to the raw data when no { body } wrapper is present', async () => {
    mockedPatch.mockResolvedValueOnce({ data: sampleProfile });

    expect(await bodyService.updateBody('body-1', { is_primary: true })).toEqual(
      sampleProfile,
    );
  });
});

describe('bodyService.uploadBody', () => {
  const asset = { uri: 'file://selfie.jpg', type: 'image/jpeg', fileName: 's.jpg' };

  const getSentFormData = (): MockFormData =>
    mockedPost.mock.calls[0][1] as unknown as MockFormData;

  it('forwards the optional profile opts as multipart fields', async () => {
    mockedPost.mockResolvedValueOnce({ data: { body: sampleProfile } });

    await bodyService.uploadBody(asset, {
      body_shape: 'hourglass',
      photo_type: 'full_body',
      is_primary: true,
    });

    expect(mockedPost).toHaveBeenCalledWith(
      '/body',
      expect.anything(),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
    const sent = getSentFormData().appended;
    expect(sent).toContainEqual(['body_shape', 'hourglass']);
    expect(sent).toContainEqual(['photo_type', 'full_body']);
    expect(sent).toContainEqual(['is_primary', 'true']);
  });

  it('appends only the file when no opts are given (backward compatible)', async () => {
    mockedPost.mockResolvedValueOnce({ data: { body: sampleProfile } });

    await bodyService.uploadBody(asset);

    const keys = getSentFormData().appended.map(([k]) => k);
    expect(keys).toEqual(['file']);
  });

  it('appends is_primary:false explicitly when passed', async () => {
    mockedPost.mockResolvedValueOnce({ data: { body: sampleProfile } });

    await bodyService.uploadBody(asset, { is_primary: false });

    expect(getSentFormData().appended).toContainEqual(['is_primary', 'false']);
  });
});

describe('decideEntryMode (AU-346 entry helper)', () => {
  it('reuses when a profile with an id exists', () => {
    expect(decideEntryMode(sampleProfile)).toBe('reuse');
  });

  it('captures when there is no profile', () => {
    expect(decideEntryMode(null)).toBe('capture');
    expect(decideEntryMode(undefined)).toBe('capture');
  });

  it('captures when the profile is malformed (missing id)', () => {
    expect(decideEntryMode({ id: '' } as BodyProfile)).toBe('capture');
  });
});
