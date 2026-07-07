/**
 * useSaveImage (web) — trigger a browser download of the image URL.
 *
 * The native camera-roll module has no web build, so this parallel file keeps
 * it out of the web bundle (vite resolves `.web.ts` before `.ts`). Same
 * signature as the native hook so callers stay platform-agnostic.
 */
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '../components/design-system/lib';
import { trackTryOnImageSaved } from '../services/analytics';

export interface UseSaveImage {
  saving: boolean;
  saveImage: (uri: string) => Promise<void>;
}

export const useSaveImage = (): UseSaveImage => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  const saveImage = useCallback(
    async (uri: string): Promise<void> => {
      if (saving || !uri) return;
      setSaving(true);
      try {
        const a = document.createElement('a');
        a.href = uri;
        a.download = 'auxi-try-on.jpg';
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success(t('seeThisOnMe.download.success'));
        trackTryOnImageSaved('success');
      } catch {
        toast.error(t('seeThisOnMe.download.error'));
        trackTryOnImageSaved('error');
      } finally {
        setSaving(false);
      }
    },
    [saving, t],
  );

  return { saving, saveImage };
};
