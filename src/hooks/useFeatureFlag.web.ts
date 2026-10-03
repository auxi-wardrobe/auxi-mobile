// Web build: the Unleash RN SDK isn't bundled (see featureFlags.web.tsx), so
// flags are always OFF on the web preview / sandbox — the gated feature simply
// doesn't render there (see the exception below). vite resolves this `.web.ts` ahead of useFeatureFlag.ts.
import { FLAGS } from '../services/featureFlags';

// Web preview exception: `build_around_discovery` is ON so designers can review
// the flow — the sandbox serves it from the msw mock (web/mocks/handlers.ts),
// not the not-yet-shipped backend endpoint. Every other flag stays OFF.
const WEB_PREVIEW_ON: readonly string[] = [FLAGS.BUILD_AROUND_DISCOVERY];

export const useFeatureFlag = (name: string): boolean => WEB_PREVIEW_ON.includes(name);
