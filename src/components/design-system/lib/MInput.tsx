/**
 * MInput — self-contained text field (label · focus ring · error · leftIcon).
 *
 *   import { MInput } from '../components/design-system/lib';
 *   <MInput value={v} onChangeText={setV} label="Email" placeholder="you@auxi.app" />
 *
 * Focus border crossfades to ink; `error` switches to danger + shows the
 * message. Tokens encapsulated INSIDE. `secureTextEntry` / `keyboardType`
 * pass through.
 *
 * Password fields: pass `secureTextEntry` and a trailing eye toggle renders on
 * the RIGHT (mirror of `leftIcon`) — tapping it reveals/hides the value via an
 * internal `revealed` flag. Opt out with `hidePasswordToggle`. Toggle a11y copy
 * is i18n-agnostic (DS primitive) — feed localized strings via
 * `showPasswordLabel` / `hidePasswordLabel`.
 */
import React, { useState } from 'react';
import {
  KeyboardTypeOptions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { IconEye, IconEyeOff } from '../../../assets/icons';
import { color, radius, role, type } from '../m-tokens';

export interface MInputProps {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.FC<{ width?: number; height?: number; color?: string }>;
  secureTextEntry?: boolean;
  /** Suppress the trailing eye toggle even when `secureTextEntry` is set. */
  hidePasswordToggle?: boolean;
  /** a11y label for the toggle when the password is hidden (tapping reveals). */
  showPasswordLabel?: string;
  /** a11y label for the toggle when the password is revealed (tapping hides). */
  hidePasswordLabel?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  editable?: boolean;
  /** Submit key behaviour (e.g. "go") passed to the inner TextInput. */
  returnKeyType?: TextInputProps['returnKeyType'];
  /** Fired on the keyboard submit/return key. */
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  /** Autofill hint (e.g. "emailAddress", "newPassword") for the inner field. */
  textContentType?: TextInputProps['textContentType'];
  testID?: string;
  accessibilityLabel?: string;
}

export const MInput: React.FC<MInputProps> = ({
  value,
  onChangeText,
  label,
  placeholder,
  error,
  hint,
  leftIcon: LeftIcon,
  secureTextEntry,
  hidePasswordToggle = false,
  showPasswordLabel = 'Show password',
  hidePasswordLabel = 'Hide password',
  keyboardType,
  autoCapitalize,
  autoCorrect,
  editable = true,
  returnKeyType,
  onSubmitEditing,
  textContentType,
  testID,
  accessibilityLabel,
}) => {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const note = error ?? hint;
  const showToggle = !!secureTextEntry && !hidePasswordToggle;
  return (
    <View style={styles.field}>
      {!!label && <Text style={styles.fieldLabel}>{label}</Text>}
      <View
        style={[
          styles.input,
          focused && styles.inputFocus,
          !!error && styles.inputErr,
        ]}
      >
        {LeftIcon && <LeftIcon width={18} height={18} color={role.ink3} />}
        <TextInput
          style={styles.inputText}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={role.ink3}
          secureTextEntry={secureTextEntry && !revealed}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          textContentType={textContentType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          testID={testID}
          accessibilityLabel={accessibilityLabel ?? label}
        />
        {showToggle && (
          <Pressable
            onPress={() => setRevealed(prev => !prev)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={revealed ? hidePasswordLabel : showPasswordLabel}
            testID={testID ? `${testID}-visibility` : undefined}
            style={styles.toggle}
          >
            {revealed ? (
              <IconEyeOff width={18} height={18} color={role.ink3} />
            ) : (
              <IconEye width={18} height={18} color={role.ink3} />
            )}
          </Pressable>
        )}
      </View>
      {!!note && (
        <Text style={[styles.hint, !!error && styles.hintErr]}>{note}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  field: { width: '100%', gap: 6 },
  fieldLabel: { ...type.caption, color: role.ink2 },
  input: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: color.n300,
    paddingHorizontal: 16,
    backgroundColor: color.white,
  },
  inputFocus: { borderColor: role.ink },
  inputErr: { borderColor: color.da400 },
  inputText: {
    flex: 1,
    ...type.bodySm,
    color: role.ink,
    paddingVertical: 0,
  },
  toggle: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { ...type.caption, color: role.ink3 },
  hintErr: { color: color.da400 },
});
