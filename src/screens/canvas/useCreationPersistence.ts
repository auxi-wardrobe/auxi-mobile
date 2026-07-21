/**
 * Save-to-My-Creations persistence for the Outfit Canvas. Serializes the
 * URI-backed items, saves via creationsService, invalidates the creations query,
 * fires analytics + the success/failure snackbars, and marks the canvas clean.
 * Owns the in-flight `isSaving` guard; operates on the passed items/tags.
 *
 * Behaviour preserved verbatim from OutfitCanvasScreen — `persistCreation`
 * returns whether anything was saved and NEVER navigates.
 */
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { CanvasItemData } from '../../components/features/OutfitCanvasSurface';
import { track } from '../../services/analytics';
import {
  CREATIONS_QUERY_KEY,
  CreationItem,
  CreationSaveError,
  creationsService,
} from '../../services/creationsService';
import { extractUri } from './canvas-helpers';
import { CANVAS_WIDTH } from './canvas-dimensions';

interface UseCreationPersistenceParams {
  items: CanvasItemData[];
  tags: string[];
  showSavedSnackbar: () => void;
  showSaveError: () => void;
  markCreationSaved: () => void;
  /** Clears the unsaved-changes flag on a successful save. Must be stable. */
  markClean: () => void;
}

export function useCreationPersistence({
  items,
  tags,
  showSavedSnackbar,
  showSaveError,
  markCreationSaved,
  markClean,
}: UseCreationPersistenceParams) {
  const queryClient = useQueryClient();
  // In-flight Save guard: true while persistCreation awaits the network so the
  // Save button can show its spinner and block a double-tap. Cleared in a
  // `finally`, so it always resets even if the save throws.
  const [isSaving, setIsSaving] = useState(false);

  // Persist the current canvas arrangement to the local My Creations store and
  // confirm with a toast that says WHERE it went. Returns whether anything was
  // saved (false when there's nothing URI-backed to persist). Does NOT navigate
  // — the user stays on the canvas; the toast points them at My Creations.
  const persistCreation = useCallback(async (): Promise<boolean> => {
    // Only items backed by a real image URI persist — mock require()'d assets
    // (the deep-link/dev fallback) aren't serializable and are skipped.
    const savedItems = items.reduce<CreationItem[]>((acc, it) => {
      const uri = extractUri(it.imageSource);
      if (uri) {
        acc.push({
          id: it.id,
          wardrobeItemId: it.wardrobeItemId,
          imageUri: uri,
          x: it.x,
          y: it.y,
          width: it.width,
          height: it.height,
          zIndex: it.zIndex,
          scale: it.scale,
          rotation: it.rotation,
        });
      }
      return acc;
    }, []);

    if (savedItems.length === 0) {
      return false;
    }

    setIsSaving(true);
    try {
      await creationsService.saveCreation({
        items: savedItems,
        tags,
        canvasWidth: CANVAS_WIDTH,
      });
      queryClient.invalidateQueries({ queryKey: CREATIONS_QUERY_KEY });
      track('creation_saved', { item_count: savedItems.length });
      markClean();
      // Light the My Creations header dot (same "unseen saved" feedback as the
      // Home favourites "Wear this" mint dot); cleared when the list is opened.
      markCreationSaved();
      showSavedSnackbar();
      return true;
    } catch (error) {
      // A genuine save failure (a true offline error never reaches here — the
      // service falls back to a local save). `auth` = session expired: the
      // apiClient interceptor already cleared tokens, redirected to login and
      // toasted, so we stay silent and let that play out. Anything else didn't
      // save — tell the user so they can retry instead of seeing fake success.
      const isAuth =
        error instanceof CreationSaveError && error.kind === 'auth';
      if (!isAuth) {
        showSaveError();
        Sentry.captureException(error, { tags: { feature: 'creation_save' } });
      }
      track('creation_save_failed', {
        kind: error instanceof CreationSaveError ? error.kind : 'unknown',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    items,
    tags,
    queryClient,
    showSavedSnackbar,
    markCreationSaved,
    showSaveError,
    markClean,
  ]);

  const handleSave = useCallback(() => {
    persistCreation();
  }, [persistCreation]);

  return { isSaving, persistCreation, handleSave };
}
