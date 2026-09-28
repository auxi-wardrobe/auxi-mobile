/**
 * The outfit color row under a Discovery card title: one dot per color in
 * server order, "+N" past MAX_VISIBLE_SWATCHES, a fixed-height row even when
 * empty (the masonry packer budgets it), and a translated a11y label that
 * falls back to the server's English label for a code the app can't name.
 */
import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import {
  DiscoveryColorSwatches,
  MAX_VISIBLE_SWATCHES,
} from '../DiscoveryColorSwatches';
import { SWATCH_ROW_HEIGHT } from '../discovery-grid';
import type { DiscoveryColor } from '../../../services/discoveryService';

// Only NVY is "translated"; everything else must fall back to defaultValue.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'discovery.colors.NVY') {
        return 'Xanh navy';
      }
      if (key === 'discovery.colors_a11y') {
        return `Colors: ${opts?.colors}`;
      }
      return (opts?.defaultValue as string) ?? key;
    },
  }),
}));

const c = (code: string, label: string, hex: string): DiscoveryColor => ({
  code,
  label,
  hex,
});

const render = (colors: DiscoveryColor[]) => {
  let root!: ReturnType<typeof TestRenderer.create>;
  act(() => {
    root = TestRenderer.create(
      <DiscoveryColorSwatches colors={colors} testID="sw" />,
    );
  });
  return root;
};

const dots = (root: ReturnType<typeof TestRenderer.create>) =>
  root.root.findAll(
    node =>
      node.type === View &&
      typeof node.props.testID === 'string' &&
      node.props.testID.startsWith('sw-'),
  );

const rowStyle = (root: ReturnType<typeof TestRenderer.create>) =>
  StyleSheet.flatten(
    root.root.find(node => node.type === View && node.props.testID === 'sw')
      .props.style,
  ) as ViewStyle;

describe('DiscoveryColorSwatches', () => {
  it('renders one dot per color, in server order, filled with its hex', () => {
    const root = render([
      c('NVY', 'Navy', '#1F2A44'),
      c('WHT', 'White', '#FFFFFF'),
    ]);

    const found = dots(root);
    expect(found.map(d => d.props.testID)).toEqual(['sw-NVY', 'sw-WHT']);
    expect(
      (StyleSheet.flatten(found[0].props.style) as ViewStyle).backgroundColor,
    ).toBe('#1F2A44');
  });

  it(`caps at ${MAX_VISIBLE_SWATCHES} dots and shows the rest as +N`, () => {
    const many = ['BLK', 'WHT', 'GRY', 'BEG', 'NVY', 'RED', 'GRN'].map(code =>
      c(code, code, '#000000'),
    );
    const root = render(many);

    expect(dots(root)).toHaveLength(MAX_VISIBLE_SWATCHES);
    expect(root.root.findByType(Text).props.children).toBe('+2');
  });

  it('keeps the fixed row height even with no colors (masonry budget)', () => {
    const root = render([]);

    expect(dots(root)).toHaveLength(0);
    const style = rowStyle(root);
    expect((style.height as number) + (style.marginTop as number)).toBe(
      SWATCH_ROW_HEIGHT,
    );
  });

  it('labels the row with translated names, falling back to the server label', () => {
    const root = render([
      c('NVY', 'Navy', '#1F2A44'),
      c('ZZZ', 'Mystery', '#123456'),
    ]);

    const row = root.root.find(
      node => node.type === View && node.props.testID === 'sw',
    );
    expect(row.props.accessibilityLabel).toBe('Colors: Xanh navy, Mystery');
  });
});
