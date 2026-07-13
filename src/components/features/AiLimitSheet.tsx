/**
 * AiLimitSheet — the "you're out of AI generations for today" notification.
 *
 * Presentational bottom-sheet built on the design-system `MBottomSheet`
 * primitive so motion + scrim + swipe-to-dismiss + tokens are on-system. It
 * renders an icon, a title, a body, and ONE primary "Got it" button — there is
 * deliberately NO retry affordance (the whole point of the gate is to stop the
 * retry-storm that inflates the daily counter, prod 2026-07-13).
 *
 * Feature-agnostic: no try-on imports. Copy comes from the shared `aiLimit.*`
 * i18n keys (defaultable via props) so any AI surface can reuse the sheet.
 *
 *   const gate = useAiLimitGate();
 *   ...
 *   <AiLimitSheet {...gate.sheetProps} />
 *
 * Icon note: uses the AI `Sparkle` motif (the app-wide AI marker). Final icon is
 * the designer's call at the step-6.5 gate.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MBottomSheet, MButton } from '../design-system/lib';
import { role, space, type } from '../design-system/m-tokens';
import { Icons } from '../../assets/icons';

export interface AiLimitSheetProps {
  visible: boolean;
  onDismiss: () => void;
  /** i18n key for the sheet title (default `aiLimit.title`). */
  titleKey?: string;
  /** i18n key for the sheet body (default `aiLimit.body`). */
  bodyKey?: string;
  /** Root testID (default `ai-limit-sheet`); dismiss button gets `-dismiss`. */
  testID?: string;
}

export const AiLimitSheet: React.FC<AiLimitSheetProps> = ({
  visible,
  onDismiss,
  titleKey = 'aiLimit.title',
  bodyKey = 'aiLimit.body',
  testID = 'ai-limit-sheet',
}) => {
  const { t } = useTranslation();
  const Sparkle = Icons.Sparkle;

  return (
    <MBottomSheet visible={visible} onDismiss={onDismiss} testID={testID}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Sparkle width={28} height={28} color={role.ink} />
        </View>
        <Text style={styles.title}>{t(titleKey)}</Text>
        <Text style={styles.body}>{t(bodyKey)}</Text>
        <View style={styles.actions}>
          <MButton
            variant="primary"
            onPress={onDismiss}
            testID={`${testID}-dismiss`}
            accessibilityLabel={t('aiLimit.dismiss')}
          >
            {t('aiLimit.dismiss')}
          </MButton>
        </View>
      </View>
    </MBottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingHorizontal: space.s2,
    paddingTop: space.s2,
    paddingBottom: space.s3,
    gap: space.s3,
  },
  iconWrap: {
    width: space.s12,
    height: space.s12,
    borderRadius: space.s6,
    backgroundColor: role.surfaceCream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...type.h3,
    color: role.ink,
    textAlign: 'center',
  },
  body: {
    ...type.body,
    color: role.ink2,
    textAlign: 'center',
  },
  actions: {
    marginTop: space.s2,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
});
