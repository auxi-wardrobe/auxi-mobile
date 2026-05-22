/**
 * AU-242 Phase 04 Batch B — Password creation.
 *
 * Specs: plans/260521-2335-au-242-figma-spec/04-password-creation-typing.md
 *        plans/260521-2335-au-242-figma-spec/05-password-creation-valid.md
 * Figma nodes: 2849:10296 (typing) + 2849:10379 (valid)
 *
 * One screen, two states — internal `password` value drives the 3
 * criteria booleans + submit-enable. No mode prop; the diff between
 * specs 04 and 05 is purely runtime state.
 *
 * Criteria (verbatim from spec):
 *   - At least 8 characters
 *   - Contains a lowercase letter
 *   - Contains a number
 *
 * On submit (`useRegisterMutation`):
 *   - 201 → AuthContext caches `pendingVerifyEmail` (already wired in
 *           foundation; we call `setPendingVerifyEmail` here too as a
 *           belt-and-braces store before navigation in case the
 *           caller skipped the `register` action).
 *   - 409 EMAIL_ALREADY_EXISTS → navigate `SignIn` with email param.
 *   - 422 WEAK_PASSWORD → inline highlight + i18n error.
 *   - 429 RATE_LIMITED → inline copy.
 *   - NETWORK_ERROR → toast.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';

import { theme } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useRegisterMutation } from '../../hooks/auth/useAuthMutations';
import type { AuthStackParamList } from '../../types/navigation';
import { PasswordCriteriaChecklist } from '../../components/auth/PasswordCriteriaChecklist';
import { validatePassword } from '../../utils/password-rules';

type Navigation = NativeStackNavigationProp<
  AuthStackParamList,
  'PasswordCreation'
>;
type Route = RouteProp<AuthStackParamList, 'PasswordCreation'>;

const ChevronLeftGlyph = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 6 9 12l6 6"
      stroke={theme.colors.uacTextBase}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ChevronRightGlyph = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 6l6 6-6 6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const EyeOpenGlyph = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
      stroke={theme.colors.uacTextSubtle200}
      strokeWidth={1.5}
    />
    <Path
      d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
      stroke={theme.colors.uacTextSubtle200}
      strokeWidth={1.5}
    />
  </Svg>
);

const EyeClosedGlyph = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 3l18 18M10.6 6.1A11 11 0 0 1 22 12s-1 2-3 4M2 12s3.5-7 10-7c1.7 0 3.2.4 4.5 1M6 17a11 11 0 0 1-4-5"
      stroke={theme.colors.uacTextSubtle200}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </Svg>
);

export const PasswordCreationScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { t } = useTranslation();
  const { setPendingVerifyEmail } = useAuth();
  const register = useRegisterMutation();

  const email = route.params?.email ?? '';
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const criteriaLabels = useMemo(
    () => ({
      length: t('uac.password_creation.criteria_min_chars'),
      lowercase: t('uac.password_creation.criteria_lowercase'),
      digit: t('uac.password_creation.criteria_number'),
    }),
    [t],
  );
  const { isValid: allMet } = useMemo(
    () => validatePassword(password),
    [password],
  );

  const handleChange = useCallback(
    (text: string) => {
      setPassword(text);
      if (error) setError(null);
    },
    [error],
  );

  const handleSubmit = useCallback(() => {
    if (!allMet || register.isPending) return;
    register.mutate(
      { email, password },
      {
        onSuccess: () => {
          // Belt-and-braces: ensure VerifyEmail can read this even if
          // AuthContext.register() wasn't the caller (we used the raw
          // mutation here, not the context wrapper).
          setPendingVerifyEmail(email);
          navigation.navigate('VerifyEmail', { email });
        },
        onError: err => {
          switch (err.code) {
            case 'EMAIL_ALREADY_EXISTS':
              navigation.navigate('SignIn', { email });
              return;
            case 'WEAK_PASSWORD':
              setError(t('uac.password_creation.error_weak_password'));
              return;
            case 'RATE_LIMITED':
              setError(t('uac.email_input.error_rate_limited'));
              return;
            case 'NETWORK_ERROR':
              Toast.show({
                type: 'error',
                text1: t('uac.password_creation.error_generic'),
                position: 'bottom',
              });
              return;
            default:
              setError(err.message || t('uac.password_creation.error_generic'));
          }
        },
      },
    );
  }, [allMet, email, password, register, navigation, setPendingVerifyEmail, t]);

  const submitDisabled = !allMet || register.isPending;
  const submitIconColor = submitDisabled
    ? theme.colors.uacTextSubtle200
    : theme.colors.uacTextPrimaryBase;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex1}
      >
        <View style={styles.header}>
          <Pressable
            testID="password-back-button"
            accessibilityRole="button"
            accessibilityLabel={t('uac.common.back')}
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.iconHit, pressed && styles.pressed]}
            hitSlop={8}
          >
            <ChevronLeftGlyph />
          </Pressable>
          <View style={styles.headerSlot} />
        </View>

        <View style={styles.bodyContainer}>
          {/* Email label + read-only filled field (specs §1+§2) */}
          <Text style={styles.label} testID="password-email-label">
            {t('uac.password_creation.email_label')}
          </Text>
          <View style={styles.readonlyField}>
            <Text style={styles.readonlyValue} testID="password-email-value">
              {email}
            </Text>
          </View>

          {/* Password row */}
          <View style={[styles.formRow, styles.formRowSpacing]}>
            <View style={styles.fieldWrap}>
              <TextInput
                testID="password-input-field"
                value={password}
                onChangeText={handleChange}
                placeholder={t('uac.password_creation.password_label')}
                placeholderTextColor={theme.colors.uacTextSubtle200}
                secureTextEntry={!visible}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                style={styles.input}
              />
              <Pressable
                testID={
                  visible
                    ? 'password-visibility-hide'
                    : 'password-visibility-show'
                }
                accessibilityRole="button"
                accessibilityLabel={
                  visible
                    ? t('uac.password_creation.hide_password')
                    : t('uac.password_creation.show_password')
                }
                onPress={() => setVisible(v => !v)}
                style={({ pressed }) => [
                  styles.eyeBtn,
                  pressed && styles.pressed,
                ]}
                hitSlop={8}
              >
                {visible ? <EyeOpenGlyph /> : <EyeClosedGlyph />}
              </Pressable>
            </View>
            <Pressable
              testID="password-submit-button"
              accessibilityRole="button"
              accessibilityLabel={t('uac.password_creation.submit_a11y')}
              onPress={handleSubmit}
              disabled={submitDisabled}
              style={({ pressed }) => [
                styles.submitBtn,
                submitDisabled && styles.submitBtnDisabled,
                pressed && !submitDisabled && styles.pressed,
              ]}
            >
              <ChevronRightGlyph color={submitIconColor} />
            </Pressable>
          </View>

          {/* Criteria checklist (specs §4) — shared with ResetNewPassword */}
          <View style={styles.criteriaList}>
            <PasswordCriteriaChecklist
              password={password}
              labels={criteriaLabels}
              testIDPrefix="password-criteria"
            />
          </View>

          {error && (
            <Text testID="password-form-error" style={styles.errorText}>
              {error}
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.uacBackgroundNeutralSubtlest,
  },
  flex1: { flex: 1 },
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
  bodyContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.uacBodyPadding,
  },
  label: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
    paddingVertical: theme.spacing.uacDimension8 + 4,
  },
  readonlyField: {
    height: theme.spacing.uacButtonHeight,
    borderRadius: theme.borderRadius.uacTextField,
    backgroundColor: theme.colors.uacColorNeutral100,
    paddingHorizontal: theme.spacing.uacDimension16,
    justifyContent: 'center',
  },
  readonlyValue: {
    ...theme.typography.aliases.uacM3BodyLarge,
    color: theme.colors.uacTextSubtle100,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.uacDimension16,
  },
  formRowSpacing: {
    marginTop: theme.spacing.uacDimension16,
  },
  fieldWrap: {
    flex: 1,
    height: theme.spacing.uacButtonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.uacBorderBold200,
    borderRadius: theme.borderRadius.uacTextField,
    paddingLeft: theme.spacing.uacDimension16,
    paddingRight: theme.spacing.uacDimension4,
    backgroundColor: theme.colors.uacBackgroundNeutralSubtlest,
  },
  input: {
    flex: 1,
    ...theme.typography.aliases.uacM3BodyLarge,
    color: theme.colors.uacTextBase,
    padding: 0,
    margin: 0,
  },
  eyeBtn: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.uacRadioPill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.uacButtonCta,
    backgroundColor: theme.colors.uacBackgroundBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  criteriaList: {
    marginTop: theme.spacing.uacDimension16 + 4, // 20px
  },
  errorText: {
    ...theme.typography.aliases.uacM3BodySmall,
    color: theme.colors.uacTextDangerBase,
    marginTop: theme.spacing.uacDimension16,
  },
  pressed: {
    opacity: 0.7,
  },
});
