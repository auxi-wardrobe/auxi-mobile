/* eslint-env jest */
/**
 * profile-entry — the pure entry helpers for the See-this-on-me flow.
 *
 * `resolveReusePhotoUri` is the one that regressed: after AU-358 the profile's
 * `image_url` is the AI body-shape photo the user PICKED, while
 * `full_body_url` is the raw capture that fed the generation (the selfie when
 * the optional full-body step was skipped). Preferring `full_body_url` — the
 * pre-AU-358 precedence — showed returning users their selfie in the
 * reuse-confirm sheet instead of the body they chose.
 */
import { BodyProfile } from '../../../services/bodyService';
import { decideEntryMode, resolveReusePhotoUri } from '../profile-entry';

const profile = (patch: Partial<BodyProfile>): BodyProfile =>
  ({ id: 'prof-1', user_id: 'u-1', image_url: '', ...patch } as BodyProfile);

describe('decideEntryMode', () => {
  it('reuses a profile that has an id', () => {
    expect(decideEntryMode(profile({ id: 'prof-1' }))).toBe('reuse');
  });

  it('captures when there is no profile, or it is missing its id', () => {
    expect(decideEntryMode(null)).toBe('capture');
    expect(decideEntryMode(undefined)).toBe('capture');
    expect(decideEntryMode(profile({ id: '' }))).toBe('capture');
  });
});

describe('resolveReusePhotoUri', () => {
  describe('AU-358 profile (body_shape set — image_url is the picked photo)', () => {
    it('prefers image_url over the raw capture', () => {
      expect(
        resolveReusePhotoUri(
          profile({
            body_shape: 'average',
            image_url: 'https://cdn/picked-shape.jpg',
            full_body_url: 'https://cdn/raw-selfie.jpg',
          }),
        ),
      ).toBe('https://cdn/picked-shape.jpg');
    });

    it('falls back to full_body_url when image_url is missing', () => {
      expect(
        resolveReusePhotoUri(
          profile({
            body_shape: 'slim',
            image_url: '',
            full_body_url: 'https://cdn/full.jpg',
          }),
        ),
      ).toBe('https://cdn/full.jpg');
    });
  });

  describe('legacy profile (no body_shape — image_url is the selfie)', () => {
    it('prefers full_body_url so the sheet does not show the selfie', () => {
      expect(
        resolveReusePhotoUri(
          profile({
            image_url: 'https://cdn/selfie.jpg',
            full_body_url: 'https://cdn/full.jpg',
          }),
        ),
      ).toBe('https://cdn/full.jpg');
    });

    it('falls back to image_url when there is no full-body photo', () => {
      expect(
        resolveReusePhotoUri(
          profile({ image_url: 'https://cdn/selfie.jpg', full_body_url: null }),
        ),
      ).toBe('https://cdn/selfie.jpg');
    });
  });

  it('returns null when the profile carries no usable photo', () => {
    expect(resolveReusePhotoUri(null)).toBeNull();
    expect(resolveReusePhotoUri(undefined)).toBeNull();
    expect(
      resolveReusePhotoUri(profile({ image_url: '', full_body_url: null })),
    ).toBeNull();
  });
});
