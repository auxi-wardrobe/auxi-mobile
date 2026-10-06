import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { OutfitPreview } from '../OutfitPreview';
import { StepBodyShape } from '../StepBodyShape';
import { StepBodyShapeSkeleton } from '../StepBodyShapeSkeleton';
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

jest.mock('@react-native-camera-roll/camera-roll', () => ({
  CameraRoll: {
    saveAsset: jest.fn(),
  },
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

// OutfitPreview only mounts the image once its area has been measured (it
// aspect-fits a 9:16 rect into the onLayout size), so tests drive that layout.
const layoutPreviewArea = (
  r: TestRenderer.ReactTestRenderer,
  width: number,
  height: number,
) => {
  let area = r.root.findByProps({ testID: 'stom-preview-image-frame' }).parent;
  while (area && typeof area.props.onLayout !== 'function') {
    area = area.parent;
  }
  if (!area) {
    throw new Error('no onLayout ancestor for the preview frame');
  }
  const target = area;
  act(() => {
    target.props.onLayout({ nativeEvent: { layout: { width, height } } });
  });
};

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
  layoutPreviewArea(r, 390, 600);

  expect(hasTestID(r, 'stom-preview-image-skeleton')).toBe(true);
});

test('outfit preview uses a 9:16 portrait image frame', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <OutfitPreview
        imageUri="https://cdn.example/result.jpg"
        onBackHome={jest.fn()}
      />,
    );
  });

  // The frame is aspect-FIT into the measured area (no `aspectRatio` style):
  // check the fitted rect is 9:16 both when the area is wider than 9:16
  // (height-bound) and taller (width-bound).
  const fittedFor = (width: number, height: number) => {
    layoutPreviewArea(r, width, height);
    return StyleSheet.flatten(
      r.root.findByProps({ testID: 'stom-preview-image-frame' }).props.style,
    ) as { width: number; height: number };
  };

  const wide = fittedFor(400, 600); // 0.67 > 0.5625 → height-bound
  expect(wide.height).toBe(600);
  expect(wide.width / wide.height).toBeCloseTo(9 / 16);

  const tall = fittedFor(300, 700); // 0.43 < 0.5625 → width-bound
  expect(tall.width).toBe(300);
  expect(tall.width / tall.height).toBeCloseTo(9 / 16);
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
        onConfirm={jest.fn()}
        optIn
        onToggleOptIn={jest.fn()}
      />,
    );
  });

  expect(hasTestID(r, 'stom-shape-option-image-skeleton-slim')).toBe(true);
  expect(hasTestID(r, 'stom-shape-option-image-skeleton-average')).toBe(true);
  expect(hasTestID(r, 'stom-shape-option-image-skeleton-fuller')).toBe(true);
});

test('body-shape generation renders three full option skeleton cards', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(<StepBodyShapeSkeleton />);
  });

  [0, 1, 2].forEach(index => {
    expect(hasTestID(r, `stom-shape-skeleton-option-${index}`)).toBe(true);
    expect(hasTestID(r, `stom-shape-skeleton-${index}`)).toBe(true);
    expect(hasTestID(r, `stom-shape-skeleton-label-${index}`)).toBe(true);
  });
});
