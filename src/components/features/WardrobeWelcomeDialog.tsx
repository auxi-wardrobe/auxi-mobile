/**
 * WardrobeWelcomeDialog — first-open welcome popup for the Wardrobe screen.
 *
 * Shown ONCE the first time a user opens their wardrobe, then never again
 * (AsyncStorage one-time flag, same mechanism as the home WelcomeDialog).
 * Reuses the AiConsentDialog / WelcomeDialog visual language (Modal → scrim
 * overlay → white card) so it sits on-system without a new primitive. The two
 * CTAs are design-system MButtons:
 *   • "Add My Clothes"   — secondary (outline) button → dismiss + open add flow
 *   • "Explore for Now"  — text button → dismiss only
 * Tap-outside behaves like "Explore for Now" (dismiss without adding).
 */
import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { MButton } from '../design-system/lib';

// First-open "Welcome to your wardrobe" dialog — shown once, then never again.
export const WARDROBE_WELCOME_SEEN_KEY = '@auxi/wardrobe/welcome_seen';

interface WardrobeWelcomeDialogProps {
  /** Only arm the one-time dialog once its trigger condition is met. */
  enabled: boolean;
  /** "Add My Clothes" → dismiss the dialog then open the add-item flow. */
  onAddClothes: () => void;
}

export const WardrobeWelcomeDialog: React.FC<WardrobeWelcomeDialogProps> = ({
  enabled,
  onAddClothes,
}) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(WARDROBE_WELCOME_SEEN_KEY);
        if (!cancelled && seen == null) setVisible(true);
      } catch (err) {
        // On storage error, fail closed (don't nag) rather than show twice.
        if (__DEV__) {
          console.warn('[WardrobeWelcomeDialog] AsyncStorage read failed', err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Persist the one-time flag + hide. Returns once the flag write settles so
  // callers can chain a navigation/sheet open after dismissal.
  const markSeen = async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(WARDROBE_WELCOME_SEEN_KEY, 'true');
    } catch (err) {
      if (__DEV__) {
        console.warn('[WardrobeWelcomeDialog] AsyncStorage write failed', err);
      }
    }
  };

  const handleExplore = () => {
    void markSeen();
  };

  const handleAddClothes = () => {
    void markSeen();
    onAddClothes();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={handleExplore}
      testID="wardrobe-welcome-dialog"
    >
      {/* Tap-outside = "Explore for Now" (dismiss without adding). */}
      <TouchableWithoutFeedback onPress={handleExplore}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card} testID="wardrobe-welcome-card">
              <Text style={styles.title}>{t('wardrobe.welcome.title')}</Text>
              <Text style={styles.body}>{t('wardrobe.welcome.body')}</Text>

              <View style={styles.actions}>
                <MButton
                  variant="secondary"
                  onPress={handleAddClothes}
                  testID="wardrobe-welcome-add"
                  accessibilityLabel={t('wardrobe.welcome.primary_cta')}
                >
                  {t('wardrobe.welcome.primary_cta')}
                </MButton>
                <MButton
                  variant="text"
                  onPress={handleExplore}
                  testID="wardrobe-welcome-explore"
                  accessibilityLabel={t('wardrobe.welcome.secondary_cta')}
                >
                  {t('wardrobe.welcome.secondary_cta')}
                </MButton>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.dialogScrim,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.uacBodyPadding,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.uacPanel,
    paddingTop: theme.spacing.uacDimension24,
    paddingHorizontal: theme.spacing.uacDimension24,
    paddingBottom: theme.spacing.uacDimension24,
  },
  title: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
  },
  body: {
    ...theme.typography.aliases.interBody,
    color: theme.colors.uacTextBase,
    marginTop: theme.spacing.m,
  },
  // CTAs stacked full-width: outline primary on top, text dismiss below. The
  // column stretches the MButtons to the card width; gap holds the spacing.
  actions: {
    marginTop: theme.spacing.l,
    gap: theme.spacing.s,
  },
});
