import React from 'react';
import { Image } from 'react-native';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { SkinToneSheet } from '../SkinToneSheet';

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
  MRadio: (props: { selected: boolean; testID?: string }) => {
    const { View } = require('react-native');
    return (
      <View
        testID={props.selected ? `${props.testID}-selected` : props.testID}
      />
    );
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Host nodes only: a Pressable's composite wrapper repeats the same testID.
const byTestID = (root: ReactTestInstance, id: string): ReactTestInstance[] =>
  root.findAll(
    node => typeof node.type === 'string' && node.props?.testID === id,
  );

// The outermost node with the testID — the component that owns onPress / disabled.
const pressable = (root: ReactTestInstance, id: string): ReactTestInstance =>
  root.findAll(node => node.props?.testID === id)[0];

const portraitUris = (root: ReactTestInstance): string[] =>
  root
    .findAllByType(Image)
    .map(node => String(node.props.source?.testUri ?? node.props.source));

const textContent = (root: ReactTestInstance): string =>
  root
    .findAll(node => typeof node.props?.children === 'string')
    .map(node => node.props.children)
    .join('|');

const render = (props: Partial<React.ComponentProps<typeof SkinToneSheet>>) => {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <SkinToneSheet
        visible
        gender="women"
        value={null}
        onDismiss={jest.fn()}
        onApply={jest.fn()}
        {...props}
      />,
    );
  });
  return renderer;
};

describe('SkinToneSheet', () => {
  it('shows the women portraits + jewellery guide for a Womenswear user', () => {
    const { root } = render({ gender: 'women' });
    const uris = portraitUris(root);
    expect(uris).toHaveLength(4);
    uris.forEach(uri => expect(uri).toMatch(/skin-tone\/women-/));
    expect(textContent(root)).toContain('wardrobe.analysis.sheet.guide_3');
    expect(textContent(root)).not.toContain(
      'wardrobe.analysis.sheet.undertone_title',
    );
  });

  it('shows the men portraits + two-column guide for a Menswear user', () => {
    const { root } = render({ gender: 'men' });
    const uris = portraitUris(root);
    expect(uris).toHaveLength(4);
    uris.forEach(uri => expect(uri).toMatch(/skin-tone\/men-/));
    expect(textContent(root)).toContain(
      'wardrobe.analysis.sheet.undertone_title',
    );
    expect(textContent(root)).not.toContain('wardrobe.analysis.sheet.guide_3');
  });

  it('keeps the pick as a draft until OK, then applies it', () => {
    const onApply = jest.fn();
    const { root } = render({ value: 'fair_light', onApply });
    expect(
      byTestID(root, 'analysis-skin-tone-option-fair_light-selected'),
    ).toHaveLength(1);

    act(() => {
      pressable(root, 'analysis-skin-tone-option-medium_tan').props.onPress();
    });
    expect(onApply).not.toHaveBeenCalled();
    expect(
      byTestID(root, 'analysis-skin-tone-option-medium_tan-selected'),
    ).toHaveLength(1);

    act(() => {
      pressable(root, 'analysis-skin-tone-ok').props.onPress();
    });
    expect(onApply).toHaveBeenCalledWith('medium_tan');
  });

  it('disables OK until a tone is picked', () => {
    const { root } = render({ value: null });
    expect(pressable(root, 'analysis-skin-tone-ok').props.disabled).toBe(true);
  });
});
