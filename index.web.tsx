import './web/fonts.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  setForcedFirstLogin,
  setPendingNavIntent,
} from './src/services/reviewOverrides';
import {
  clearTokens,
  enableEphemeralMode,
  hydrateFromSharedCookie,
  setPendingReturnUrl,
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
  if (isEmbed) {
    // RN Web's flex:1 children need a *bounded* height to compute scroll correctly.
    // index.html uses min-height:100vh which allows expansion; inside the fixed-size
    // DeviceFrame iframe that means ScrollViews never overflow → nothing scrolls.
    // Pinning to height:100% resolves to the iframe's actual pixel height (e.g. 844px)
    // so every flex:1 View is bounded and ScrollViews can compute overflow properly.
    const pin = (el: HTMLElement | null) => {
      if (!el) return;
      el.style.height = '100%';
      el.style.minHeight = '';
    };
    pin(document.documentElement);
    pin(document.body);
    pin(document.getElementById('root'));

    // Wheel fallback: when cursor is over a non-scrollable element (header,
    // tab bar, card overlay), wheel events bubble to document without hitting
    // a ScrollView. Find the largest visible scrollable element and forward.
    document.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        // Walk up to see if a scrollable ancestor handled this naturally
        let el = e.target as HTMLElement | null;
        while (el && el !== document.documentElement) {
          const cs = getComputedStyle(el);
          if (
            (cs.overflowY === 'scroll' || cs.overflowY === 'auto') &&
            el.scrollHeight > el.clientHeight + 1
          ) {
            return; // native ScrollView scroll — leave it alone
          }
          el = el.parentElement;
        }
        // No scrollable ancestor — proxy scroll to the largest visible scrollable
        let best: HTMLElement | null = null;
        let bestArea = 0;
        document.querySelectorAll<HTMLElement>('*').forEach(node => {
          const cs = getComputedStyle(node);
          if (
            (cs.overflowY === 'scroll' || cs.overflowY === 'auto') &&
            node.scrollHeight > node.clientHeight + 1
          ) {
            const r = node.getBoundingClientRect();
            const area = r.width * r.height;
            if (area > bestArea && r.top >= -1 && r.bottom <= window.innerHeight + 1) {
              best = node;
              bestArea = area;
            }
          }
        });
        if (best) {
          (best as HTMLElement).scrollTop += e.deltaY;
          e.preventDefault();
        }
      },
      { passive: false },
    );
  }

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
    // Wipe any pre-existing (e.g. designer) session from this origin's
    // localStorage first — cookie-safe under ephemeral mode — so the
    // impersonation session can't inherit a stale refresh_token and later
    // silently refresh back into the designer account.
    await clearTokens();
    await setTokens({ access_token: paramToken });
    stripTokenFromUrl();
  } else if (authState !== 'logged-out') {
    // Designer flow: adopt a shared cross-subdomain session if one exists;
    // otherwise the app boots unauthenticated and the real login screen mounts.
    const hydrated = await hydrateFromSharedCookie();
    if (!hydrated) {
      // No active session — if we arrived via the Google OAuth relay
      // (?return=<preview-url>), register the URL so setTokens fires the
      // redirect after the user completes login. Register AFTER hydration so
      // hydrateFromSharedCookie's internal setTokens call never sees it.
      const returnParam = new URLSearchParams(search).get('return');
      if (returnParam) {
        setPendingReturnUrl(returnParam);
        // Strip from URL so a bookmark/share of this page doesn't replay the relay.
        const qs = new URLSearchParams(search);
        qs.delete('return');
        const q = qs.toString();
        history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
      }
    }
  }

  root.render(<App />);
}
boot();
