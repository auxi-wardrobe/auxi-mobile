# AGENTS.md — Auxi mobile

Notes for AI agents working in this repo. See `CLAUDE.md` for full conventions.

## Analytics — Mixpanel

Auxi uses **Mixpanel** (`mixpanel-react-native@3.3.0`) for product analytics.

- **Single seam:** `src/services/analytics.ts`. Import `track` / `identifyUser` / `resetAnalytics` from there. **Never** import the Mixpanel SDK directly in screens/hooks.
- **Token:** `src/config/analytics.ts` (`__DEV__` dev/prod split). Dev token is set; `PROD_TOKEN` is empty until the prod project exists.
- **Consent-gated (EU/CA):** the SDK is not initialised until `grantAnalyticsConsent()` is called. `track()`/`identify()` are no-ops before that (dev console only). A consent UI is still pending — see the tracking plan.
- **Identity:** wired in `src/context/AuthContext.tsx` (effect on `user`). `distinct_id` is the DB user id, never email.
- **Full tracking plan, event list, follow-ups, and the manual Mixpanel dashboard checklist:** `docs/analytics/mixpanel-tracking-plan.md`.

### Adding a new event

1. Reuse an existing event with a new property where possible (avoid duplicates).
2. Name it `object_verb` in `snake_case`, past tense. Props `snake_case`; numbers unquoted; omit empty props.
3. `import { track } from '../services/analytics'` and call `track('event_name', { ... })` in the exact handler where the action occurs.
4. Add the event + properties to `docs/analytics/mixpanel-tracking-plan.md` and to Mixpanel Lexicon.
