import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../assets/icons';
import IconHeartFilled from '../../assets/images/icon_heart_filled.svg';
import { MButton } from '../../components/design-system/lib';
import { actionBarStyles } from '../discovery/DiscoveryDetailActionBar';
import type { MakeItYoursPanel } from './useMakeItYoursPanel';

type Props = {
  panel: MakeItYoursPanel;
  onSeeOnMe: () => void;
  canSeeOnMe: boolean;
  /** "Find another inspiration" → back to the Discovery feed. */
  onFindAnother: () => void;
};

const Grow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={actionBarStyles.grow}>{children}</View>
);

/**
 * Button row of the Discovery detail footer for every panel mode
 * (Figma button groups 5456:18703 idle · 5456:19494 loading ·
 * 5456:21357 result · 5456:19938 no match). Error / partial / no-wardrobe
 * have no frames — they reuse these buttons (user decision 2026-09-26).
 */
export const MakeItYoursActions: React.FC<Props> = ({
  panel,
  onSeeOnMe,
  canSeeOnMe,
  onFindAnother,
}) => {
  const { t } = useTranslation();
  const { mode } = panel;

  const cancelButton = (
    <Grow>
      <MButton variant="secondary" onPress={panel.cancel} testID="make-it-yours-cancel">
        {t('makeItYours.cancel')}
      </MButton>
    </Grow>
  );

  if (mode.kind === 'loading') {
    return (
      <>
        <Grow>
          <MButton loading disabled testID="make-it-yours-cta-loading">
            {t('makeItYours.cta')}
          </MButton>
        </Grow>
        {cancelButton}
      </>
    );
  }

  if (mode.kind === 'error') {
    // A look that's gone (404) can never succeed on retry — offer another one.
    const primary =
      mode.code === 'not_found' ? (
        <MButton onPress={onFindAnother} testID="make-it-yours-find-another">
          {t('makeItYours.find_another')}
        </MButton>
      ) : (
        <MButton onPress={panel.retry} testID="make-it-yours-retry">
          {t('makeItYours.try_again')}
        </MButton>
      );
    return (
      <>
        <Grow>{primary}</Grow>
        <Grow>
          <MButton variant="secondary" onPress={panel.close} testID="make-it-yours-close">
            {t('makeItYours.close')}
          </MButton>
        </Grow>
      </>
    );
  }

  if (mode.kind === 'result') {
    const { state } = mode.result;
    if (state === 'success') {
      const saved = panel.currentSaveState === 'saved' || panel.currentSaveState === 'saving';
      return (
        <>
          <MButton
            variant="text"
            rightIcon={Icons.CloseThin}
            onPress={panel.close}
            testID="make-it-yours-close"
          >
            {t('makeItYours.close')}
          </MButton>
          <Grow>
            <MButton
              rightIcon={saved ? IconHeartFilled : Icons.Heart}
              onPress={panel.toggleSave}
              disabled={panel.currentSaveState === 'removing'}
              accessibilityLabel={t(saved ? 'makeItYours.a11y_unsave' : 'makeItYours.a11y_save')}
              testID={saved ? 'make-it-yours-save-saved' : 'make-it-yours-save'}
            >
              {t(saved ? 'makeItYours.saved' : 'makeItYours.save')}
            </MButton>
          </Grow>
        </>
      );
    }
    if (state === 'no_wardrobe') {
      return (
        <>
          <MButton
            variant="text"
            onPress={() => {
              panel.trackEmptyCta('back');
              panel.close();
            }}
            testID="make-it-yours-back"
          >
            {t('makeItYours.back')}
          </MButton>
          <Grow>
            <MButton onPress={panel.addClothes} testID="make-it-yours-add-clothes">
              {t('makeItYours.add_clothes')}
            </MButton>
          </Grow>
        </>
      );
    }
    // no_match / partial (Figma 5456:19938): one full-width secondary CTA.
    return (
      <Grow>
        <MButton
          variant="secondary"
          onPress={() => {
            panel.trackEmptyCta('explore_another');
            onFindAnother();
          }}
          testID="make-it-yours-find-another"
        >
          {t('makeItYours.find_another')}
        </MButton>
      </Grow>
    );
  }

  // Idle detail (Figma 5456:18703): [Make it yours ⌕] [See on me].
  return (
    <>
      <Grow>
        <MButton
          rightIcon={Icons.SearchDatabase}
          onPress={panel.start}
          accessibilityLabel={t('makeItYours.a11y_cta')}
          testID="discovery-detail-make-it-yours"
        >
          {t('makeItYours.cta')}
        </MButton>
      </Grow>
      <Grow>
        <MButton
          variant="secondary"
          onPress={onSeeOnMe}
          disabled={!canSeeOnMe}
          testID="discovery-detail-see-on-me-cta"
        >
          {t('discovery.see_on_me_cta')}
        </MButton>
      </Grow>
    </>
  );
};
