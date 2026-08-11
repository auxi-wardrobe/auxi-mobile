// useFeatureFlag — typed, safe read of an Unleash flag (native build).
//
// Reads toggles directly off the singleton client (which FeatureFlagProvider
// starts + polls) rather than the SDK's `useFlag` hook. This makes the read
// PROVIDER-INDEPENDENT: it returns `false` when the flag isn't ready, on any
// error, and even if the provider is somehow absent — it can never throw. That
// is the behaviour the flag layer requires (default-OFF, never blocks a screen).

import { useEffect, useState } from 'react';
import { unleashClient } from '../services/featureFlags';

const safeIsEnabled = (name: string): boolean => {
  try {
    return unleashClient?.isEnabled(name) ?? false;
  } catch {
    return false;
  }
};

export const useFeatureFlag = (name: string): boolean => {
  const [enabled, setEnabled] = useState<boolean>(() => safeIsEnabled(name));

  useEffect(() => {
    // Capture into a const so the null-guard narrows inside the cleanup too.
    const client = unleashClient;
    if (!client) {
      return;
    }
    const sync = () => setEnabled(safeIsEnabled(name));
    // Re-read on the initial resolve and every subsequent toggle update.
    sync();
    client.on('ready', sync);
    client.on('update', sync);
    return () => {
      client.off('ready', sync);
      client.off('update', sync);
    };
  }, [name]);

  return enabled;
};
