import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { PersonalizationSettingsScreen } from '../PersonalizationSettingsScreen';
import { useAuth } from '../../../context/AuthContext';
import type { User } from '../../../types/auth';

jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

const mockedUseAuth = useAuth as jest.Mock;
const makeUser = (metadata?: User['user_metadata']): User => ({
  id: 1, email: 'q@a.app', created_at: '2026-01-01T00:00:00Z',
  is_active: true, is_first_login: false, user_metadata: metadata ?? null,
});
const one = (root: ReactTestInstance, id: string) =>
  root.findAll(n => n.props?.testID === id)[0];

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseAuth.mockReturnValue({
    user: makeUser({ style_direction: 'more_relaxed' }),
    updateCurrentUser: jest.fn().mockResolvedValue(makeUser()),
    refreshUser: jest.fn().mockResolvedValue(makeUser()),
    checkAuth: jest.fn().mockResolvedValue(undefined),
  });
});

it('Manage Body Photo row navigates to Body photoDetail', async () => {
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => { r = TestRenderer.create(<PersonalizationSettingsScreen />); });
  act(() => one(r.root, 'personalization-manage-body-row').props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('Body', { mode: 'photoDetail' });
});

it('Style Direction row shows current value (label key in tests)', async () => {
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => { r = TestRenderer.create(<PersonalizationSettingsScreen />); });
  const row = one(r.root, 'personalization-style-direction-row');
  expect(row.props.value).toBe('settings.direction_relaxed_label');
});
