import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { favouriteService } from '../services/favouriteService';
import {
  DEFAULT_MOOD_PROMPT_POLICY,
  MoodPromptPolicy,
  moodPolicyService,
} from '../services/moodPolicyService';
import { track } from '../services/analytics';

/**
 * AU-318 "Wear this" mood feedback flow (Phase 4).
 *
 * Owns everything the ticket's state machine describes so HomeScreen stays
 * wiring-only:
 *   - policy cache (fetched once per session, refetched after each
 *     successful submit; ANY error silently falls back to prompt-always),
 *   - the modal lock against rapid "Wear this" taps,
 *   - the pending outfit ref (save happens on Done, never on tap),
 *   - mood_feedback_state: closed → selecting → submitting → success|error,
 *   - all 9 analytics events.
 *
 * Ticket scenarios covered: dismiss = no save + fresh sheet on re-tap;
 * submit error/timeout keeps the sheet open with selections intact and Done
 * re-enabled; in-flight guard prevents duplicate POSTs (retry is safe — the
 * Phase 1 backend upsert is idempotent); an already-saved outfit still opens
 * the sheet (dedup/mood-update case, response `updated: true`).
 */

/** Soft-negative chip id — additionally fires `negative_mood_selected`. */
const NEGATIVE_MOOD_ID = 'not_quite_me';

/**
 * HomeScreen builds `outfit-<index>` when the backend omits outfit_hash.
 * That fallback is session-scoped and collides across sessions, so the
 * backend upsert could silently attach moods to a DIFFERENT outfit (and skip
 * creating the favorite). Outfits carrying it bypass the mood flow entirely.
 */
const FALLBACK_HASH_PREFIX = 'outfit-';

/**
 * Axios raises ECONNABORTED for a request-level timeout (ETIMEDOUT for a
 * socket-level one). Checked structurally so the hook doesn't import axios —
 * HTTP stays behind `src/services/` per house convention.
 */
const isTimeoutError = (error: unknown): boolean => {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return code === 'ECONNABORTED' || code === 'ETIMEDOUT';
};

/** Minimal outfit shape the flow needs; callers may pass a richer object. */
export interface MoodFeedbackOutfitRef {
  outfitHash: string;
  itemIds: string[];
  /** Threaded into the sheet to pick the contextual chip set. */
  occasion?: string;
  /**
   * The per-outfit message (V05 `reasoning_human`) shown on Home. Threaded
   * into the favourite save so it persists as the card's title hero. Omitted
   * when the outfit has no message.
   */
  title?: string;
}

/** Ticket `mood_feedback_state` machine. `visible` derives from kind. */
type MoodFeedbackState =
  | { kind: 'closed' }
  | { kind: 'selecting' }
  | { kind: 'submitting' }
  | { kind: 'error'; message: string };

/** Props bag spread onto `<MoodFeedbackSheet/>`. */
export interface MoodFeedbackSheetBindings {
  visible: boolean;
  occasion?: string;
  isSubmitting: boolean;
  errorMessage?: string;
  onSubmit: (moodIds: string[]) => void;
  onDismiss: () => void;
  onChipToggle: (id: string, selected: boolean) => void;
}

export interface UseMoodFeedbackOptions<T extends MoodFeedbackOutfitRef> {
  /**
   * Legacy immediate-save path — invoked when the policy says don't prompt
   * (`should_prompt: false`). Keeps the existing outcome events unchanged.
   */
  saveDirectly: (outfit: T) => void;
  /** Fired after a successful mood-tagged save (create OR mood-update). */
  onSaveSuccess: (outfitHash: string, updated: boolean) => void;
  /**
   * Fired when the user submits a soft-negative ("not quite me"). The outfit is
   * intentionally NOT saved to favourites — keeping the saved list to genuinely
   * loved looks — so callers should surface a feedback-only acknowledgement here
   * rather than a "saved" confirmation.
   */
  onRejected?: (outfitHash: string) => void;
}

export interface UseMoodFeedbackResult<T extends MoodFeedbackOutfitRef> {
  /** Replaces the CTA's direct call to the save handler. */
  onWearThisPress: (outfit: T) => void;
  sheetProps: MoodFeedbackSheetBindings;
}

