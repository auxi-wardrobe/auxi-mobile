import './web/fonts.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  setForcedFirstLogin,
  setPendingNavIntent,
} from './src/services/reviewOverrides';
import {
  enableEphemeralMode,
  hydrateFromSharedCookie,
  setTokens,
} from './src/services/tokenStorage.web';
import { parseTokenParam, stripTokenFromUrl } from './web/boot/tokenParam';
import { authStateForSearch, screenForSearch } from './web/share/screen-intent';
import { DeviceFrame } from './web/device-frame/DeviceFrame';
import App from './App';

const isEmbed =
  typeof location !== 'undefined' &&
  new URLSearchParams(location.search).has('embed');

async function boot() {
  const root = createRoot(document.getElementById('root')!);
  if (!isEmbed) {
    root.render(<DeviceFrame />);
    return;
  }

  const search = typeof location !== 'undefined' ? location.search : '';
  const authState = authStateForSearch(search);
  const screen = screenForSearch(search);
  // Hand the requested landing screen to the navigator (applied on ready).
  if (screen) setPendingNavIntent(screen.target);
  // Onboarding screens only mount when is_first_login — force it for review.
  if (authState === 'first-login') setForcedFirstLogin(true);

  const paramToken = parseTokenParam(search);
  if (paramToken) {
    // Admin impersonation: ephemeral, localStorage-only, never touch the
    // shared designer cookie. Strip the token from the URL immediately.
    enableEphemeralMode();
    await setTokens({ access_token: paramToken });
    stripTokenFromUrl();
  } else if (authState !== 'logged-out') {
    // Designer flow: adopt a shared cross-subdomain session if one exists;
    // otherwise the app boots unauthenticated and the real login screen mounts.
    await hydrateFromSharedCookie();
  }

  root.render(<App />);
}
boot();
