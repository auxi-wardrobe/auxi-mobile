/**
 * Background-safe store for the "See this on me" / self-visualization render
 * (AU-358 / AU-354 pt.2).
 *
 * WHY THIS EXISTS
 * ---------------
 * The high-res try-on render takes ~10-20s. Previously the request was awaited
 * inside `SeeThisOnMeScreen` with the result in component-local state, so the
 * user was trapped on a blocking loading screen — leaving it unmounted the
 * component and dropped the in-flight render (and there was no way to learn it
 * had finished). This store lifts the generation OUT of the React tree so it:
 *
 *   1. keeps running when the user quits the loading screen ("continue in
 *      background"), and
 *   2. notifies (in-app) on completion via an injected `onBackgroundComplete`
 *      callback, so the user can return and view their result.
 *
 * KISS: a single module-level singleton (no Redux/Zustand — see auxi/CLAUDE.md).
 * Only ONE generation is tracked at a time, which matches the flow (one outfit
 * render per visit). Subscribe from React via `useTryOnGeneration`.
 */
import { tryOnService } from '../../services/tryOnService';
import { TryOnOutfitContext } from '../../types/navigation';
import { BodyShapeId } from './body-shapes';
import { pickRandomPose } from './poses';

export type TryOnGenerationStatus =
  | 'idle'
  | 'generating'
  | 'success'
  | 'error';

export interface TryOnGenerationState {
  status: TryOnGenerationStatus;
  /** The outfit being rendered — kept so a backgrounded screen can re-navigate. */
  outfit: TryOnOutfitContext | null;
  /** Inputs, retained so retry can re-run without the screen holding them. */
  bodyId: string | null;
  shape: BodyShapeId | null;
  /** Resolved composite (url or data-uri) once `status === 'success'`. */
  resultUrl: string | null;
  provider: string | null;
  /** True while the loading screen is NOT mounted (user quit / backgrounded). */
  backgrounded: boolean;
}

const initialState: TryOnGenerationState = {
  status: 'idle',
  outfit: null,
  bodyId: null,
  shape: null,
  resultUrl: null,
  provider: null,
  backgrounded: false,
};

let state: TryOnGenerationState = initialState;
const listeners = new Set<() => void>();

// Bumps every time a new generation starts so a stale in-flight resolution
// (e.g. the user retook + restarted) can't clobber the current one.
let runToken = 0;

/**
 * Fired when a generation finishes while the screen is backgrounded (the user
 * quit the loading screen). The screen injects this on mount; it drives the
 * in-app completion Toast + the `body_shape_generation_completed_notified`
 * analytics event. Null when no screen is mounted (no-op — the result is still
 * stored and shown when the user returns).
 */
type BackgroundCompleteHandler = (
  result: { status: 'success' | 'error'; outfit: TryOnOutfitContext | null },
) => void;
let onBackgroundComplete: BackgroundCompleteHandler | null = null;

export const setBackgroundCompleteHandler = (
  handler: BackgroundCompleteHandler | null,
): void => {
  onBackgroundComplete = handler;
};

const emit = (): void => {
  listeners.forEach(l => l());
};

const setState = (patch: Partial<TryOnGenerationState>): void => {
  state = { ...state, ...patch };
  emit();
};

export const tryOnGenerationStore = {
  getState: (): TryOnGenerationState => state,

  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Mark whether the loading screen is currently mounted. When `true` the user
   * is watching; when `false` they've quit and a completion must notify.
   */
  setBackgrounded: (backgrounded: boolean): void => {
    if (state.backgrounded !== backgrounded) {
      setState({ backgrounded });
    }
  },

  /**
   * Kick off (or restart) a generation. Resolves the request OUTSIDE React so
   * it survives the screen unmounting. On completion, if the screen is
   * backgrounded the injected `onBackgroundComplete` handler fires so the app
   * can notify the user. Never throws — failures land in `status: 'error'`.
   */
  start: (input: {
    outfit: TryOnOutfitContext;
    bodyId: string;
    shape: BodyShapeId | null;
  }): void => {
    const token = ++runToken;
    setState({
      status: 'generating',
      outfit: input.outfit,
      bodyId: input.bodyId,
      shape: input.shape,
      resultUrl: null,
      provider: null,
    });

    // Pick a fresh random pose per run so re-generating the same outfit varies
    // the stance (natural vs fashion) instead of always rendering the same flat
    // front-on pose. The backend must read `prompt_params.pose` for this to
    // affect the output — see poses.ts.
    const pose = pickRandomPose();

    tryOnService
      .generateTryOn({
        body_id: input.bodyId,
        wardrobe_item_ids: input.outfit.itemIds,
        // B1 invariant: `start` is only ever reached AFTER the caller has
        // confirmed AI data-sharing consent via useAiConsentGate (see
        // SeeThisOnMeScreen.runGenerate). The backend route requires
        // gemini_opt_in === true, so the only correct value here is `true` —
        // and it now reflects a real, recorded consent decision, not a faked
        // flag. Never call this store method without passing the consent gate.
        gemini_opt_in: true,
        prompt_params: {
          ...(input.shape ? { body_shape: input.shape } : {}),
          pose: pose.prompt,
          pose_register: pose.register,
        },
      })
      .then(res => {
        if (token !== runToken) return; // superseded by a newer run
        const url =
          res.composite_url ??
          (res.composite_png
            ? `data:image/png;base64,${res.composite_png}`
            : null);
        if (!url) {
          throw new Error('no_composite');
        }
        setState({
          status: 'success',
          resultUrl: url,
          provider: res.provider ?? null,
        });
        if (state.backgrounded) {
          onBackgroundComplete?.({ status: 'success', outfit: state.outfit });
        }
      })
      .catch(() => {
        if (token !== runToken) return;
        setState({ status: 'error', resultUrl: null, provider: null });
        if (state.backgrounded) {
          onBackgroundComplete?.({ status: 'error', outfit: state.outfit });
        }
      });
  },

  /** Clear everything (e.g. when the user finishes / leaves the feature). */
  reset: (): void => {
    runToken++; // orphan any in-flight resolution
    state = initialState;
    emit();
  },
};
