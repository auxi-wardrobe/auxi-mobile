import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MAvatar } from '../design-system/lib';
import { getProfilePhoto } from '../../services/profilePhoto';
import { theme } from '../../theme/theme';

type SettingsProfileHeaderProps = {
  email: string | null | undefined;
  /**
   * Free users get a 2px ring around the avatar (the "you're on the free plan"
   * indicator that pairs with the Upgrade pill). Premium users show no ring.
   */
  showFreeRing?: boolean;
};

/**
 * Derive up-to-two initials from the email local part ("jane.doe@x.com" →
 * "JD", "brian@x.com" → "B") for the avatar fallback when no Google photo
 * was ever captured (email/password accounts, pre-capture sessions).
 */
const initialsFromEmail = (email: string): string => {
  const localPart = email.split('@')[0] ?? '';
  const segments = localPart.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  return segments
    .slice(0, 2)
    .map(segment => segment[0].toUpperCase())
    .join('');
};

/**
 * Profile block at the top of the main Settings screen — 88×88 avatar
 * (MAvatar `lg`) showing the cached Google profile photo, falling back to
 * email initials, with the account email underneath.
 */
export const SettingsProfileHeader: React.FC<SettingsProfileHeaderProps> = ({
  email,
  showFreeRing = false,
}) => {
  const { t } = useTranslation();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!email) {
      setPhotoUrl(null);
      return;
    }
    getProfilePhoto(email).then(url => {
      if (isMounted) {
        setPhotoUrl(url);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [email]);

  return (
    <View style={styles.container}>
      <View
        style={showFreeRing ? styles.avatarRing : undefined}
        testID="settings-profile-avatar-ring"
      >
        <MAvatar
          size="lg"
          source={photoUrl ? { uri: photoUrl } : undefined}
          initials={email ? initialsFromEmail(email) : undefined}
          testID="settings-profile-avatar"
          accessibilityLabel={t('settings.a11y_profile_photo')}
        />
      </View>
      {email ? (
        <Text style={styles.email} testID="settings-profile-email">
          {email}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
    paddingBottom: 24,
  },
  // 2px "free plan" ring — sits just outside the 88px avatar with a hairline
  // gap (padding) so the ring reads as a distinct band, not a border baked
  // onto the photo edge.
  avatarRing: {
    padding: 3,
    borderWidth: 2,
    borderColor: theme.ds.color.ink,
    borderRadius: 49, // 44 (avatar) + 3 (padding) + 2 (border)
  },
  email: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.ds.color.ink,
  },
});
