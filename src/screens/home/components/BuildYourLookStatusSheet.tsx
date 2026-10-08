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
  /** Search finished but no Discovery look contains the chosen items. */
  | { kind: 'empty' };

type Props = {
  status: BuildYourLookStatus;
  /** Scrim / swipe-down / Android back / Close. Cancels a running search. */
  onDismiss: () => void;
  onCancelLoading: () => void;
  onRetry: () => void;
};

/**
 * Loading / error / no-match states of the Home "Find the best match" search,
 * in the same sheet bodies ItemDetail's method sheet shows for its Discovery
 * search. There is no method choice here — the Home section IS the Discovery
 * method — so the sheet is only up while a search runs or needs a decision.
 */
export const BuildYourLookStatusSheet: React.FC<Props> = ({
  status,
  onDismiss,
  onCancelLoading,
  onRetry,
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
          busyLabel={t('homeLanding.build_look_find')}
          testIDPrefix={prefix}
        />
      ) : status.kind === 'empty' ? (
        <BuildAroundMessageView
          testID={`${prefix}-no-match`}
          title={t('homeLanding.build_look_no_match_title')}
          body={t('homeLanding.build_look_no_match_body')}
          primary={{
            label: t('buildAround.back'),
            onPress: onDismiss,
            testID: `${prefix}-empty-back`,
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
