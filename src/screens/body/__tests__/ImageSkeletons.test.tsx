import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { BodyTryOnView } from '../BodyTryOnView';
import { BodyPhotoGrid } from '../BodyPhotoGrid';
import { BodyPhotoDetailView } from '../BodyPhotoDetailView';
import { BodyImageLightbox } from '../BodyImageLightbox';
import type { BodyItem } from '../../../services/bodyService';
import type { TryOnOutfitContext } from '../../../types/navigation';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

jest.mock('../../../theme/motion', () => {
  const actual = jest.requireActual('../../../theme/motion');
  return { ...actual, useReducedMotion: () => true };
});

jest.mock('../PhotoSourceModal', () => ({
  PhotoSourceModal: () => null,
}));

const bodyItem: BodyItem = {
  id: 'body-1',
  user_id: 'u1',
  image_url: 'https://cdn.example/body.jpg',
  created_at: '2026-07-01T00:00:00Z',
};

const outfit: TryOnOutfitContext = {
  outfitHash: 'hash-1',
  itemIds: ['item-1'],
  itemImageUrls: ['https://cdn.example/item.jpg'],
  stylingNote: '',
};

const hasTestID = (
  r: TestRenderer.ReactTestRenderer,
  testID: string,
): boolean => r.root.findAll(n => n.props?.testID === testID).length > 0;

test('body try-on preview and outfit thumbnails render skeletons while loading', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <BodyTryOnView
        tryOnOutfit={outfit}
        previewImageUrl="https://cdn.example/try-on.jpg"
        loading={false}
        items={[bodyItem]}
        selectedBodyId={null}
        isTryOnMode
        onSelectBody={jest.fn()}
        onPreviewImage={jest.fn()}
        onDeleteItem={jest.fn()}
        onUploadAnother={jest.fn()}
        tryOnError={null}
      />,
    );
  });

  expect(hasTestID(r, 'body-try-on-preview-skeleton')).toBe(true);
  expect(hasTestID(r, 'body-outfit-preview-skeleton-0')).toBe(true);
  expect(hasTestID(r, 'body-photo-grid-skeleton-body-1')).toBe(true);
});

test('body photo grid, detail, and lightbox render image skeletons', () => {
  let grid!: TestRenderer.ReactTestRenderer;
  let detail!: TestRenderer.ReactTestRenderer;
  let lightbox!: TestRenderer.ReactTestRenderer;

  act(() => {
    grid = TestRenderer.create(
      <BodyPhotoGrid
        loading={false}
        items={[bodyItem]}
        selectedBodyId={null}
        isTryOnMode={false}
        onSelectBody={jest.fn()}
        onPreviewImage={jest.fn()}
        onDeleteItem={jest.fn()}
      />,
    );
    detail = TestRenderer.create(
      <BodyPhotoDetailView
        selectedBody={bodyItem}
        loading={false}
        uploading={false}
        modalVisible={false}
        onBack={jest.fn()}
        onDelete={jest.fn()}
        onImageSelect={jest.fn()}
        onOpenSourceModal={jest.fn()}
        onCloseSourceModal={jest.fn()}
      />,
    );
    lightbox = TestRenderer.create(
      <BodyImageLightbox
        visible
        imageUrl="https://cdn.example/lightbox.jpg"
        onClose={jest.fn()}
      />,
    );
  });

  expect(hasTestID(grid, 'body-photo-grid-skeleton-body-1')).toBe(true);
  expect(hasTestID(detail, 'body-detail-image-skeleton')).toBe(true);
  expect(hasTestID(lightbox, 'body-lightbox-image-skeleton')).toBe(true);
});
