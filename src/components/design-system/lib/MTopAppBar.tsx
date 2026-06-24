/**
 * MTopAppBar — self-contained top app bar (back · title · action).
 *
 *   import { MTopAppBar } from '../components/design-system/lib';
 *   <MTopAppBar title="Wardrobe" onBack={goBack} onAction={add} />
 *
 * Each icon presses (scale .88 + bg fade). Provide `onBack` / `onAction` (and
 * optional `actionIcon`) to show the side buttons. Tokens + press motion
 * encapsulated INSIDE.
 */
import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icons } from '../../../assets/icons';
import { color, radius, role, space, type } from '../m-tokens';
import { usePressHighlight } from '../MMotion';

const IconChevronLeft = Icons.ChevronLeft;
const IconPlus = Icons.Plus;

const TopIcon: React.FC<{
  Icon: React.FC<{ width?: number; height?: number; color?: string }>;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel: string;
}> = ({ Icon, onPress, testID, accessibilityLabel }) => {
  const press = usePressHighlight();
  const scale = press.v.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.88],
  });
  const bg = press.v.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', color.n100],
  });
  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        style={[
          styles.topIcon,
          { backgroundColor: bg, transform: [{ scale }] },
        ]}
      >
        <Icon width={22} height={22} color={role.ink} />
      </Animated.View>
    </Pressable>
  );
};

export interface MTopAppBarProps {
  title: string;
  onBack?: () => void;
  onAction?: () => void;
  actionIcon?: React.FC<{ width?: number; height?: number; color?: string }>;
  actionLabel?: string;
  testID?: string;
}

export const MTopAppBar: React.FC<MTopAppBarProps> = ({
  title,
  onBack,
  onAction,
  actionIcon: ActionIcon = IconPlus,
  actionLabel = 'Action',
  testID,
}) => (
  <View style={styles.topbar} testID={testID}>
    {onBack ? (
      <TopIcon
        Icon={IconChevronLeft}
        onPress={onBack}
        testID={testID ? `${testID}-back` : undefined}
        accessibilityLabel="Back"
      />
    ) : (
      <View style={styles.spacer} />
    )}
    <Text style={styles.topTitle}>{title}</Text>
    {onAction ? (
      <TopIcon
        Icon={ActionIcon}
        onPress={onAction}
        testID={testID ? `${testID}-action` : undefined}
        accessibilityLabel={actionLabel}
      />
    ) : (
      <View style={styles.spacer} />
    )}
  </View>
);

const styles = StyleSheet.create({
  topbar: {
    width: 300,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: color.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: role.line,
    paddingHorizontal: space.s3,
    paddingVertical: space.s2,
  },
  spacer: { width: 40, height: 40 },
  topIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { ...type.h3, color: role.ink },
});
