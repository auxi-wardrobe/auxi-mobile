import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

export const startMocks = () =>
  worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: './mockServiceWorker.js' },
  });
