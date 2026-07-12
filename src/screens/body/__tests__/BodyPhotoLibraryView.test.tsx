import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { BodyPhotoLibraryView } from '../BodyPhotoLibraryView';
import type { BodyItem } from '../../../services/bodyService';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const uploaded: BodyItem = {
  id: 'body-1',
  user_id: 'u1',
  image_url: 'https://cdn.example/body.jpg',
  created_at: '2026-07-01T00:00:00Z',
  photo_type: 'full_body',
};

const aiShape: BodyItem = {
  id: 'body-2',
  user_id: 'u1',
  image_url: 'https://cdn.example/shape.jpg',
  created_at: '2026-07-02T00:00:00Z',
  body_shape: 'slim',
};

const has = (r: TestRenderer.ReactTestRenderer, testID: string): boolean =>
  r.root.findAll(n => n.props?.testID === testID).length > 0;

const hasText = (r: TestRenderer.ReactTestRenderer, value: string): boolean =>
  r.root.findAll(n => n.props?.children === value).length > 0;

test('library grid renders a tile per body photo with its origin label', () => {
  let r!: TestRenderer.ReactTestRenderer;
  const onOpenPhoto = jest.fn();

  act(() => {
    r = TestRenderer.create(
      <BodyPhotoLibraryView
        loading={false}
        items={[uploaded, aiShape]}
        onBack={jest.fn()}
        onOpenPhoto={onOpenPhoto}
      />,
    );
  });

  // One tile per item, plus a per-item image skeleton.
  expect(has(r, 'body-library-tile-0')).toBe(true);
  expect(has(r, 'body-library-tile-1')).toBe(true);
  expect(has(r, 'body-library-tile-skeleton-body-1')).toBe(true);
  expect(has(r, 'body-library-tile-skeleton-body-2')).toBe(true);

  // Origin labels distinguish uploaded vs AI-generated body shape.
  expect(hasText(r, 'body.type_uploaded')).toBe(true);
  expect(hasText(r, 'body.type_shape_slim')).toBe(true);

  // Tapping a tile forwards the tapped body.
  const tile = r.root.find(
    n => n.props?.testID === 'body-library-tile-0' && !!n.props?.onPress,
  );
  act(() => {
    tile.props.onPress();
  });
  expect(onOpenPhoto).toHaveBeenCalledWith(uploaded);
});

test('library grid shows the empty state when there are no photos', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <BodyPhotoLibraryView
        loading={false}
        items={[]}
        onBack={jest.fn()}
        onOpenPhoto={jest.fn()}
      />,
    );
  });

  expect(has(r, 'body-library-empty')).toBe(true);
  expect(has(r, 'body-library-tile-0')).toBe(false);
});
