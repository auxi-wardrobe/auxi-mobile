/* eslint-env jest */
/**
 * ScheduleScreen — scheduled favourites reuse the Favourite page's "See on me"
 * layout: an outfit with a saved try-on photo (`tryOnResultStore`) leads with
 * the photo + garment rail and its CTA reads "Retake" (straight to capture);
 * an outfit without one keeps the plain tile grid and "See on me" CTA (via the
 * reuse-confirm gate).
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { Favourite } from '../../services/favouriteService';

jest.mock('../../theme/motion', () => ({
  ...jest.requireActual('../../theme/motion'),
  useReducedMotion: () => true,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, setParams: jest.fn() }),
  useRoute: () => ({ params: { focusDate: '2026-09-24' } }),
}));

jest.mock('../../services/analytics', () => ({
  track: jest.fn(),
}));

jest.mock('../../context/SidebarContext', () => ({
  useSidebar: () => ({ open: jest.fn() }),
}));

jest.mock('../see-this-on-me/use-outfit-generating', () => ({
  useIsOutfitGenerating: () => false,
}));

const mockMakeFavourite = (id: string, hash: string): Favourite =>
  ({
    id,
    user_id: 'u1',
    outfit_items: [
      { id: `${id}-i1`, image_url: 'https://x/1.jpg', image_png: null },
      { id: `${id}-i2`, image_url: 'https://x/2.jpg', image_png: null },
    ],
    outfit_context: { outfit_hash: hash, reasoning_human: 'note' },
    outfit_thumbnail_url: null,
    created_at: '2026-09-20T00:00:00Z',
    updated_at: '2026-09-20T00:00:00Z',
    title: 'Look',
    mood_tags: [],
  } as unknown as Favourite);

const mockWithPhoto = mockMakeFavourite('fav-photo', 'hash-photo');
const mockWithoutPhoto = mockMakeFavourite('fav-plain', 'hash-plain');

jest.mock('../../context/ScheduleContext', () => ({
  useSchedule: () => ({
    scheduledByDay: {
      '2026-09-24': [
        { kind: 'favourite', favourite: mockWithPhoto },
        { kind: 'favourite', favourite: mockWithoutPhoto },
      ],
    },
    unscheduleOutfit: jest.fn(),
  }),
}));

import { ScheduleScreen } from '../ScheduleScreen';
import { recordTryOnResult } from '../../services/tryOnResultStore';

const hasTestID = (root: ReactTestInstance, id: string): boolean =>
  root.findAll(n => n.props?.testID === id).length > 0;

const pressableWith = (
  root: ReactTestInstance,
  id: string,
): ReactTestInstance =>
  root.findAll(
    n => n.props?.testID === id && typeof n.props?.onPress === 'function',
  )[0];

const render = (): TestRenderer.ReactTestRenderer => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(<ScheduleScreen />);
  });
  return r;
};

describe('ScheduleScreen — See on me layout', () => {
  beforeAll(() => {
    recordTryOnResult('hash-photo', 'https://x/try-on.jpg');
  });

  beforeEach(() => mockNavigate.mockClear());

  it('leads with the try-on photo only for the outfit that has one', () => {
    const r = render();
    expect(hasTestID(r.root, 'favourite-card-fav-photo-try-on-hero')).toBe(
      true,
    );
    expect(hasTestID(r.root, 'favourite-card-fav-plain-try-on-hero')).toBe(
      false,
    );
  });

  it('flips the CTA to Retake and goes straight to capture', () => {
    const r = render();
    const retake = pressableWith(
      r.root,
      'schedule-self-visualization-fav-photo-retake',
    );
    expect(retake).toBeDefined();
    act(() => retake.props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith(
      'SeeThisOnMe',
      expect.objectContaining({
        reuseAction: 'capture',
        outfit: expect.objectContaining({ outfitHash: 'hash-photo' }),
      }),
    );
  });

  it('keeps "See on me" via the confirm gate when no photo exists', () => {
    const r = render();
    const seeOnMe = pressableWith(
      r.root,
      'schedule-self-visualization-fav-plain',
    );
    expect(seeOnMe).toBeDefined();
    act(() => seeOnMe.props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith(
      'SeeThisOnMeConfirm',
      expect.objectContaining({
        outfit: expect.objectContaining({ outfitHash: 'hash-plain' }),
      }),
    );
  });
});
