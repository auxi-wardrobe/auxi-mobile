// Web (vite) no-op counterpart of featureFlags.tsx.
//
// The Unleash RN SDK pulls in native modules (AsyncStorage,
// react-native-get-random-values) that don't belong in — and can break — the
// browser bundle, so on web we skip it entirely: the provider is a passthrough
// and every flag is OFF (see useFeatureFlag.web.ts). vite resolves this
// `.web.tsx` ahead of featureFlags.tsx, so the SDK never enters the web-preview
// / sandbox build. Flag-gated features simply don't render on web.

import React from 'react';

export const FLAGS = {
  TRENDING_ITEM_DROP: 'trending_item_drop',
} as const;

export type FlagName = (typeof FLAGS)[keyof typeof FLAGS];

export const unleashClient = null;

export const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <>{children}</>;
