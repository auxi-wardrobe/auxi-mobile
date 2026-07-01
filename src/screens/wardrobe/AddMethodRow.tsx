import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from '../../components/primitives/PressableScale';
import { theme } from '../../theme/theme';

interface AddMethodRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
  testID: string;
  isLast?: boolean;
}

export const AddMethodRow: React.FC<AddMethodRowProps> = ({
  icon,
  title,
  description,
  onPress,
  testID,
  isLast,
}) => (
  <PressableScale
    style={[styles.methodRow, !isLast && styles.methodRowDivider]}
    activeOpacity={0.7}
    onPress={onPress}
    testID={testID}
    accessibilityLabel={title}
  >
    <View style={styles.methodIcon}>{icon}</View>
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
