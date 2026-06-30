/**
 * Generic worker-job poller (AU-358).
 *
 * The body-shape generation + outfit render endpoints are async: submit
 * returns a `job_id`, then the client polls a result endpoint until the job
 * is terminal (`completed` / `failed`). This is the one shared poll loop used
 * by both the background generation store and BodyScreen so the cadence,
 * ceiling, and cancellation semantics live in a single place.
 */
export interface PollOptions {
  /** Delay between polls. Default 2000ms. */
  intervalMs?: number;
  /** Hard wall-clock ceiling before giving up. Default 120000ms. */
  ceilingMs?: number;
  /**
   * Return false to abort polling early (e.g. the run was superseded by a
   * newer one in the store). When aborted, the loop stops and reports
   * `aborted: true` with the last result seen.
   */
  shouldContinue?: () => boolean;
}

export interface PollOutcome<T> {
  /** The last fetched result (null only if aborted before the first poll). */
  result: T | null;
  /** True when the ceiling elapsed before a terminal result. */
  timedOut: boolean;
  /** True when `shouldContinue` returned false. */
  aborted: boolean;
}

const DEFAULT_INTERVAL_MS = 2000;
const DEFAULT_CEILING_MS = 120000;

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Poll `fetchOnce` every `intervalMs` until `isTerminal(result)` is true, the
 * `ceilingMs` wall-clock elapses, or `shouldContinue` returns false.
 *
 * Never throws for control flow — a thrown `fetchOnce` rejects the returned
 * promise, so callers should handle network errors around the await.
 */
export async function pollJob<T>(
  fetchOnce: () => Promise<T>,
  isTerminal: (result: T) => boolean,
  opts: PollOptions = {},
): Promise<PollOutcome<T>> {
  const interval = opts.intervalMs ?? DEFAULT_INTERVAL_MS;
  const ceiling = opts.ceilingMs ?? DEFAULT_CEILING_MS;
  const start = Date.now();
  let last: T | null = null;

  while (true) {
    if (opts.shouldContinue && !opts.shouldContinue()) {
      return { result: last, timedOut: false, aborted: true };
    }

    last = await fetchOnce();
    if (isTerminal(last)) {
      return { result: last, timedOut: false, aborted: false };
    }

    if (Date.now() - start > ceiling) {
      return { result: last, timedOut: true, aborted: false };
    }

    await sleep(interval);
  }
}
