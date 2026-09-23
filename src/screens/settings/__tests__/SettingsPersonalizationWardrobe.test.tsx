/* eslint-env jest */
/**
 * Settings › Personalization › Wardrobe (plan 260923).
 *
 * The wardrobe direction (Menswear / Womenswear) is editable here because it
 * drives Discovery + the Macgie starter items. Covers:
 *  - row label: current direction, or "Not set" for an unset / legacy "Mixed";
 *  - Update calls `updateWardrobeDirection`, tracks `wardrobe_direction_changed`,
 *    drops the V05 session and invalidates wardrobe + discovery queries;
 *  - picking the current value is a no-op (no request).
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { useAuth } from '../../../context/AuthContext';
import { track } from '../../../services/analytics';
import { resetV05Session } from '../../../services/v05Api';
import { SettingsPersonalizationScreen } from '../SettingsPersonalizationScreen';
import type { User, UserMetadata } from '../../../types/auth';

const mockInvalidate = jest.fn();

jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('../../../services/v05Api', () => ({ resetV05Session: jest.fn() }));
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

const mockedUseAuth = useAuth as jest.Mock;

const makeUser = (metadata: UserMetadata | null): User => ({
  id: 1,
  email: 'qa@auxi.app',
  created_at: '2026-01-01T00:00:00Z',
  is_active: true,
  user_metadata: metadata,
});

const byTestID = (root: ReactTestInstance, id: string) =>
  root.findAll(n => n.props?.testID === id && typeof n.type !== 'string');

const press = async (node: ReactTestInstance) => {
  await act(async () => {
    await node.props.onPress();
  });
};

const render = (metadata: UserMetadata | null, update = jest.fn()) => {
  mockedUseAuth.mockReturnValue({
    user: makeUser(metadata),
    updateWardrobeDirection: update,
    updateCurrentUser: jest.fn(),
    checkAuth: jest.fn(),
  });
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(<SettingsPersonalizationScreen />);
  });
  return tree.root;
};

const rowValue = (root: ReactTestInstance) =>
  byTestID(root, 'settings-wardrobe-row')[0].props.value;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Settings › Wardrobe row', () => {
  it('shows the current direction', () => {
    const root = render({ wardrobe_direction: 'Menswear' });
    expect(rowValue(root)).toBe('settings.wardrobe_menswear_label');
  });

  it('shows "Not set" for a legacy Mixed value', () => {
    const root = render({ wardrobe_direction: 'Mixed' });
    expect(rowValue(root)).toBe('settings.wardrobe_not_set');
  });
});

describe('Settings › Wardrobe update', () => {
  it('switches direction, tracks it and refreshes dependent data', async () => {
    const update = jest.fn().mockResolvedValue({ changed: true });
    const root = render({ wardrobe_direction: 'Menswear' }, update);

    await press(byTestID(root, 'settings-wardrobe-row')[0]);
    const list = root.find(
      n => n.props?.testIDPrefix === 'settings-wardrobe-option',
    );
    act(() => list.props.onSelect('Womenswear'));
    await press(byTestID(root, 'settings-wardrobe-update')[0]);

    expect(update).toHaveBeenCalledWith('Womenswear');
    expect(track).toHaveBeenCalledWith('wardrobe_direction_changed', {
      from: 'menswear',
      to: 'womenswear',
    });
    expect(resetV05Session).toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledTimes(2);
  });

  it('is a no-op when the picked value is already current', async () => {
    const update = jest.fn();
    const root = render({ wardrobe_direction: 'Womenswear' }, update);
    await press(byTestID(root, 'settings-wardrobe-row')[0]);
    await press(byTestID(root, 'settings-wardrobe-update')[0]);
    expect(update).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });
});
