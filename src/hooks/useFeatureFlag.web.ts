// Web build: the Unleash RN SDK isn't bundled (see featureFlags.web.tsx), so
// flags are always OFF on the web preview / sandbox — the gated feature simply
// doesn't render there. vite resolves this `.web.ts` ahead of useFeatureFlag.ts.
export const useFeatureFlag = (_name: string): boolean => false;
