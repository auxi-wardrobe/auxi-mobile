/**
 * AuthHeader — the single canonical top chrome for the 5 auth FORM screens
 * (EmailInput, SignIn, PasswordCreation, ForgotPasswordRequest,
 * ResetNewPassword).
 *
 * Why this exists: the back affordance + header/safe-area used to be built
 * three different ways across these sibling screens (inline <Svg>, imported
 * asset, and a `‹` text glyph; SafeAreaView vs an absolute header with a
 * hardcoded `paddingTop:45`). That drift was a MAJOR cross-screen finding in
 * the 2026-06-25 designer review. This component is the one back glyph
 * (`icon_chevron_left.svg`) at one weight/size, in one normal-flow header row.
 *
 * The screen owns the SafeAreaView (so it can pick its own `edges`); this
 * component is the header ROW that sits at the top of that safe area — no
 * hardcoded top inset.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import IconChevronLeft from '../../assets/images/icon_chevron_left.svg';
import { theme } from '../../theme/theme';

export interface AuthHeaderProps {
  onBack: () => void;
  /** testID for the back Pressable (Maestro selector). */
  backTestID: string;
  /** a11y label for the back button; defaults to the localized "Back". */
  backLabel?: string;
  /** Optional testID for the header container itself. */
  testID?: string;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({
  onBack,
  backTestID,
  backLabel,
  testID,
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.header} testID={testID}>
      <Pressable
        testID={backTestID}
        accessibilityRole="button"
        accessibilityLabel={backLabel ?? (t('uac.common.back') as string)}
        onPress={onBack}
        style={({ pressed }) => [styles.iconHit, pressed && styles.pressed]}
        hitSlop={8}
      >
        <IconChevronLeft width={24} height={24} />
      </Pressable>
      <View style={styles.headerSlot} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: theme.spacing.uacHeaderHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.uacBodyPadding,
  },
  iconHit: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSlot: { width: 47, height: 47 },
  pressed: { opacity: 0.7 },
});
