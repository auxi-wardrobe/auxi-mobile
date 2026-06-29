import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme/theme';
import { Icons } from '../../assets/icons';

/**
 * iOS-HIG settings-list primitives for the Settings architecture.
 *
 * A screen is a stack of `SettingsGroup`s (each a run of hairline-separated
 * rows) divided by `SettingsSeparator`. `SettingsRow` is the single row
 * vocabulary — label + optional value/right-accessory (chevron, toggle, custom
 * node) — so every Settings page reads as one system and new rows drop in
 * without bespoke layout. Tokens only; no literal hex.
 */

type SettingsGroupProps = {
  /** Optional small caps caption above the list (e.g. "Privacy Control"). */
  header?: string;
  /** Muted explanatory caption below the list. */
  footer?: string;
  children: React.ReactNode;
  style?: ViewStyle;
};

export const SettingsGroup: React.FC<SettingsGroupProps> = ({
  header,
  footer,
  children,
  style,
}) => {
  // Insert a hairline divider between (not after) rows. Filtering keeps the
  // count right when a caller conditionally renders `null` children.
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={style}>
      {header ? <Text style={styles.groupHeader}>{header}</Text> : null}
      {rows.map((child, index) => (
        <View key={index}>
          {index > 0 ? <View style={styles.divider} /> : null}
          {child}
        </View>
      ))}
      {footer ? <Text style={styles.groupFooter}>{footer}</Text> : null}
    </View>
  );
};

/** Section break between two `SettingsGroup`s — a divider with breathing room. */
export const SettingsSeparator: React.FC = () => (
  <View style={styles.separator} />
);

type SettingsRowProps = {
  label: string;
  /** Trailing grey value text (sits before a chevron when both are present). */
  value?: string;
  /** Show the iOS disclosure chevron (navigation / drill-down rows). */
  chevron?: boolean;
  /** Arbitrary trailing node — a Switch, a custom badge, etc. */
  right?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
};

export const SettingsRow: React.FC<SettingsRowProps> = ({
  label,
  value,
  chevron,
  right,
  danger,
  disabled,
  onPress,
  testID,
  accessibilityLabel,
}) => {
  const labelColor = danger
    ? theme.colors.figmaDestructive
    : theme.colors.uacTextBase;

  const content = (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
      <View style={styles.rowTrailing}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {right}
        {chevron ? (
          <Icons.ChevronRight
            width={20}
            height={20}
            color={theme.colors.figmaOnboardingStepLabel}
          />
        ) : null}
      </View>
    </View>
  );

  // A row with no press handler (e.g. a toggle row) renders as a plain View so
  // it isn't an interactive element competing with its inner control.
  if (!onPress) {
    return (
      <View testID={testID} accessibilityLabel={accessibilityLabel}>
        {content}
      </View>
    );
  }

  return (
    <TouchableOpacity
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.82}
      disabled={disabled}
      onPress={onPress}
    >
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  groupHeader: {
    ...theme.typography.aliases.poppinsBodySm,
    color: theme.colors.figmaOnboardingStepLabel,
    marginBottom: 4,
  },
  groupFooter: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaOnboardingStepLabel,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.figmaListDivider,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.figmaListDivider,
    marginVertical: 16,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowLabel: {
    ...theme.typography.aliases.poppinsBody,
    flexShrink: 1,
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowValue: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.figmaOnboardingStepLabel,
  },
});
