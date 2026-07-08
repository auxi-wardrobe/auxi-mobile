/**
 * MListRow — self-contained settings-style row (label · value · chevron · danger).
 *
 *   import { MListRow } from '../components/design-system/lib';
 *   <MListRow label="Privacy" chevron onPress={open} />
 *   <MListRow label="Style" value="Calm, Effortless" chevron onPress={edit} />
 *   <MListRow label="Delete data" danger onPress={confirm} />
 *
 * Press → bg fade + chevron nudge (danger swaps the trailing icon to a trash
 * glyph in the danger tint). Tokens + press motion encapsulated INSIDE.
 */
import React from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Icons } from '../../../assets/icons';
import { color, role, space, type } from '../m-tokens';
import { usePressHighlight } from '../MMotion';

const IconChevronRight = Icons.ChevronRight;
const IconTrash = Icons.Trash;

export interface MListRowProps {
  label: string;
  value?: string;
  trailing?: React.ReactNode;
  chevron?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export const MListRow: React.FC<MListRowProps> = ({
  label,
  value,
  trailing,
  chevron,
  danger,
  disabled,
  onPress,
  testID,
  accessibilityLabel,
  style,
}) => {
  const { v, onPressIn, onPressOut } = usePressHighlight();
  const bg = v.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', color.n50],
  });
  const nudge = v.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });

  const rowContent = (
    <>
      <Text style={[styles.rowLabel, danger && styles.rowDanger]}>{label}</Text>
      <View style={styles.trailing}>
        {!!value && <Text style={styles.rowValue}>{value}</Text>}
        {trailing}
      </View>
      {danger ? (
        <IconTrash width={20} height={20} color={color.da400} />
      ) : chevron ? (
        <Animated.View style={{ transform: [{ translateX: nudge }] }}>
          <IconChevronRight width={20} height={20} color={role.ink3} />
        </Animated.View>
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View
        testID={testID}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: !!disabled }}
        style={[styles.row, disabled && styles.disabled, style]}
      >
        {rowContent}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      testID={testID}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Animated.View
        style={[
          styles.row,
          { backgroundColor: bg },
          disabled && styles.disabled,
          style,
        ]}
      >
        {rowContent}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingVertical: space.s4,
    paddingHorizontal: space.s4,
    borderBottomWidth: 1,
    borderBottomColor: role.lineCream,
  },
  rowLabel: { ...type.bodySm, color: role.ink, flex: 1, fontSize: 15 },
  rowDanger: { color: color.da400 },
  rowValue: { ...type.bodySm, color: role.ink3, fontSize: 13.5 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  disabled: { opacity: 0.5 },
});
