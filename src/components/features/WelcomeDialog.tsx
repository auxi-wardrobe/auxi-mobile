/**
 * WelcomeDialog — first-launch welcome popup that replaces the old swipe coach
 * marks (AU-303). Centered modal dialog (reuses the AiConsentDialog visual
 * language: Modal → scrim overlay → white card) shown ONCE on first launch,
 * then never again (AsyncStorage one-time flag, like the retired coach marks).
 *
 * Copy: title "Welcome to Macgie" (14px semibold) + body explaining the starter
 * wardrobe (14px regular). Dismiss via the "Got it" button or tap-outside.
 */
import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { WELCOME_SEEN_KEY } from '../../screens/HomeScreen/constants';

interface WelcomeDialogProps {
  /** Only arm the one-time dialog once its trigger condition is met. */
  enabled: boolean;
}

export const WelcomeDialog: React.FC<WelcomeDialogProps> = ({ enabled }) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(WELCOME_SEEN_KEY);
        if (!cancelled && seen == null) setVisible(true);
      } catch (err) {
        // On storage error, fail closed (don't nag) rather than show twice.
        if (__DEV__) {
          console.warn('[WelcomeDialog] AsyncStorage read failed', err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const dismiss = async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(WELCOME_SEEN_KEY, 'true');
    } catch (err) {
      if (__DEV__) {
        console.warn('[WelcomeDialog] AsyncStorage write failed', err);
      }
    }
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={dismiss}
      testID="home-welcome-dialog"
    >
      <TouchableWithoutFeedback onPress={dismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card} testID="home-welcome-card">
              <Text style={styles.title}>{t('welcome.title')}</Text>
              <Text style={styles.body}>{t('welcome.body')}</Text>

              <TouchableOpacity
                testID="home-welcome-dismiss"
                accessibilityRole="button"
                accessibilityLabel={t('welcome.cta')}
                activeOpacity={0.82}
                style={styles.cta}
                onPress={dismiss}
              >
                <Text style={styles.ctaLabel}>{t('welcome.cta')}</Text>
              </TouchableOpacity>
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
  // Title — 14px semibold (Poppins-SemiBold 14/20).
  title: {
    ...theme.typography.aliases.poppinsSemiboldXsSm,
    color: theme.colors.uacTextBase,
  },
  // Body — 14px regular; bump line-height for a readable two-line paragraph.
  body: {
    ...theme.typography.aliases.poppinsBodySm,
    lineHeight: 20,
    color: theme.colors.uacTextBase,
    marginTop: theme.spacing.s,
  },
  cta: {
    height: theme.spacing.uacButtonHeight,
    borderRadius: theme.borderRadius.uacButtonCta,
    backgroundColor: theme.colors.figmaButtonDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.l,
  },
  ctaLabel: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.white,
  },
});
