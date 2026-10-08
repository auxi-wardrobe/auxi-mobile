import React from 'react';
import { useTranslation } from 'react-i18next';
import { ContextualBottomSheet } from '../../../components/features/ContextualBottomSheet';
import {
  BUILD_AROUND_ERROR_BODY,
  BuildAroundLoadingView,
  BuildAroundMessageView,
} from '../../build-around/BuildAroundStateViews';
import type { MakeItYoursErrorCode } from '../../make-it-yours/useMakeItYoursRun';

export type BuildYourLookStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; code: MakeItYoursErrorCode | null }
  /** Search finished but nothing in Discovery can be built around the items. */
  | { kind: 'empty'; reason: 'no_match' | 'no_wardrobe' };

type Props = {
  status: BuildYourLookStatus;
  /** Scrim / swipe-down / Android back / Close / Back. Cancels a running search. */
  onDismiss: () => void;
  onCancelLoading: () => void;
  onRetry: () => void;
  /** Empty state's "Use my items" — the wardrobe-only build, as on ItemDetail. */
  onUseMyItems: () => void;
};

/**
 * Loading / error / empty states of the Home "Find the best match" search —
 * the SAME bodies, copy and buttons as the ItemDetail method sheet shows for
 * its Discovery search (`BuildAroundSheet`), so the two entries are
 * indistinguishable once the search starts. There is no method choice here:
 * the Home section IS the Discovery method, so the sheet is only up while a
 * search runs or needs a decision.
 */
export const BuildYourLookStatusSheet: React.FC<Props> = ({
  status,
  onDismiss,
  onCancelLoading,
  onRetry,
  onUseMyItems,
}) => {
  const { t } = useTranslation();
  const prefix = 'home-build-look';

  return (
    <ContextualBottomSheet
      visible={status.kind !== 'idle'}
      onDismiss={onDismiss}
      testID={`${prefix}-status-sheet`}
    >
      {status.kind === 'loading' ? (
        <BuildAroundLoadingView
          onCancel={onCancelLoading}
          busyLabel={t('buildAround.build')}
          testIDPrefix={prefix}
        />
      ) : status.kind === 'empty' ? (
        <BuildAroundMessageView
          testID={`${prefix}-${status.reason.replace('_', '-')}`}
          title={t(`buildAround.${status.reason}_title`)}
          body={t(`buildAround.${status.reason}_body`)}
          secondary={{
            label: t('buildAround.back'),
            onPress: onDismiss,
            testID: `${prefix}-empty-back`,
          }}
          primary={{
            label: t('buildAround.use_my_items'),
            onPress: onUseMyItems,
            testID: `${prefix}-empty-use-wardrobe`,
          }}
        />
      ) : status.kind === 'error' ? (
        <BuildAroundMessageView
          testID={`${prefix}-error`}
          title={t('buildAround.error_title')}
          body={t(BUILD_AROUND_ERROR_BODY[status.code ?? 'network_error'])}
          secondary={{
            label: t('buildAround.close'),
            onPress: onDismiss,
            testID: `${prefix}-error-close`,
          }}
          primary={
            status.code === 'not_found'
              ? undefined
              : {
                  label: t('buildAround.try_again'),
                  onPress: onRetry,
                  testID: `${prefix}-retry`,
                }
          }
        />
      ) : null}
    </ContextualBottomSheet>
  );
};
