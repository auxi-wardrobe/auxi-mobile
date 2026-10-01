import { useCallback, useEffect, useRef, useState } from 'react';
import { track } from '../../services/analytics';
import {
  makeItYoursService,
  type MakeItYoursResponse,
} from '../../services/makeItYoursService';

/**
 * Minimum time the loading modal stays up so its three steps
 * ("Understanding the look" → "Finding what you own" → "Building the closest
 * match") can actually be read — the backend answers in well under a second.
 */
export const MIN_LOADING_MS = 1800;

export type MakeItYoursRunStatus = 'idle' | 'loading' | 'error';
export type MakeItYoursErrorCode =
  | 'network_error'
  | 'timeout'
  | 'not_found'
  | 'rate_limited'
  | 'server_error';

type HttpError = { code?: string; name?: string; response?: { status?: number } };

const isCancel = (error: unknown): boolean => {
  const e = error as HttpError;
  return e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError' || e?.name === 'AbortError';
};

export const toErrorCode = (error: unknown): MakeItYoursErrorCode => {
  const e = error as HttpError;
  const status = e?.response?.status;
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limited';
  if (status) return 'server_error';
  if (e?.code === 'ECONNABORTED' || e?.code === 'ETIMEDOUT') return 'timeout';
  return 'network_error';
};

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Drives one Make It Yours run for a Discovery outfit.
 *
 *   start()  idle|error → loading → onDone(result)  (or → error)
 *   cancel() loading → idle, request aborted, NO error surfaced (Scenario 13)
 *   retry()  error → loading
 *
 * Repeated `start()` while loading is a no-op (no duplicate jobs). The result
 * goes straight to `onDone` — the Discovery detail swaps its bottom panel to
 * the result in place (Figma 5456:19140), so nothing re-fetches on Close/Back.
 */
export const useMakeItYoursRun = (
  outfitId: string | undefined,
  onDone: (result: MakeItYoursResponse) => void,
) => {
  const [status, setStatus] = useState<MakeItYoursRunStatus>('idle');
  const [errorCode, setErrorCode] = useState<MakeItYoursErrorCode | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const startedAtRef = useRef(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Leaving the screen mid-run must not leave a request (or a late onDone) behind.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const run = useCallback(() => {
    if (!outfitId || controllerRef.current) {
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    startedAtRef.current = Date.now();
    setStatus('loading');
    setErrorCode(null);

    Promise.all([makeItYoursService.run(outfitId, controller.signal), delay(MIN_LOADING_MS)])
      .then(([result]) => {
        if (controller.signal.aborted) return;
        controllerRef.current = null;
        track('make_it_yours_completed', {
          outfit_id: outfitId,
          state: result.state,
          outfit_count: result.outfits.length,
          duration_ms: Date.now() - startedAtRef.current,
          algorithm_version: result.algorithm_version,
        });
        setStatus('idle');
        onDoneRef.current(result);
      })
      .catch(error => {
        if (controller.signal.aborted || isCancel(error)) return;
        controllerRef.current = null;
        const code = toErrorCode(error);
        track('make_it_yours_failed', { outfit_id: outfitId, error_code: code });
        setErrorCode(code);
        setStatus('error');
      });
  }, [outfitId]);

  const start = useCallback(() => {
    if (!outfitId || controllerRef.current) return;
    track('make_it_yours_started', { outfit_id: outfitId });
    run();
  }, [outfitId, run]);

  const retry = useCallback(() => {
    if (!outfitId || controllerRef.current) return;
    track('make_it_yours_retried', { outfit_id: outfitId });
    run();
  }, [outfitId, run]);

  const cancel = useCallback(() => {
    const controller = controllerRef.current;
    if (controller) {
      controller.abort();
      controllerRef.current = null;
    }
    if (controller && outfitId) {
      track('make_it_yours_cancelled', {
        outfit_id: outfitId,
        elapsed_ms: Date.now() - startedAtRef.current,
      });
    }
    setStatus('idle');
    setErrorCode(null);
  }, [outfitId]);

  return { status, errorCode, start, retry, cancel };
};