export const useMoodFeedback = <T extends MoodFeedbackOutfitRef>({
  saveDirectly,
  onSaveSuccess,
  onRejected,
}: UseMoodFeedbackOptions<T>): UseMoodFeedbackResult<T> => {
  const { t } = useTranslation();

  const [moodState, setMoodState] = useState<MoodFeedbackState>({
    kind: 'closed',
  });
  // Pending outfit is STATE (it drives the sheet's `occasion` prop) with a
  // ref mirror for async handlers. Intentionally NOT nulled on dismiss: the
  // sheet animates closed over ~220ms and clearing the occasion mid-animation
  // would flash the chip grid back to the default set. The next open
  // overwrites it and nothing reads it while closed — "pending" semantics
  // (no save will happen) are owned by the state machine, not this object.
  const [pendingOutfit, setPendingOutfit] = useState<T | null>(null);
  const pendingRef = useRef<T | null>(null);

  // Keep the latest state readable inside stable callbacks (house pattern —
  // same as MoodFeedbackSheet's isSubmittingRef).
  const moodStateRef = useRef<MoodFeedbackState>(moodState);
  moodStateRef.current = moodState;

  // Ticket `recommendation_state` (idle → awaiting_mood_feedback → accepted).
  // Never rendered — bookkeeping so transitions stay auditable against the
  // ticket's state machine.
  const recommendationStateRef = useRef<
    'idle' | 'awaiting_mood_feedback' | 'accepted'
  >('idle');

  // Modal lock (ticket `modal_state: locked_until_rendered`): held from the
  // tap that decides to open until the sheet is dismissed or the submit
  // succeeds. Rapid "Wear this" taps while held are no-ops — exactly one
  // sheet instance and one pending save.
  const lockRef = useRef(false);
  // In-flight POST guard — a Done tap can't race a still-running submit.
  const inFlightRef = useRef(false);

  // Latest-callback mirrors so the stable handlers never go stale.
  const saveDirectlyRef = useRef(saveDirectly);
  saveDirectlyRef.current = saveDirectly;
  const onSaveSuccessRef = useRef(onSaveSuccess);
  onSaveSuccessRef.current = onSaveSuccess;
  const onRejectedRef = useRef(onRejected);
  onRejectedRef.current = onRejected;

  // ── Policy cache ──────────────────────────────────────────────────────
  // Fetched once per session (single-flight), refetched after each
  // successful submit (the tier may advance). ANY failure resolves to
  // DEFAULT_MOOD_PROMPT_POLICY silently — no UI error, save path unaffected.
  const policyRef = useRef<MoodPromptPolicy | null>(null);
  const policyPromiseRef = useRef<Promise<MoodPromptPolicy> | null>(null);

  const resolvePolicy = useCallback((): Promise<MoodPromptPolicy> => {
    if (policyRef.current) {
      return Promise.resolve(policyRef.current);
    }
    if (!policyPromiseRef.current) {
      policyPromiseRef.current = moodPolicyService
        .getMoodPromptPolicy()
        .then(policy =>
          // Defensive: a 2xx with a malformed body is still a fallback case.
          typeof policy?.should_prompt === 'boolean'
            ? policy
            : DEFAULT_MOOD_PROMPT_POLICY,
        )
        .catch(() => DEFAULT_MOOD_PROMPT_POLICY)
        .then(policy => {
          policyRef.current = policy;
          policyPromiseRef.current = null;
          return policy;
        });
    }
    return policyPromiseRef.current;
  }, []);

  // Prime the cache on mount so the first "Wear this" tap resolves instantly.
  useEffect(() => {
    resolvePolicy();
  }, [resolvePolicy]);

  const refetchPolicy = useCallback(() => {
    policyRef.current = null;
    policyPromiseRef.current = null;
    resolvePolicy();
  }, [resolvePolicy]);

  // ── Flow handlers ─────────────────────────────────────────────────────

  const onWearThisPress = useCallback(
    (outfit: T) => {
      track('wear_this_clicked', {
        outfit_hash: outfit.outfitHash,
        source: 'home',
      });
      if (lockRef.current) {
        // Sheet already opening/open (rapid tap) — single modal instance,
        // no duplicate pending save.
        return;
      }
      if (outfit.outfitHash.startsWith(FALLBACK_HASH_PREFIX)) {
        // Unstable session-scoped hash — mood linkage would be unsafe.
        // Legacy direct save instead (its own guards handle dedup).
        saveDirectlyRef.current(outfit);
        return;
      }
      lockRef.current = true;
      resolvePolicy().then(policy => {
        if (!policy.should_prompt) {
          // Policy says don't prompt — legacy direct save with its existing
          // outcome events. Release the lock; that path has its own guards.
          lockRef.current = false;
          saveDirectlyRef.current(outfit);
          return;
        }
        // NOTE: an already-saved outfit still opens the sheet — the
        // dedup/mood-update case (backend upserts; response `updated: true`).
        pendingRef.current = outfit;
        setPendingOutfit(outfit);
        recommendationStateRef.current = 'awaiting_mood_feedback';
        setMoodState({ kind: 'selecting' });
        track('mood_feedback_opened', {
          outfit_hash: outfit.outfitHash,
          occasion: outfit.occasion ?? null,
          tier: policy.tier,
        });
      });
    },
    [resolvePolicy],
  );

  const onDismiss = useCallback(() => {
    const state = moodStateRef.current;
    if (state.kind === 'closed' || state.kind === 'submitting') {
      // Submitting: the sheet already blocks backdrop/swipe — belt & braces.
      return;
    }
    // No save, no mood stored. Selections live in the sheet and reset on the
    // next open (fresh modal per ticket).
    setMoodState({ kind: 'closed' });
    recommendationStateRef.current = 'idle';
    lockRef.current = false;
    track('mood_feedback_skipped', {
      outfit_hash: pendingRef.current?.outfitHash ?? null,
    });
  }, []);

  const onSubmit = useCallback(
    (moodIds: string[]) => {
      const pending = pendingRef.current;
      if (!pending || moodIds.length === 0) {
        return;
      }
      if (inFlightRef.current) {
        // Duplicate-POST guard — Done taps during an in-flight submit no-op.
        return;
      }

      // Soft-negative ("not quite me") → do NOT add the outfit to favourites,
      // so the saved list stays to genuinely loved looks. We record the
      // feedback in analytics and close the sheet without a save (no
      // outfit_mood_linked — nothing is persisted server-side). A mixed
      // selection that includes the negative still counts as a rejection.
      if (moodIds.includes(NEGATIVE_MOOD_ID)) {
        setMoodState({ kind: 'closed' });
        recommendationStateRef.current = 'idle';
        lockRef.current = false;
        track('mood_feedback_submitted', {
          outfit_hash: pending.outfitHash,
          mood_ids: moodIds,
          mood_count: moodIds.length,
          saved: false,
        });
        track('negative_mood_selected', {
          outfit_hash: pending.outfitHash,
          mood_ids: moodIds,
        });
        onRejectedRef.current?.(pending.outfitHash);
        return;
      }

      inFlightRef.current = true;
      setMoodState({ kind: 'submitting' });

      favouriteService
        .saveFavourite({
          outfit_hash: pending.outfitHash,
          item_ids: pending.itemIds,
          source: 'home',
          mood_tags: moodIds,
          // Persist the message shown on Home so the favourite card renders
          // it as its centred title hero. Backward-safe (backend ignores
          // `title` until its column ships).
          ...(pending.title ? { title: pending.title } : {}),
        })
        .then(response => {
          const updated = response.updated === true;
          setMoodState({ kind: 'closed' });
          recommendationStateRef.current = 'accepted';
          lockRef.current = false;
          track('mood_feedback_submitted', {
            outfit_hash: pending.outfitHash,
            mood_ids: moodIds,
            mood_count: moodIds.length,
            saved: true,
            updated,
          });
          track('outfit_mood_linked', {
            outfit_hash: pending.outfitHash,
            mood_ids: moodIds,
            updated,
          });
          onSaveSuccessRef.current(pending.outfitHash, updated);
          // Tier thresholds may have advanced (e.g. every_save → occasional).
          refetchPolicy();
        })
        .catch(error => {
          // Keep the sheet open with selections intact; Done re-enables.
          // Retry is safe — the backend upsert is idempotent (Phase 1).
          const timedOut = isTimeoutError(error);
          setMoodState({
            kind: 'error',
            message: t(timedOut ? 'mood.errorTimeout' : 'mood.errorGeneric'),
          });
          track('mood_feedback_submission_failed', {
            outfit_hash: pending.outfitHash,
            error_kind: timedOut ? 'timeout' : 'generic',
          });
        })
        .finally(() => {
          inFlightRef.current = false;
        });
    },
    [refetchPolicy, t],
  );

  // Chip analytics live here (the sheet stays dumb — it only reports toggles).
  const onChipToggle = useCallback((id: string, selected: boolean) => {
    track(selected ? 'mood_chip_selected' : 'mood_chip_deselected', {
      chip_id: id,
      outfit_hash: pendingRef.current?.outfitHash ?? null,
    });
  }, []);

  return {
    onWearThisPress,
    sheetProps: {
      visible: moodState.kind !== 'closed',
      occasion: pendingOutfit?.occasion,
      isSubmitting: moodState.kind === 'submitting',
      errorMessage: moodState.kind === 'error' ? moodState.message : undefined,
      onSubmit,
      onDismiss,
      onChipToggle,
    },
  };
};
