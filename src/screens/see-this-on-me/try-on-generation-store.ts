/**
 * Background-safe store for the two ASYNC steps of the "See this on me" /
 * self-visualization flow (AU-358):
 *
 *   • phase 'shapes' — generate 3 AI body-shape photos (slim/average/fuller)
 *   • phase 'render' — render the chosen outfit onto the picked body
 *
 * WHY THIS EXISTS
 * ---------------
 * Both steps run on the backend worker (submit → poll, ~30–120s). Awaiting
 * them inside the React tree trapped the user on a blocking screen and dropped
 * the in-flight job if they left. This single store lifts BOTH jobs out of
 * React so each:
 *
 *   1. keeps polling when the user quits the loading screen ("continue in
 *      background"), and
 *   2. notifies (in-app) on completion via the injected `onBackgroundComplete`
 *      callback, so the user can return and continue/view their result.
 *
 * KISS: ONE module-level singleton with a `phase` discriminator — not two
 * mechanisms (per the mobile spec §3.7). Only one job is tracked at a time,
 * which matches the linear flow (shapes → pick → render). Subscribe from React
 * via `useTryOnGeneration`.
 */
import { tryOnService } from '../../services/tryOnService';
import { bodyShapeService } from '../../services/bodyShapeService';
import { pollJob } from '../../services/job-polling';
import { TryOnOutfitContext } from '../../types/navigation';
import { BodyShapeId, GeneratedShape, sortShapes } from './body-shapes';

export type GenerationPhase = 'shapes' | 'render';

export type TryOnGenerationStatus = 'idle' | 'generating' | 'success' | 'error';

export interface TryOnGenerationState {
  /** Which async job is tracked, or null when idle. */
  phase: GenerationPhase | null;
  status: TryOnGenerationStatus;
  /** The outfit in flight — kept for both phases so a backgrounded screen can
   *  re-navigate, and so the render phase knows what to render. */
  outfit: TryOnOutfitContext | null;

  /** The worker job id for the current phase (needed by the screen to `select`). */
  jobId: string | null;

  // ── shapes phase ──────────────────────────────────────────────────────────
  /** Inputs, retained so a retry can re-run without the screen holding them. */
  selfieId: string | null;
  fullBodyId: string | null;
  /** The 3 generated builds (sorted slim→average→fuller) once succeeded. */
  shapes: GeneratedShape[] | null;
  /** True when only 1–2/3 builds succeeded (still a success — show + regenerate). */
  partial: boolean;

  // ── render phase ──────────────────────────────────────────────────────────
  bodyId: string | null;
  shape: BodyShapeId | null;
  /** Resolved composite URL once the render `status === 'success'`. */
  resultUrl: string | null;

  /** True while the loading screen is NOT mounted (user quit / backgrounded). */
  backgrounded: boolean;
}

const initialState: TryOnGenerationState = {
  phase: null,
  status: 'idle',
  outfit: null,
  jobId: null,
  selfieId: null,
  fullBodyId: null,
  shapes: null,
  partial: false,
  bodyId: null,
  shape: null,
  resultUrl: null,
  backgrounded: false,
};

let state: TryOnGenerationState = initialState;
const listeners = new Set<() => void>();

// Bumps every time a new job starts so a stale in-flight resolution (e.g. the
// user retook + restarted, or switched phase) can't clobber the current one.
let runToken = 0;

/**
 * Fired when a job finishes while the screen is backgrounded (the user quit the
 * loading screen). The screen injects this on mount; it drives the in-app
 * completion Toast + the `body_shape_generation_completed_notified` analytics
 * event. `phase` lets the notice pick the right copy ("shapes ready" vs "look
 * ready"). Null when no screen is mounted (no-op — the result is still stored
 * and shown when the user returns).
 */
type BackgroundCompleteHandler = (result: {
  status: 'success' | 'error';
  phase: GenerationPhase;
  outfit: TryOnOutfitContext | null;
}) => void;
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

