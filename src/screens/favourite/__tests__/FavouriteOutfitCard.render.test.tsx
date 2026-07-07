import React from 'react';
import { Image } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { FavouriteOutfitCard } from '../FavouriteOutfitCard';
import { Favourite } from '../../../services/favouriteService';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

jest.mock('../../../theme/motion', () => {
  const actual = jest.requireActual('../../../theme/motion');
  return { ...actual, useReducedMotion: () => true };
});

const fav: Favourite = {
  id: 'fav1',
  user_id: 'u1',
  outfit_items: [
    {
      id: 'i1',
      image_url: 'https://x/1.jpg',
      image_png: null,
      name: 'a',
      category: 'top',
    },
    {
      id: 'i2',
      image_url: 'https://x/2.jpg',
      image_png: null,
      name: 'b',
      category: 'bottom',
    },
    {
      id: 'i3',
      image_url: 'https://x/3.jpg',
      image_png: null,
      name: 'c',
      category: 'shoes',
    },
  ] as any,
  outfit_context: null,
  outfit_thumbnail_url: null,
  created_at: '2026-06-24T00:00:00Z',
  updated_at: '2026-06-24T00:00:00Z',
  title: 'Easy and ready.',
  mood_tags: ['confident'],
};

const tileIDs = (r: TestRenderer.ReactTestRenderer): string[] => [
  ...new Set(
    r.root
      .findAll(
        n =>
          typeof n.props?.testID === 'string' &&
          n.props.testID.includes('-tile-'),
      )
      .map(n => n.props.testID as string),
  ),
];

test('grid view renders all outfit tiles', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <FavouriteOutfitCard favourite={fav} view="grid" />,
    );
  });
  expect(tileIDs(r)).toHaveLength(3);
});

test('grid view keeps a skeleton visible until tile image load settles', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <FavouriteOutfitCard favourite={fav} view="grid" />,
    );
  });

  const skeletonId = 'favourite-card-fav1-image-skeleton-i1';
  expect(
    r.root.findAll(n => n.props?.testID === skeletonId).length,
  ).toBeGreaterThan(0);

  const image = r.root.findAllByType(Image)[0];
  act(() => {
    image.props.onLoadEnd();
  });

  expect(r.root.findAll(n => n.props?.testID === skeletonId)).toHaveLength(0);
});

test('collage view renders all outfit tiles after layout', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <FavouriteOutfitCard favourite={fav} view="collage" />,
    );
  });

  // Surface mounts but seeds nothing until it knows its width (mirrors RN/web
  // before the first onLayout pass).
  expect(tileIDs(r)).toHaveLength(0);

  const surface = r.root.find(
    n => n.props?.testID === 'favourite-card-fav1-collage',
  );
  act(() => {
    surface.props.onLayout({
      nativeEvent: { layout: { x: 0, y: 0, width: 343, height: 457 } },
    });
  });

  expect(tileIDs(r)).toHaveLength(3);
});
