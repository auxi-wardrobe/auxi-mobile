import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { PrivacySettingsScreen } from '../PrivacySettingsScreen';
import {
  grantAnalyticsConsent,
  hasAnalyticsConsent,
  revokeAnalyticsConsent,
} from '../../../services/analytics';
import { hasAiDataSharingConsent } from '../../../services/aiConsent';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));
jest.mock('../../../services/analytics', () => ({
  hasAnalyticsConsent: jest.fn().mockResolvedValue(false),
  grantAnalyticsConsent: jest.fn().mockResolvedValue(undefined),
  revokeAnalyticsConsent: jest.fn().mockResolvedValue(undefined),
  track: jest.fn(),
}));
jest.mock('../../../services/aiConsent', () => ({
  hasAiDataSharingConsent: jest.fn().mockResolvedValue(false),
  grantAiDataSharingConsent: jest.fn().mockResolvedValue(undefined),
  revokeAiDataSharingConsent: jest.fn().mockResolvedValue(undefined),
}));

const one = (root: ReactTestInstance, id: string) =>
  root.findAll(n => n.props?.testID === id)[0];
const flush = async () => {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
};

it('reflects persisted analytics consent + revokes on toggle off', async () => {
  (hasAnalyticsConsent as jest.Mock).mockResolvedValue(true);
  (hasAiDataSharingConsent as jest.Mock).mockResolvedValue(false);
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => { r = TestRenderer.create(<PrivacySettingsScreen />); });
  await flush();
  expect(one(r.root, 'settings-analytics-consent-toggle').props.value).toBe(true);

  act(() => one(r.root, 'settings-analytics-consent-toggle').props.onValueChange(false));
  await flush();
  expect(revokeAnalyticsConsent).toHaveBeenCalled();
  expect(grantAnalyticsConsent).not.toHaveBeenCalled();
});