// Notify a backgrounded screen of a finished job (shared by both phases).
const notifyIfBackgrounded = (
  status: 'success' | 'error',
  phase: GenerationPhase,
): void => {
  if (state.backgrounded) {
    onBackgroundComplete?.({ status, phase, outfit: state.outfit });
  }
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
   * Phase 1: generate the 3 body-shape photos. Submits the job then polls OUTSIDE
   * React so it survives the screen unmounting. On success `shapes` holds the
   * sorted builds (+ `partial`). Never throws — failures land in `status:'error'`.
   *
   * `fullBodyId` is required by the backend; the screen passes the full-body id
   * when captured, else falls back to the selfie id (same fallback the render
   * uses), since a 3-shape job needs two body ids.
   */
  startShapes: (input: {
    outfit: TryOnOutfitContext;
    selfieId: string;
    fullBodyId: string;
  }): void => {
    const token = ++runToken;
    setState({
      phase: 'shapes',
      status: 'generating',
      outfit: input.outfit,
      jobId: null,
      selfieId: input.selfieId,
      fullBodyId: input.fullBodyId,
      shapes: null,
      partial: false,
      // clear any stale render output from a prior run
      resultUrl: null,
    });

    (async () => {
      try {
        const { job_id } = await bodyShapeService.generateBodyShapes({
          full_body_id: input.fullBodyId,
          selfie_id: input.selfieId,
          gemini_opt_in: true,
        });
        if (token !== runToken) return; // superseded before poll
        setState({ jobId: job_id });
        const { result } = await pollJob(
          () => bodyShapeService.getBodyShapeResult(job_id),
          r => r.status === 'completed' || r.status === 'failed',
          { shouldContinue: () => token === runToken },
        );
        if (token !== runToken) return; // superseded

        const shapes = result?.shapes ?? [];
        if (result?.status === 'completed' && shapes.length > 0) {
          setState({
            status: 'success',
            shapes: sortShapes(shapes),
            partial: result.partial === true,
          });
          notifyIfBackgrounded('success', 'shapes');
        } else {
          setState({ status: 'error', shapes: null, partial: false });
          notifyIfBackgrounded('error', 'shapes');
        }
      } catch {
        if (token !== runToken) return;
        setState({ status: 'error', shapes: null, partial: false });
        notifyIfBackgrounded('error', 'shapes');
      }
    })();
  },

  /**
   * Phase 2: render the outfit onto the chosen body. Submits the job then polls
   * OUTSIDE React. On success `resultUrl` is the durable composite URL. Never
   * throws — failures land in `status:'error'`.
   *
   * B1 invariant: only ever reached AFTER the caller confirmed AI data-sharing
   * consent via useAiConsentGate (see SeeThisOnMeScreen.runRender). The route
   * requires gemini_opt_in === true, so the only correct value is `true` — now
   * backed by a recorded consent decision. Never call without the consent gate.
   */
  startRender: (input: {
    outfit: TryOnOutfitContext;
    bodyId: string;
    shape: BodyShapeId | null;
  }): void => {
    const token = ++runToken;
    setState({
      phase: 'render',
      status: 'generating',
      outfit: input.outfit,
      jobId: null,
      bodyId: input.bodyId,
      shape: input.shape,
      resultUrl: null,
    });

    (async () => {
      try {
        const { job_id } = await tryOnService.generateTryOn({
          body_id: input.bodyId,
          wardrobe_item_ids: input.outfit.itemIds,
          gemini_opt_in: true,
          prompt_params: input.shape ? { body_shape: input.shape } : undefined,
        });
        if (token !== runToken) return; // superseded before poll
        setState({ jobId: job_id });
        const { result } = await pollJob(
          () => tryOnService.getTryOnResult(job_id),
          r => r.status === 'completed' || r.status === 'failed',
          { shouldContinue: () => token === runToken },
        );
        if (token !== runToken) return; // superseded

        if (result?.status === 'completed' && result.composite_url) {
          setState({ status: 'success', resultUrl: result.composite_url });
          notifyIfBackgrounded('success', 'render');
        } else {
          setState({ status: 'error', resultUrl: null });
          notifyIfBackgrounded('error', 'render');
        }
      } catch {
        if (token !== runToken) return;
        setState({ status: 'error', resultUrl: null });
        notifyIfBackgrounded('error', 'render');
      }
    })();
  },

  /** Clear everything (e.g. when the user finishes / leaves the feature). */
  reset: (): void => {
    runToken++; // orphan any in-flight resolution
    state = initialState;
    emit();
  },
};
