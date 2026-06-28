import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '../../components/design-system/lib';

// The app's root <Toast/> host renders BELOW native modals, so a toast fired
// while the date-picker sheet is still up renders behind it. We defer the toast
// past the sheet's dismissal animation. Shared by Favourite + My Creations so
// the delay isn't a magic constant duplicated per screen, and the timer is
// cleared on unmount so navigating away within the window doesn't fire a
// dangling Toast.show.
const SHEET_DISMISS_TOAST_DELAY_MS = 350;

/** Returns a stable callback that shows the "Added to your schedule" toast once
 *  the sheet has animated out. */
export const useScheduleAddedToast = (): (() => void) => {
  const { t } = useTranslation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  return useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      toast.show({
        type: 'success',
        text1: t('schedule.added_toast'),
        position: 'bottom',
      });
      timerRef.current = null;
    }, SHEET_DISMISS_TOAST_DELAY_MS);
  }, [t]);
};
