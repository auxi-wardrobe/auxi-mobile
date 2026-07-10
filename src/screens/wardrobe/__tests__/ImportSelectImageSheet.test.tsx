import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { ImportSelectImageSheet } from '../ImportSelectImageSheet';
import { ExtractedImage } from '../import-from-web';

jest.mock('../../../components/features/ContextualBottomSheet', () => ({
  ContextualBottomSheet: (props: {
    visible: boolean;
    children?: React.ReactNode;
    testID?: string;
  }) => {
    const { View } = require('react-native');
    return props.visible ? (
      <View testID={props.testID}>{props.children}</View>
    ) : null;
  },
}));

jest.mock('../../../components/design-system/lib', () => ({
  MButton: (props: {
    children: React.ReactNode;
    disabled?: boolean;
    onPress?: () => void;
    testID?: string;
  }) => {
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity
        disabled={props.disabled}
        onPress={props.onPress}
        testID={props.testID}
      >
        <Text>{props.children}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      key === 'wardrobe.import_web.image_a11y'
        ? `Extracted image ${opts?.index ?? ''}`
        : key,
  }),
}));

jest.mock('../../../theme/motion', () => {
  const actual = jest.requireActual('../../../theme/motion');
  return { ...actual, useReducedMotion: () => true };
});

const images: ExtractedImage[] = [
  { url: 'https://cdn.example/one.jpg', width: 500, height: 500 },
  { url: 'https://cdn.example/two.jpg', width: 600, height: 600 },
];

const byTestID = (root: ReactTestInstance, id: string): ReactTestInstance[] =>
  root.findAll(node => node.props?.testID === id);

const renderSheet = (onPreview = jest.fn()) => {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <ImportSelectImageSheet
        visible
        images={images}
        onPreview={onPreview}
        onCancel={jest.fn()}
      />,
    );
  });
  return renderer;
};

describe('ImportSelectImageSheet', () => {
  it('selects a tile with a numbered badge without opening preview', () => {
    const onPreview = jest.fn();
    const renderer = renderSheet(onPreview);

    act(() => {
      byTestID(renderer.root, 'import-image-0')[0].props.onPress();
    });

    expect(onPreview).not.toHaveBeenCalled();
    expect(
      byTestID(renderer.root, 'import-image-selected-0').length,
    ).toBeGreaterThan(0);
    expect(
      byTestID(renderer.root, 'import-image-selected-0')[0].findAll(
        node => node.props?.children === '1',
      ).length,
    ).toBeGreaterThan(0);
  });

  it('moves selection and previews the currently selected image', () => {
    const onPreview = jest.fn();
    const renderer = renderSheet(onPreview);

    act(() => {
      byTestID(renderer.root, 'import-image-0')[0].props.onPress();
      byTestID(renderer.root, 'import-image-1')[0].props.onPress();
    });

    expect(byTestID(renderer.root, 'import-image-selected-0')).toHaveLength(0);
    expect(
      byTestID(renderer.root, 'import-image-selected-1').length,
    ).toBeGreaterThan(0);

    act(() => {
      byTestID(renderer.root, 'import-select-preview')[0].props.onPress();
    });

    expect(onPreview).toHaveBeenCalledWith(images[1]);
  });
});
