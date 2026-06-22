import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../theme/theme';
import IconClose from '../../assets/images/icon_close.svg';

/**
 * Black "info" snackbar (Figma node 3910:22127) — for dismissible toasts that
 * add UI complexity, e.g. the "AI-generated — may be inaccurate" disclosure and
 * the "you've seen them all" limited-suggestion notice. Black surface, white
 * label, optional inline action, and a required close button (the success
 * variant is the separate turquoise `ItemReadySnackbar`).
 */
interface InfoSnackbarProps {
  message: string;
  /** Optional inline action shown before the close button (e.g. "Report"). */
  action?: { label: string; onPress: () => void; testID?: string };
  onClose: () => void;
  testID?: string;
}

export const InfoSnackbar: React.FC<InfoSnackbarProps> = ({
  message,
  action,
  onClose,
  testID,
}) => (
  <View
    style={styles.snackbar}
    testID={testID}
    accessible
    accessibilityRole="alert"
    accessibilityLabel={message}
  >
    <Text style={styles.label} numberOfLines={2}>
      {message}
    </Text>
    {action ? (
      <TouchableOpacity
        testID={action.testID}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={action.onPress}
      >
        <Text style={styles.actionText}>{action.label}</Text>
      </TouchableOpacity>
    ) : null}
    <TouchableOpacity
      testID={testID ? `${testID}-close` : 'info-snackbar-close'}
      accessibilityRole="button"
      accessibilityLabel="Close"
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={onClose}
      style={styles.closeButton}
    >
      <IconClose width={24} height={24} color={theme.colors.white} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  snackbar: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s, // 8px
    paddingHorizontal: theme.spacing.m, // 16px
    paddingVertical: 12,
    borderRadius: theme.borderRadius.s, // 4px — matches success snackbar
    backgroundColor: theme.colors.figmaSnackbarInfoBg, // black info surface
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    flex: 1,
    color: theme.colors.white,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  actionText: {
    color: theme.colors.figmaSnackbarSuccessBg, // turquoise accent on black
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
