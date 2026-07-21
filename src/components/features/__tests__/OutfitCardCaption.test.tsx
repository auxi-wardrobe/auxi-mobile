/* eslint-env jest */
/**
 * OutfitCardCaption — the Home card message row.
 *
 * Covers the "Worn N days ago" badge (wear-history feature): it renders as its
 * own pill before the caption only once a look is stale (> 3 days), stays
 * hidden for fresh/recently-worn outfits, is hidden when never worn, and is
 * suppressed on scheduled cards (whose message is already the schedule note).
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';

jest.mock('react-i18next', () => {
  const t = (key: string, opts?: { count?: number }) =>
    opts && typeof opts.count === 'number' ? `${key}#${opts.count}` : key;
  return { useTranslation: () => ({ t }) };
});

// MarqueeText measures layout with Animated; render it as a plain Text carrying
// the caption string so assertions stay deterministic.
jest.mock('../../atoms/MarqueeText', () => {
  const RN = require('react-native');
  const ReactLib = require('react');
  return {
    MarqueeText: ({ text }: { text: string }) =>
      ReactLib.createElement(RN.Text, null, text),
  };
});

import { OutfitCardCaption } from '../OutfitCardCaption';

const render = (el: React.ReactElement): TestRenderer.ReactTestRenderer => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
};

// Host (rendered) node carrying the testID — a composite receiving testID as a
// prop must not count.
const hostByTestID = (
  root: ReactTestInstance,
  id: string,
): ReactTestInstance[] =>
  root.findAll(n => typeof n.type === 'string' && n.props?.testID === id);

// Text rendered inside the worn pill (the pill is a View host node).
const wornLabelText = (
  root: ReactTestInstance,
): string | undefined => {
  const pill = hostByTestID(root, 'cap-worn');
  if (pill.length === 0) {
    return undefined;
  }
  const label = pill[0].findAll(n => String(n.type) === 'Text');
  return label.length ? String(label[0].props.children) : undefined;
};

describe('OutfitCardCaption worn badge', () => {
  it('shows "Worn N days ago" pill when worn 12 days ago', () => {
    const r = render(
      <OutfitCardCaption testID="cap" caption="Calm and Clear" wornDaysAgo={12} />,
    );
    expect(hostByTestID(r.root, 'cap-worn')).toHaveLength(1);
    expect(wornLabelText(r.root)).toBe('home.worn_days_ago#12');
  });

  it('shows the badge just past the threshold (4 days)', () => {
    const r = render(
      <OutfitCardCaption testID="cap" caption="x" wornDaysAgo={4} />,
    );
    expect(wornLabelText(r.root)).toBe('home.worn_days_ago#4');
  });

  it('hides the badge for a recently-worn look (3 days and today)', () => {
    const r3 = render(<OutfitCardCaption testID="cap" caption="x" wornDaysAgo={3} />);
    expect(hostByTestID(r3.root, 'cap-worn')).toHaveLength(0);
    const r0 = render(<OutfitCardCaption testID="cap" caption="x" wornDaysAgo={0} />);
    expect(hostByTestID(r0.root, 'cap-worn')).toHaveLength(0);
  });

  it('hides the badge when never worn', () => {
    const r = render(<OutfitCardCaption testID="cap" caption="Calm and Clear" />);
    expect(hostByTestID(r.root, 'cap-worn')).toHaveLength(0);
  });

  it('suppresses the badge on scheduled cards', () => {
    const r = render(
      <OutfitCardCaption testID="cap" caption="x" scheduled wornDaysAgo={5} />,
    );
    expect(hostByTestID(r.root, 'cap-worn')).toHaveLength(0);
  });
});
