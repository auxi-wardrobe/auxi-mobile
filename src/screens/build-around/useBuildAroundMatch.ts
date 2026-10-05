import { useCallback, useEffect, useRef, useState } from 'react';
import { track } from '../../services/analytics';
import {
  buildAroundMatchService,
  trendTagProps,
  type BuildAroundMatchResponse,
} from '../../services/buildAroundMatchService';
import {
  MIN_LOADING_MS,
  toErrorCode,
  type MakeItYoursErrorCode,
} from '../make-it-yours/useMakeItYoursRun';

export type BuildAroundRunStatus = 'idle' | 'loading' | 'error';

type HttpError = { code?: string; name?: string };

const isCancel = (error: unknown): boolean => {
  const e = error as HttpError;
  return e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError' || e?.name === 'AbortError';
};

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Drives one "find the best match from Discovery" run for an anchor item.
 *
 *   start(tag)    idle|error → loading → onDone(result)  (or → error)
 *   cancel()      loading → idle, request aborted, NO error surfaced
 *   retry()       error → loading with the same tag
 *
 * Repeated `start()` while loading is a no-op (no duplicate jobs). Mirrors
 * `useMakeItYoursRun` (same minimum loading time so the three steps can be
 * read, same abort-on-unmount guarantee).
 */
export const useBuildAroundMatch = (
  itemId: string | undefined,
  onDone: (result: BuildAroundMatchResponse) => void,
) => {
  const [status, setStatus] = useState<BuildAroundRunStatus>('idle');
  const [errorCode, setErrorCode] = useState<MakeItYoursErrorCode | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const startedAtRef = useRef(0);
  const tagRef = useRef<string | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => () => controllerRef.current?.abort(), []);

  const run = useCallback(() => {
    if (!itemId || controllerRef.current) {
      return;
    }
    const trendTag = tagRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    startedAtRef.current = Date.now();
    setStatus('loading');
    setErrorCode(null);

    Promise.all([
      buildAroundMatchService.run(itemId, trendTag, controller.signal),
      delay(MIN_LOADING_MS),
    ])
      .then(([result]) => {
        if (controller.signal.aborted) return;
        controllerRef.current = null;
        track('build_around_discovery_completed', {
          item_id: itemId,
          ...trendTagProps(trendTag),
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
        track('build_around_discovery_failed', { item_id: itemId, ...trendTagProps(trendTag), error_code: code });
        setErrorCode(code);
        setStatus('error');
      });
  }, [itemId]);

  const start = useCallback(
    (trendTag: string | null) => {
      if (!itemId || controllerRef.current) return;
      tagRef.current = trendTag;
      track('build_around_discovery_started', { item_id: itemId, ...trendTagProps(trendTag) });
      run();
    },
    [itemId, run],
  );

  const retry = useCallback(() => {
    if (!itemId || controllerRef.current) return;
    track('build_around_discovery_retried', { item_id: itemId, ...trendTagProps(tagRef.current) });
    run();
  }, [itemId, run]);

  const cancel = useCallback(() => {
    const controller = controllerRef.current;
    if (controller) {
      controller.abort();
      controllerRef.current = null;
      if (itemId) {
        track('build_around_discovery_cancelled', {
          item_id: itemId,
          ...trendTagProps(tagRef.current),
          elapsed_ms: Date.now() - startedAtRef.current,
        });
      }
    }
    setStatus('idle');
    setErrorCode(null);
  }, [itemId]);

  return { status, errorCode, start, retry, cancel };
};
