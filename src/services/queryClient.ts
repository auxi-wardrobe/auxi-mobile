import { QueryClient } from '@tanstack/react-query';

/**
 * Single app-wide QueryClient instance. Extracted from App.tsx so plain
 * service modules (e.g. notificationService's foreground push handler) can
 * reach the cache too, without importing the app root.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays "fresh" for 60s so revisiting a screen serves cache instead
      // of refetching on every mount/focus. Per-query staleTime still overrides.
      staleTime: 60_000,
      retry: 1,
    },
  },
});
