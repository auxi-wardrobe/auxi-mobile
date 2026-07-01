import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { track } from '../../../services/analytics';
import {
  isOverrideBucket,
  repTempCFor,
  type TemperatureBucketKey,
} from '../../../config/temperature-buckets';
import {
  MOOD_BANNER_DURATION_MS,
  REFINE_TOAST_DURATION_MS,
  TEMP_TOAST_DURATION_MS,
} from '../constants';

const clearTimeoutRef = (
  timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
) => {
  if (!timeoutRef.current) {
    return;
  }

  clearTimeout(timeoutRef.current);
  timeoutRef.current = null;
};

/**
 * Owns the three mutually-exclusive Home toast/banner surfaces that share the
 * bottom slot: the mood banner, the refine-applied toast, and the temperature
 * toast. Collapses the three duplicated timer patterns and exposes the two
 * trampoline refs (`showRefineToastRef`, `showTempToastRef`) the recommendation
 * mutation reaches through — mirroring the indirection the original screen used
 * because `onSuccess` is declared before the localized shower callbacks.
 *
 * Behaviour-preserving: same durations, same mutual-exclusion (mood/refine),
 * and the same unmount cleanup (clears the mood + temp timers only — the refine
 * timer is intentionally left as in the original).
 */
export const useHomeToasts = () => {
  const { t } = useTranslation();

  const [moodBannerText, setMoodBannerText] = useState<string | null>(null);
  const [refineToastText, setRefineToastText] = useState<string | null>(null);
  const [tempToastText, setTempToastText] = useState('');
  const [tempToastVisible, setTempToastVisible] = useState(false);

  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refineToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const tempToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // onSuccess is declared before showRefineToast/showTempToast (which need `t`),
  // so the mutation reaches the showers through these refs — the same
  // indirection the buffer trampoline uses.
  const showRefineToastRef = useRef<(text: string, isChip: boolean) => void>(
    () => {},
  );
  const showTempToastRef = useRef<(key: TemperatureBucketKey) => void>(
    () => {},
  );

  // Clears the refine toast early the moment the user starts interacting with
  // the refreshed deck (swipe, like, …).
  const dismissRefineToast = useCallback(() => {
    clearTimeoutRef(refineToastTimeoutRef);
    setRefineToastText(current => (current === null ? current : null));
  }, []);

  const showMoodBanner = useCallback(
    (text: string) => {
      // The mood banner and refine toast share the bottom slot. Every path that
      // surfaces the banner already runs through an interaction handler that
      // dismisses the toast, but clear it here too so mutual exclusion is
      // structurally enforced rather than merely relied upon.
      dismissRefineToast();
      clearTimeoutRef(snackbarTimeoutRef);
      setMoodBannerText(text);
      snackbarTimeoutRef.current = setTimeout(() => {
        setMoodBannerText(null);
        snackbarTimeoutRef.current = null;
      }, MOOD_BANNER_DURATION_MS);
    },
    [dismissRefineToast],
  );

  // Refine confirmation toast ("Relaxed applied!") — builds the localized copy.
  // Fired from the mutation's onSuccess (via showRefineToastRef) once the
  // refreshed deck has loaded, then auto-dismisses after REFINE_TOAST_DURATION_MS.
  const showRefineToast = useCallback(
    (feedback: string, isChip: boolean) => {
      clearTimeoutRef(refineToastTimeoutRef);
      // Ship `mode` always; the label only for chips. Custom refine text is
      // free-form user input (PII) and must never reach analytics — same gate
      // as the sibling `refine_submitted` event.
      track('refine_confirmation_shown', {
        mode: isChip ? 'chip' : 'custom',
        ...(isChip ? { value: feedback } : {}),
      });
      // The toast itself still shows the user's own words back to them.
      setRefineToastText(t('home.refineAppliedToast', { feedback }));
      refineToastTimeoutRef.current = setTimeout(() => {
        setRefineToastText(null);
        refineToastTimeoutRef.current = null;
      }, REFINE_TOAST_DURATION_MS);
    },
    [t],
  );

  useEffect(() => {
    showRefineToastRef.current = showRefineToast;
  }, [showRefineToast]);

  const showTempToast = useCallback(
    (key: TemperatureBucketKey) => {
      clearTimeoutRef(tempToastTimeoutRef);
      setTempToastText(
        isOverrideBucket(key)
          ? t('home.temp_toast_override', { temp: repTempCFor(key) ?? 0 })
          : t('home.temp_toast_current'),
      );
      setTempToastVisible(true);
      tempToastTimeoutRef.current = setTimeout(() => {
        setTempToastVisible(false);
        tempToastTimeoutRef.current = null;
      }, TEMP_TOAST_DURATION_MS);
    },
    [t],
  );

  useEffect(() => {
    showTempToastRef.current = showTempToast;
  }, [showTempToast]);

  useEffect(() => {
    return () => {
      clearTimeoutRef(snackbarTimeoutRef);
      clearTimeoutRef(tempToastTimeoutRef);
    };
  }, []);

  return {
    moodBannerText,
    refineToastText,
    tempToastText,
    tempToastVisible,
    dismissRefineToast,
    showMoodBanner,
    showRefineToastRef,
    showTempToastRef,
  };
};
