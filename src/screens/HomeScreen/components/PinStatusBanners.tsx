import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PinOutfitStatus } from '../../../hooks/usePinReducer';
import {
  PinGenerationError,
  type PinErrorKind,
} from '../../../components/features/PinGenerationError';
import { PinFallbackNotice } from '../../../components/features/PinFallbackNotice';
import { PinnedItemUnavailableNotice } from '../../../components/features/PinnedItemUnavailableNotice';
import { styles } from '../styles';

type PinStatusBannersProps = {
  pinOutfit: PinOutfitStatus;
  pinErrorKind: PinErrorKind;
  onRetry: () => void;
  onSignIn: () => void;
  /** Non-null while the "pinned item is no longer available" notice is shown. */
  pinnedItemGoneAt: number | null;
};

/**
 * Floating pin-status banners (z-index sticky): generation error, low-confidence
 * fallback, guest sign-in blocker, and the transient "pinned item unavailable"
 * notice. All are mutually exclusive except the unavailable notice, which is a
 * separate transient overlay.
 */
export const PinStatusBanners = ({
  pinOutfit,
  pinErrorKind,
  onRetry,
  onSignIn,
  pinnedItemGoneAt,
}: PinStatusBannersProps) => {
  const { t } = useTranslation();

  return (
    <>
      {pinOutfit === 'error' ? (
        <View pointerEvents="box-none" style={styles.pinBannerFloat}>
          <PinGenerationError kind={pinErrorKind} onRetry={onRetry} />
        </View>
      ) : pinOutfit === 'fallback' ? (
        <View pointerEvents="box-none" style={styles.pinBannerFloat}>
          <PinFallbackNotice />
        </View>
      ) : pinOutfit === 'auth_required' ? (
        <View
          testID="pin-guest-banner"
          pointerEvents="box-none"
          style={styles.pinBannerFloat}
        >
          <View style={styles.pinGuestBox} accessibilityRole="alert">
            <Text style={styles.pinGuestText} numberOfLines={3}>
              {t('pin.guest_blocker')}
            </Text>
            <TouchableOpacity
              testID="pin-guest-signin-cta"
              accessibilityRole="button"
              accessibilityLabel={t('pin.guest_blocker')}
              activeOpacity={0.7}
              onPress={onSignIn}
              style={styles.pinGuestCta}
            >
              <Text style={styles.pinGuestCtaText}>
                {t('pin.guest_signin_cta')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {pinnedItemGoneAt !== null ? (
        <View pointerEvents="box-none" style={styles.pinBannerFloat}>
          <PinnedItemUnavailableNotice />
        </View>
      ) : null}
    </>
  );
};
