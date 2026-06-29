import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../theme/theme';

export type RadioOption<K extends string> = {
  key: K;
  label: string;
  description?: string;
  // Surfaced but inert — e.g. the "Custom" repeat-schedule option, kept visible
  // for IA completeness until the data model supports it.
  disabled?: boolean;
};

type RadioOptionListProps<K extends string> = {
  options: Array<RadioOption<K>>;
  selected: K;
  onSelect: (key: K) => void;
  testIDPrefix: string;
};

// Green M3-style radio (View-based, no SVG). Selected = green ring + green dot.
// Exported so the change-time period (AM/PM) stack reuses the exact styling.
export const Radio = ({ selected }: { selected: boolean }) => (
  <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
    {selected ? <View style={styles.radioInner} /> : null}
  </View>
);

// Repeated option-row list shared by the style-direction dialog and the
// change-time frequency picker. Renders copy (title + optional description),
// the green radio, and a hairline divider between rows.
export function RadioOptionList<K extends string>({
  options,
  selected,
  onSelect,
  testIDPrefix,
}: RadioOptionListProps<K>) {
  return (
    <View style={styles.optionList}>
      {options.map((option, index) => (
        <TouchableOpacity
          key={option.key}
          testID={`${testIDPrefix}-${option.key}`}
          activeOpacity={0.82}
          disabled={option.disabled}
          style={[styles.optionRow, option.disabled && styles.optionRowDisabled]}
          onPress={() => onSelect(option.key)}
        >
          <View style={styles.optionCopy}>
            <Text style={styles.optionTitle}>{option.label}</Text>
            {option.description ? (
              <Text style={styles.optionDescription}>{option.description}</Text>
            ) : null}
          </View>

          <Radio selected={selected === option.key} />

          {index < options.length - 1 ? <View style={styles.optionDivider} /> : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  optionList: {
    marginTop: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    position: 'relative',
    paddingVertical: 8,
  },
  optionRowDisabled: {
    opacity: 0.45,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
  },
  optionDescription: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
  },
  optionDivider: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: theme.colors.figmaListDivider,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.uacTextBase,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  radioOuterActive: {
    borderColor: theme.colors.figmaToggleOn,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.figmaToggleOn,
  },
});
