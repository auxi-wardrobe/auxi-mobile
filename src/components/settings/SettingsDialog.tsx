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
      busy={isBusy}
      onConfirm={onPrimary}
      onCancel={onClose}
      cancelTestID={cancelTestID}
      confirmTestID={primaryTestID}
    >
      {children}
    </MDialog>
  );
};
