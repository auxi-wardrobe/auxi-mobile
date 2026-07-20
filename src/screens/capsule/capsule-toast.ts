import type { TFunction } from 'i18next';
import { toast } from '../../components/design-system/lib';

/**
 * Shared "couldn't update your capsule" network-error toast. Was inlined at 5+
 * call sites across the capsule screens (detail / item-detail / edit / add
 * flow) — centralised here so the toast type + copy key stay in sync.
 */
export const toastCapsuleNetworkError = (t: TFunction): void => {
  toast.show({ type: 'error', text1: t('capsule.network_error') });
};
