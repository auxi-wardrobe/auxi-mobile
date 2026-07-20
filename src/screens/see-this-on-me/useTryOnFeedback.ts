/**
 * See-on-me redesign (B3) — thumbs up/down vote on the result screen (Figma
 * 4814:11877). Single-choice (up XOR down), optimistic: the UI flips
 * immediately and the vote is posted fire-and-forget via
 * `tryOnFeedbackService` (errors are swallowed there — this hook never
 * blocks or reverts the UI on a failed POST). Re-tapping the already-selected
 * thumb is a no-op; tapping the other thumb changes the vote.
 */
import { useCallback, useState } from 'react';
import { track } from '../../services/analytics';
import {
  tryOnFeedbackService,
  type TryOnFeedbackVote,
} from '../../services/tryOnFeedbackService';

export interface UseTryOnFeedbackOptions {
  /** The active render job id (null on a cached/rehydrated result with no
   *  live job — the vote still updates the UI + analytics, just skips the
   *  network call since there's nothing to key it to). */
  jobId: string | null;
  resultUrl: string | null;
  outfitHash: string;
}

export interface UseTryOnFeedbackResult {
  vote: TryOnFeedbackVote | null;
  onLike: () => void;
  onDislike: () => void;
}

export const useTryOnFeedback = ({
  jobId,
  resultUrl,
  outfitHash,
}: UseTryOnFeedbackOptions): UseTryOnFeedbackResult => {
  const [vote, setVote] = useState<TryOnFeedbackVote | null>(null);

  const castVote = useCallback(
    (next: TryOnFeedbackVote) => {
      setVote(current => {
        if (current === next) {
          // Re-tapping the selected thumb — no-op (single-choice, no "undo").
          return current;
        }
        track(
          next === 'up' ? 'try_on_result_liked' : 'try_on_result_disliked',
          { outfit_hash: outfitHash },
        );
        if (jobId && resultUrl) {
          // Fire-and-forget — tryOnFeedbackService never rejects.
          tryOnFeedbackService.submitVote({
            job_id: jobId,
            result_url: resultUrl,
            vote: next,
          });
        }
        return next;
      });
    },
    [jobId, resultUrl, outfitHash],
  );

  return {
    vote,
    onLike: useCallback(() => castVote('up'), [castVote]),
    onDislike: useCallback(() => castVote('down'), [castVote]),
  };
};
