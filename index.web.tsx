import './web/fonts.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { seedMockAuth } from './web/boot/MockAuthBoot';
import {
  setForcedFirstLogin,
  setPendingNavIntent,
} from './src/services/reviewOverrides';
import { authStateForSearch, screenForSearch } from './web/share/screen-intent';
import { DeviceFrame } from './web/device-frame/DeviceFrame';
import App from './App';

const isEmbed =
  typeof location !== 'undefined' &&
  new URLSearchParams(location.search).has('embed');

async function boot() {
  const root = createRoot(document.getElementById('root')!);
  if (isEmbed) {
    const search = typeof location !== 'undefined' ? location.search : '';
    const authState = authStateForSearch(search);
    const screen = screenForSearch(search);
    // Hand the requested landing screen to the navigator (applied on ready).
    if (screen) {
      setPendingNavIntent(screen.target);
    }
    // Onboarding screens only mount when is_first_login — force it for review.
    if (authState === 'first-login') {
      setForcedFirstLogin(true);
    }
    // Logged-out screens (Welcome / SignIn) render before any /me — skip the
    // mock token so AuthContext boots unauthenticated and the Auth stack mounts.
    if (authState !== 'logged-out') {
      await seedMockAuth(); // dummy client token; proxy injects real auth
    }
    root.render(<App />);
  } else {
    root.render(<DeviceFrame />);
  }
}
boot();
