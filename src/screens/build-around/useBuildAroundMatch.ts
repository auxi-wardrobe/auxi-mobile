import { useCallback, useEffect, useRef, useState } from 'react';
import { track } from '../../services/analytics';
import {
  buildAroundMatchService,
  trendTagsProps,
  type BuildAroundMatchResponse,
} from '../../services/buildAroundMatchService';
import {
  MIN_LOADING_MS,
  toErrorCode,
  type MakeItYoursErrorCode,
} from '../make-it-yours/useMakeItYoursRun';

export type BuildAroundRunStatus = 'idle' | 'loading' | 'error';

/** Where the search was started from — an analytics dimension on every event. */
export type BuildAroundEntry = 'item_detail' | 'home_landing';

type HttpError = { code?: string; name?: string };

const isCancel = (error: unknown): boolean => {
  const e = error as HttpError;
  return e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError' || e?.name === 'AbortError';
};

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Drives one "find the best match from Discovery" run for one or more anchor
 * items (ItemDetail passes one; the Home "Build your look" section up to three).
 *
 *   start(tags)   idle|error → loading → onDone(result)  (or → error)
 *   cancel()      loading → idle, request aborted, NO error surfaced
 *   retry()       error → loading with the same tags
 *
 * Repeated `start()` while loading is a no-op (no duplicate jobs). Mirrors
 * `useMakeItYoursRun` (same minimum loading time so the three steps can be
 * read, same abort-on-unmount guarantee).
 *
 * Analytics keep the single-anchor shape (`item_id` = first anchor,
 * `trend_tag` = first tag) and add `item_count` / `entry`; `trend_tags` only
 * appears when more than one tag was chosen.
 */
export const useBuildAroundMatch = (
  itemIds: readonly string[],
  onDone: (result: BuildAroundMatchResponse) => void,
  entry: BuildAroundEntry = 'item_detail',
) => {
  const [status, setStatus] = useState<BuildAroundRunStatus>('idle');
  const [errorCode, setErrorCode] = useState<MakeItYoursErrorCode | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const startedAtRef = useRef(0);
  const tagsRef = useRef<string[]>([]);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  // Read at call time, so a changed selection never restarts a running job.
  const itemIdsRef = useRef(itemIds);
  itemIdsRef.current = itemIds;

  useEffect(() => () => controllerRef.current?.abort(), []);

  const baseProps = useCallback(
    (ids: readonly string[]) => ({
      item_id: ids[0],
      item_count: ids.length,
      entry,
      ...trendTagsProps(tagsRef.current),
    }),
    [entry],
  );

  const run = useCallback(() => {
    const ids = [...itemIdsRef.current];
    if (ids.length === 0 || controllerRef.current) {
      return;
    }
    const trendTags = tagsRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    startedAtRef.current = Date.now();
    setStatus('loading');
    setErrorCode(null);

    Promise.all([
      buildAroundMatchService.run({ itemIds: ids, trendTags }, controller.signal),
      delay(MIN_LOADING_MS),
    ])
      .then(([result]) => {
        if (controller.signal.aborted) return;
        controllerRef.current = null;
        track('build_around_discovery_completed', {
          ...baseProps(ids),
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
        track('build_around_discovery_failed', { ...baseProps(ids), error_code: code });
        setErrorCode(code);
        setStatus('error');
      });
  }, [baseProps]);

  const start = useCallback(
    (trendTags: readonly string[]) => {
      const ids = itemIdsRef.current;
      if (ids.length === 0 || controllerRef.current) return;
      tagsRef.current = [...trendTags];
      track('build_around_discovery_started', baseProps(ids));
      run();
    },
    [baseProps, run],
  );

  const retry = useCallback(() => {
    const ids = itemIdsRef.current;
    if (ids.length === 0 || controllerRef.current) return;
    track('build_around_discovery_retried', baseProps(ids));
    run();
  }, [baseProps, run]);

  const cancel = useCallback(() => {
    const controller = controllerRef.current;
    if (controller) {
      controller.abort();
      controllerRef.current = null;
      const ids = itemIdsRef.current;
      if (ids.length > 0) {
        track('build_around_discovery_cancelled', {
          ...baseProps(ids),
          elapsed_ms: Date.now() - startedAtRef.current,
        });
      }
    }
    setStatus('idle');
    setErrorCode(null);
  }, [baseProps]);

  return { status, errorCode, start, retry, cancel };
};
