// src/hooks/useUnleashForegroundRefresh.ts
//
// Polling already keeps flags fresh every `refreshInterval`. This hook also
// forces a re-fetch the instant the app returns to the foreground, so a flag
// flipped while the app was backgrounded takes effect immediately on resume.
// Mount it ONCE under FlagProvider (see AppNavigator).

import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useUnleashClient } from '@unleash/unleash-react-native-sdk';

export const useUnleashForegroundRefresh = (): void => {
  const client = useUnleashClient();
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        // Re-evaluating with the same context triggers a fresh fetch.
        // Fire-and-forget: a failed refresh keeps the last-known cache.
        client.updateContext(client.getContext()).catch(() => {
          // Non-fatal — interval polling will retry.
        });
      }
    });
    return () => sub.remove();
  }, [client]);
};
