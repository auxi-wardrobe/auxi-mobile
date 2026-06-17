/**
 * React binding for the background-safe try-on generation store (AU-358).
 * Subscribes the component to the module-level singleton via
 * `useSyncExternalStore` (React 19) so the screen re-renders on status changes
 * even after the user quit and returned.
 */
import { useSyncExternalStore } from 'react';
import {
  tryOnGenerationStore,
  TryOnGenerationState,
} from './try-on-generation-store';

export const useTryOnGeneration = (): TryOnGenerationState =>
  useSyncExternalStore(
    tryOnGenerationStore.subscribe,
    tryOnGenerationStore.getState,
  );
