/**
 * MInput — self-contained text field (label · focus ring · error · leftIcon).
 *
 *   import { MInput } from '../components/design-system/lib';
 *   <MInput value={v} onChangeText={setV} label="Email" placeholder="you@auxi.app" />
 *
 * Focus border crossfades to ink; `error` switches to danger + shows the
 * message. Tokens encapsulated INSIDE. `secureTextEntry` / `keyboardType`
 * pass through.
 */
import React, { useState } from 'react';
import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
  keyboardType?: KeyboardTypeOptions;
  editable?: boolean;
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
  keyboardType,
  editable = true,
  testID,
  accessibilityLabel,
}) => {
  const [focused, setFocused] = useState(false);
  const note = error ?? hint;
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
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          testID={testID}
          accessibilityLabel={accessibilityLabel ?? label}
        />
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
  hint: { ...type.caption, color: role.ink3 },
  hintErr: { color: color.da400 },
});
