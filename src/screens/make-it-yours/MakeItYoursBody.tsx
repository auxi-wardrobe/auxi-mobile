import React from 'react';
import { useTranslation } from 'react-i18next';
import type { MakeItYoursErrorCode } from './useMakeItYoursRun';
import type { MakeItYoursPanel } from './useMakeItYoursPanel';
import { MakeItYoursLoadingPanel, MakeItYoursMessagePanel } from './MakeItYoursPanels';
import { MakeItYoursResultPanel } from './MakeItYoursResultPanel';

const ERROR_BODY: Record<MakeItYoursErrorCode, string> = {
  network_error: 'makeItYours.error_body',
  timeout: 'makeItYours.error_body',
  server_error: 'makeItYours.error_server_body',
  not_found: 'makeItYours.error_not_found_body',
  rate_limited: 'makeItYours.error_rate_limited_body',
};

type Props = {
  panel: MakeItYoursPanel;
};

/**
 * The panel under the cover image while Make It Yours is open — replaces the
 * detail body (title / description / item strip). `null` in idle mode.
 */
export const MakeItYoursBody: React.FC<Props> = ({ panel }) => {
  const { t } = useTranslation();
  const { mode } = panel;

  switch (mode.kind) {
    case 'idle':
      return null;
    case 'loading':
      return <MakeItYoursLoadingPanel />;
    case 'error':
      return (
        <MakeItYoursMessagePanel
          testID="make-it-yours-error"
          title={t('makeItYours.error_title')}
          body={t(ERROR_BODY[mode.code ?? 'network_error'])}
        />
      );
    case 'result': {
      const { result } = mode;
      if (result.state === 'success') {
        return (
          <MakeItYoursResultPanel
            outfits={result.outfits}
            pageIndex={panel.pageIndex}
            onPageChange={panel.setPageIndex}
            currentSaved={panel.currentSaveState === 'saved'}
            onOpenFavourites={panel.openFavourites}
          />
        );
      }
      // Rule 7: no wardrobe ≠ no match — distinct copy.
      const key =
        result.state === 'no_wardrobe'
          ? 'no_wardrobe'
          : result.state === 'partial'
            ? 'partial'
            : 'no_match';
      return (
        <MakeItYoursMessagePanel
          testID={`make-it-yours-${key.replace('_', '-')}`}
          title={t(`makeItYours.${key}_title`)}
          body={t(`makeItYours.${key}_body`)}
          items={key === 'partial' ? result.relevant_items : undefined}
        />
      );
    }
  }
};
