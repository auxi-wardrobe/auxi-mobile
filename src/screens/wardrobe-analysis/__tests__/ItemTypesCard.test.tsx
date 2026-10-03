import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { ItemTypesCard } from '../AnalysisCards';
import type { ItemTypeGroup } from '../wardrobe-analysis';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en-EN' },
  }),
}));

jest.mock('../../../theme/motion', () => {
  const actual = jest.requireActual('../../../theme/motion');
  return { ...actual, useReducedMotion: () => true };
});

const GROUPS: ItemTypeGroup[] = [
  {
    group: 'shoes',
    count: 2,
    types: [
      { typeId: 'loafers', label: 'loafers', count: 1 },
      { typeId: 'sneakers', label: 'sneakers', count: 1 },
    ],
  },
  {
    group: 'top',
    count: 1,
    types: [{ typeId: 'shirt', label: 'shirt', count: 1 }],
  },
];

// Host nodes only — composite wrappers repeat the testID.
const hosts = (root: ReactTestInstance, id: string) =>
  root.findAll(n => typeof n.type === 'string' && n.props?.testID === id);
const pressable = (root: ReactTestInstance, id: string) =>
  root.findAll(n => n.props?.testID === id && n.props?.onPress)[0];

describe('ItemTypesCard', () => {
  it('starts collapsed and expands one group on tap', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<ItemTypesCard groups={GROUPS} />);
    });
    const { root } = renderer;

    expect(hosts(root, 'analysis-type-shoes-loafers')).toHaveLength(0);
    expect(hosts(root, 'analysis-type-group-toggle-shoes')).toHaveLength(1);

    act(() => {
      pressable(root, 'analysis-type-group-toggle-shoes').props.onPress();
    });
    expect(hosts(root, 'analysis-type-shoes-loafers')).toHaveLength(1);
    expect(hosts(root, 'analysis-type-shoes-sneakers')).toHaveLength(1);
    expect(
      hosts(root, 'analysis-type-group-toggle-shoes-expanded'),
    ).toHaveLength(1);
    // Other groups stay collapsed.
    expect(hosts(root, 'analysis-type-top-shirt')).toHaveLength(0);

    act(() => {
      pressable(
        root,
        'analysis-type-group-toggle-shoes-expanded',
      ).props.onPress();
    });
    expect(hosts(root, 'analysis-type-shoes-loafers')).toHaveLength(0);
  });
});
