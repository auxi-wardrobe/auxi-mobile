/* eslint-env jest */
/**
 * OutfitCardCaption — the Home card message row.
 *
 * Covers the "Worn N days ago" badge (wear-history feature): it prepends the
 * caption when the outfit was previously worn, reads "Worn today" at 0 days,
 * stays hidden when never worn, and is suppressed on scheduled cards (whose
 * message is already the schedule note).
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

describe('OutfitCardCaption worn badge', () => {
  it('shows "Worn N days ago" before the caption when worn 12 days ago', () => {
    const r = render(
      <OutfitCardCaption testID="cap" caption="Calm and Clear" wornDaysAgo={12} />,
    );
    const worn = hostByTestID(r.root, 'cap-worn');
    expect(worn).toHaveLength(1);
    expect(worn[0].props.children).toBe('home.worn_days_ago#12');
  });

  it('reads "Worn today" at 0 days', () => {
    const r = render(
      <OutfitCardCaption testID="cap" caption="Calm and Clear" wornDaysAgo={0} />,
    );
    expect(hostByTestID(r.root, 'cap-worn')[0].props.children).toBe(
      'home.worn_today',
    );
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
