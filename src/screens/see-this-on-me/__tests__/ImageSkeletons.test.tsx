import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { OutfitPreview } from '../OutfitPreview';
import { StepBodyShape } from '../StepBodyShape';
import { PhotoThumb } from '../components';
import type { GeneratedShape } from '../body-shapes';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

jest.mock('../../../theme/motion', () => {
  const actual = jest.requireActual('../../../theme/motion');
  return { ...actual, useReducedMotion: () => true };
});

jest.mock('../../../components/features/AiContentDisclosure', () => ({
  AiContentDisclosure: () => null,
}));

const shapes: GeneratedShape[] = [
  { shape: 'slim', image_url: 'https://cdn.example/slim.jpg' },
  { shape: 'average', image_url: 'https://cdn.example/average.jpg' },
  { shape: 'fuller', image_url: 'https://cdn.example/fuller.jpg' },
];

const hasTestID = (
  r: TestRenderer.ReactTestRenderer,
  testID: string,
): boolean => r.root.findAll(n => n.props?.testID === testID).length > 0;

test('outfit preview renders a skeleton while the generated try-on image loads', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <OutfitPreview
        imageUri="https://cdn.example/result.jpg"
        onBackHome={jest.fn()}
      />,
    );
  });

  expect(hasTestID(r, 'stom-preview-image-skeleton')).toBe(true);
});

test('photo thumbnail renders a skeleton while the selected user photo loads', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <PhotoThumb uri="file:///tmp/selfie.jpg" testID="stom-selfie-thumb" />,
    );
  });

  expect(hasTestID(r, 'stom-selfie-thumb-skeleton')).toBe(true);
});

test('body-shape options render skeletons for generated shape images', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <StepBodyShape
        shapes={shapes}
        selectedShape={null}
        onSelectShape={jest.fn()}
        optIn
        onToggleOptIn={jest.fn()}
      />,
    );
  });

  expect(hasTestID(r, 'stom-shape-option-image-skeleton-slim')).toBe(true);
  expect(hasTestID(r, 'stom-shape-option-image-skeleton-average')).toBe(true);
  expect(hasTestID(r, 'stom-shape-option-image-skeleton-fuller')).toBe(true);
});
