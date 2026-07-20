import React, { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MDialog, MRadio } from '../../../components/design-system/lib';
import { theme } from '../../../theme/theme';
import type { CapsuleChangeScope } from '../../../services/capsuleService';

interface ChangeScopeDialogProps {
  visible: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (scope: CapsuleChangeScope) => void;
}

/**
 * Change-scope modal: "This outfit only" / "All outfits using this item".
 * Renders the two options as radios inside the shared MDialog. Confirm passes
 * the chosen scope up.
 */
export const ChangeScopeDialog: React.FC<ChangeScopeDialogProps> = ({
  visible,
  busy,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [scope, setScope] = useState<CapsuleChangeScope>('outfit');

  return (
    <MDialog
      visible={visible}
      title={t('capsule.change_title')}
      message={t('capsule.change_desc')}
      confirmLabel={t('capsule.change')}
      cancelLabel={t('capsule.cancel')}
      busy={busy}
      onCancel={onCancel}
      onConfirm={() => onConfirm(scope)}
      testID="capsule-change-scope-dialog"
    >
      <View style={{ gap: theme.spacing.s, marginBottom: theme.spacing.m }}>
        <MRadio
          selected={scope === 'outfit'}
          onSelect={() => setScope('outfit')}
          label={t('capsule.change_scope_outfit')}
          testID="capsule-change-scope-outfit"
        />
        <MRadio
          selected={scope === 'all'}
          onSelect={() => setScope('all')}
          label={t('capsule.change_scope_all')}
          testID="capsule-change-scope-all"
        />
      </View>
    </MDialog>
  );
};
