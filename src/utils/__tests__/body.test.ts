import { bodyPhotoTypeLabelKey } from '../body';
import { BodyItem } from '../../services/bodyService';

const makeItem = (overrides: Partial<BodyItem>): BodyItem => ({
  id: 'b1',
  user_id: 'u1',
  image_url: 'https://cdn/photo.jpg',
  ...overrides,
});

describe('bodyPhotoTypeLabelKey', () => {
  it('prefers the body-shape label when a shape is present', () => {
    // A generated build carries BOTH a shape and a photo_type; the shape wins.
    expect(
      bodyPhotoTypeLabelKey(
        makeItem({ body_shape: 'slim', photo_type: 'full_body' }),
      ),
    ).toBe('body.gallery_type_body_shape');
  });

  it('maps full-body uploads to the uploaded label', () => {
    expect(bodyPhotoTypeLabelKey(makeItem({ photo_type: 'full_body' }))).toBe(
      'body.gallery_type_uploaded',
    );
  });

  it('maps selfies to the selfie label', () => {
    expect(bodyPhotoTypeLabelKey(makeItem({ photo_type: 'selfie' }))).toBe(
      'body.gallery_type_selfie',
    );
  });

  it('maps AI-generated results to the AI-result label', () => {
    expect(bodyPhotoTypeLabelKey(makeItem({ photo_type: 'ai_result' }))).toBe(
      'body.gallery_type_ai_result',
    );
  });

  it('returns null for an unknown / missing type so no badge is shown', () => {
    expect(bodyPhotoTypeLabelKey(makeItem({}))).toBeNull();
    expect(bodyPhotoTypeLabelKey(makeItem({ photo_type: 'mystery' }))).toBeNull();
  });
});
