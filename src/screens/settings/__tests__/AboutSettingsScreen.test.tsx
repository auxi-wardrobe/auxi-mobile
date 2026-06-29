import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { AboutSettingsScreen } from '../AboutSettingsScreen';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

const one = (root: ReactTestInstance, id: string) =>
  root.findAll(n => n.props?.testID === id)[0];

beforeEach(() => jest.clearAllMocks());

it('Terms row opens the Terms legal doc from settings', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => { r = TestRenderer.create(<AboutSettingsScreen />); });
  act(() => one(r.root, 'settings-terms-of-service-row').props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('LegalDocument', {
    documentType: 'terms', source: 'settings',
  });
});

it('Privacy Policy row opens the Privacy legal doc from settings', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => { r = TestRenderer.create(<AboutSettingsScreen />); });
  act(() => one(r.root, 'settings-privacy-policy-row').props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('LegalDocument', {
    documentType: 'privacy', source: 'settings',
  });
});
