import './web/fonts.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { seedMockAuth } from './web/boot/MockAuthBoot';
import { DeviceFrame } from './web/device-frame/DeviceFrame';
import App from './App';

const isEmbed =
  typeof location !== 'undefined' && new URLSearchParams(location.search).has('embed');

async function boot() {
  const root = createRoot(document.getElementById('root')!);
  if (isEmbed) {
    await seedMockAuth(); // dummy client token so AuthContext is authed; proxy injects real auth
    root.render(<App />);
  } else {
    root.render(<DeviceFrame />);
  }
}
boot();
