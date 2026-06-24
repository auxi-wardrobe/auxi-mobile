/**
 * MBottomSheet / MActionSheet — self-contained controlled bottom sheets.
 *
 *   import { MBottomSheet, MActionSheet } from '../components/design-system/lib';
 *   <MBottomSheet visible={open} onDismiss={close}>
 *     <MSheetOption icon={IconCamera} label="Take a photo" onPress={shoot} />
 *   </MBottomSheet>
 *   <MActionSheet visible={open} title="Manage outfit" onDismiss={close}
 *     options={[{ label:'Share', onPress }, { label:'Delete', destructive, onPress }]} />
 *
 * Slide-up + fade ENTER (spring), faster exit CLOSE; action rows stagger off the
 * shared progress. Absolute-fill scrim into the nearest positioned parent. Tokens
 * + motion encapsulated INSIDE. Honors reduce-motion.
 */
import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, role, shadow, space, type } from '../m-tokens';
import { useOverlayProgress } from './useOverlayProgress';

const SHEET_TRAVEL = 320;
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-');

export interface MBottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  children?: React.ReactNode;
  testID?: string;
}

export const MBottomSheet: React.FC<MBottomSheetProps> = ({
  visible,
  onDismiss,
  children,
  testID,
}) => {
  const { progress, mounted } = useOverlayProgress(visible);
  if (!mounted) return null;
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_TRAVEL, 0],
  });
  return (
    <View style={styles.scrim} testID={testID}>
      <Animated.View
        style={[styles.backdrop, { opacity: progress }]}
        pointerEvents="none"
      />
      <Pressable
        style={styles.sheetAnchor}
        onPress={onDismiss}
        testID={testID ? `${testID}-backdrop` : undefined}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <Animated.View
          style={[styles.sheet, shadow.sheet, { transform: [{ translateY }] }]}
        >
          <View style={styles.grab} />
          {children}
        </Animated.View>
      </Pressable>
    </View>
  );
};

export interface MSheetOptionProps {
  icon?: React.FC<{ width?: number; height?: number; color?: string }>;
  label: string;
  onPress?: () => void;
  testID?: string;
}

export const MSheetOption: React.FC<MSheetOptionProps> = ({
  icon: Icon,
  label,
  onPress,
  testID,
}) => (
  <Pressable
    style={styles.sheetOpt}
    onPress={onPress}
    testID={testID}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    {Icon && <Icon width={20} height={20} color={role.ink} />}
    <Text style={styles.sheetLabel}>{label}</Text>
  </Pressable>
);

export interface MActionSheetAction {
  label: string;
  destructive?: boolean;
  onPress?: () => void;
}

export interface MActionSheetProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  options: MActionSheetAction[];
  cancelLabel?: string;
  testID?: string;
}

export const MActionSheet: React.FC<MActionSheetProps> = ({
  visible,
  onDismiss,
  title,
  options,
  cancelLabel = 'Cancel',
  testID,
}) => {
  const { progress, mounted } = useOverlayProgress(visible);
  if (!mounted) return null;
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_TRAVEL, 0],
  });
  return (
    <View style={styles.scrim} testID={testID}>
      <Animated.View
        style={[styles.backdrop, { opacity: progress }]}
        pointerEvents="none"
      />
      <Pressable
        style={styles.sheetAnchor}
        onPress={onDismiss}
        testID={testID ? `${testID}-backdrop` : undefined}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <Animated.View
          style={[styles.asheet, shadow.sheet, { transform: [{ translateY }] }]}
        >
          {!!title && <Text style={styles.aHead}>{title}</Text>}
          {options.map((opt, i) => (
            <ActionRow
              key={opt.label}
              action={opt}
              index={i}
              progress={progress}
              testID={testID ? `${testID}-${slug(opt.label)}` : undefined}
            />
          ))}
          <Pressable
            style={styles.aCancel}
            onPress={onDismiss}
            testID={testID ? `${testID}-cancel` : undefined}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
          >
            <Text style={styles.aCancelText}>{cancelLabel}</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </View>
  );
};

const ActionRow: React.FC<{
  action: MActionSheetAction;
  index: number;
  progress: Animated.Value;
  testID?: string;
}> = ({ action, index, progress, testID }) => {
  const start = Math.min(0.3 + index * 0.18, 0.85);
  const opacity = progress.interpolate({
    inputRange: [start, Math.min(start + 0.2, 1)],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const translateY = progress.interpolate({
    inputRange: [start, Math.min(start + 0.2, 1)],
    outputRange: [6, 0],
    extrapolate: 'clamp',
  });
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Pressable
        style={styles.aRow}
        onPress={action.onPress}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={action.label}
      >
        <Text
          style={[styles.aRowText, action.destructive && styles.aRowDanger]}
        >
          {action.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(29,31,35,0.45)',
  },
  sheetAnchor: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: role.surface2,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    paddingTop: 10,
    paddingBottom: space.s3,
    overflow: 'hidden',
  },
  grab: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.n300,
    alignSelf: 'center',
    marginVertical: 8,
  },
  sheetOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingVertical: space.s4,
    paddingHorizontal: space.s5,
    borderTopWidth: 1,
    borderTopColor: role.lineCream,
  },
  sheetLabel: { ...type.body, color: role.ink },
  asheet: {
    backgroundColor: role.surface2,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    overflow: 'hidden',
    paddingBottom: space.s2,
  },
  aHead: {
    ...type.caption,
    color: role.ink3,
    textAlign: 'center',
    paddingVertical: space.s3,
  },
  aRow: {
    paddingVertical: space.s4,
    paddingHorizontal: space.s5,
    borderTopWidth: 1,
    borderTopColor: role.lineCream,
    alignItems: 'center',
  },
  aRowText: { ...type.body, color: role.ink },
  aRowDanger: { color: color.da400 },
  aCancel: {
    margin: space.s2,
    paddingVertical: space.s4,
    borderRadius: radius['2xl'],
    backgroundColor: color.n50,
    alignItems: 'center',
  },
  aCancelText: {
    ...type.body,
    fontFamily: type.h3.fontFamily,
    color: role.ink,
  },
});
