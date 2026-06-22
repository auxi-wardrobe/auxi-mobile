import './web/fonts.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { startMocks } from './web/mocks/browser';
import { seedMockAuth } from './web/boot/MockAuthBoot';
import { DeviceFrame } from './web/device-frame/DeviceFrame';
import App from './App';

async function boot() {
  await startMocks();
  await seedMockAuth();
  const root = createRoot(document.getElementById('root')!);
  root.render(
    <DeviceFrame>
      <App />
    </DeviceFrame>,
  );
}
boot();
