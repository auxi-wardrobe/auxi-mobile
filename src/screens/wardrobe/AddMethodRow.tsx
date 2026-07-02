import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from '../../components/primitives/PressableScale';
import { theme } from '../../theme/theme';

interface AddMethodRowProps {
  /** Optional icon — omit for mode-selector rows that don't carry an icon. */
  icon?: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
  testID: string;
  isLast?: boolean;
  /** When true the row renders a selection border (radio-style indicator). */
  selected?: boolean;
}

export const AddMethodRow: React.FC<AddMethodRowProps> = ({
  icon,
  title,
  description,
  onPress,
  testID,
  isLast,
  selected,
}) => (
  <PressableScale
    style={[
      styles.methodRow,
      selected ? styles.methodRowSelected : !isLast && styles.methodRowDivider,
    ]}
    activeOpacity={0.7}
    onPress={onPress}
    testID={testID}
    accessibilityLabel={title}
    accessibilityState={{ selected }}
  >
    {icon !== undefined ? <View style={styles.methodIcon}>{icon}</View> : null}
    <View style={styles.methodTexts}>
      <Text style={styles.methodTitle}>{title}</Text>
      <Text style={styles.methodDescription}>{description}</Text>
    </View>
  </PressableScale>
);

const styles = StyleSheet.create({
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  methodRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.figmaListDivider,
  },
  /** Selected border replaces the divider — gives a clean radio-style indicator. */
  methodRowSelected: {
    // 1.5px: one notch heavier than the 1px list divider so the selection ring
    // reads as emphasis without jumping to a full 2px. No border-width token
    // exists in theme.ts (only borderRadius is tokenised).
    borderWidth: 1.5,
    borderColor: theme.colors.figmaAction,
    borderRadius: theme.borderRadius.m,
    paddingHorizontal: theme.spacing.s,
  },
  methodIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTexts: {
    flex: 1,
  },
  methodTitle: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.figmaTextPrimary,
  },
  methodDescription: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    marginTop: 2,
  },
});
