// src/hooks/useFeatureFlag.ts
//
// Typed wrappers over the @unleash/proxy-client-react hooks so call sites use
// the `FLAGS` constants (never raw flag strings) and gate UI on readiness.

import {
  useFlag,
  useVariant,
  useFlagsStatus,
} from '@unleash/proxy-client-react';
import type { FlagName } from '../services/feature-flags';

export const useFeatureFlag = (name: FlagName): boolean => useFlag(name);
export const useFeatureVariant = (name: FlagName) => useVariant(name);

// True once the first toggle fetch has resolved — gate UI on this to avoid a
// flash of the wrong variant at cold start.
export const useFlagsReady = (): boolean => useFlagsStatus().flagsReady;
