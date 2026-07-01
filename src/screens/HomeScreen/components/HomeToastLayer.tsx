import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MSnackbar } from '../../../components/design-system/lib';
import { theme } from '../../../theme/theme';
import { HOME_VIEW_TOGGLE_FOOTER_HEIGHT } from '../../../components/features/HomeViewToggleFooter';
import { styles } from '../styles';

type HomeToastLayerProps = {
  /** "Relaxed applied!" confirmation shown after a refine request resolves. */
  refineToastText: string | null;
  /** Mood-feedback banner ("Saved!", "Not loved") — shares the bottom slot. */
  moodBannerText: string | null;
  /** Temperature-override toast ("Using …°C") visibility + copy. */
  tempToastVisible: boolean;
  tempToastText: string;
};

/**
 * The floating bottom toast/banner layer for Home. The refine toast, mood
 * banner, and temperature toast are mutually exclusive and share the same
 * bottom slot; `useHomeToasts` guarantees only one is active at a time.
 */
export const HomeToastLayer = ({
  refineToastText,
  moodBannerText,
  tempToastVisible,
  tempToastText,
}: HomeToastLayerProps) => (
  <>
    {refineToastText ? (
      <View pointerEvents="none" style={toastStyles.refineToastWrap}>
        <View
          testID="home-refine-applied-toast"
          accessibilityRole="alert"
          style={toastStyles.refineToast}
        >
          <Text style={toastStyles.refineToastText} numberOfLines={1}>
            {refineToastText}
          </Text>
        </View>
      </View>
    ) : null}

    {moodBannerText ? (
      <View
        testID="mood-feedback-banner"
        accessibilityRole="alert"
        pointerEvents="none"
        style={styles.moodBanner}
      >
        <Text style={styles.moodBannerText}>{moodBannerText}</Text>
      </View>
    ) : null}

    <View
      accessibilityRole="alert"
      pointerEvents="none"
      style={styles.tempToast}
    >
      <MSnackbar
        visible={tempToastVisible}
        message={tempToastText}
        testID="home-temp-toast"
      />
    </View>
  </>
);

// Refine toast styling — mirrors the mood banner (same bottom slot, mint
// surface, caption type) since the two share the slot and never co-exist.
const toastStyles = StyleSheet.create({
  refineToastWrap: {
    position: 'absolute',
    left: theme.spacing.m,
    right: theme.spacing.m,
    bottom: HOME_VIEW_TOGGLE_FOOTER_HEIGHT + theme.spacing.l,
    zIndex: theme.zIndex.toast,
    alignItems: 'center',
  },
  refineToast: {
    maxWidth: '100%',
    paddingVertical: theme.spacing.s,
    paddingHorizontal: theme.spacing.m,
    borderRadius: 12,
    backgroundColor: theme.colors.figmaAction,
  },
  refineToastText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaSurface,
    textAlign: 'center',
  },
});
