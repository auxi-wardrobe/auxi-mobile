import React from 'react';
import { useTranslation } from 'react-i18next';
import { MDialog } from '../design-system/lib';

type PrimaryVariant = 'default' | 'danger';

type SettingsDialogProps = {
  visible: boolean;
  onClose: () => void;
  isBusy: boolean;
  title: string;
  body?: string;
  primaryLabel: string;
  primaryVariant: PrimaryVariant;
  onPrimary: () => void;
  cancelTestID: string;
  primaryTestID: string;
  children?: React.ReactNode;
};

// Shared confirm dialog for all three Settings dialogs (style-direction,
// change-time, delete-data). GH-364 Wave 1.5: migrated onto the design-system
// MDialog primitive — it owns the scrim, card, enter/close motion, the
// title/body, the action row, and tap-outside dismiss. Consumers pass radio
// lists / a time picker via `children` (rendered between body and actions).
// `isBusy` disables both actions and spins the primary; `primaryVariant`
// 'danger' drives MDialog's destructive (red) primary button. Per-button
// testIDs are threaded through verbatim so Maestro selectors are preserved.
export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  visible,
  onClose,
  isBusy,
  title,
  body,
  primaryLabel,
  primaryVariant,
  onPrimary,
  cancelTestID,
  primaryTestID,
  children,
}) => {
  const { t } = useTranslation();

  return (
    <MDialog
      visible={visible}
      title={title}
      message={body}
      confirmLabel={primaryLabel}
      cancelLabel={t('common.cancel')}
      destructive={primaryVariant === 'danger'}
      isBusy={isBusy}
      onConfirm={onPrimary}
      onCancel={onClose}
      cancelTestID={cancelTestID}
      confirmTestID={primaryTestID}
    >
      {children}
    </MDialog>
  );
};
