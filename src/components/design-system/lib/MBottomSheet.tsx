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
 * shared progress. Renders through a real RN <Modal> so the scrim portals to
 * root and always overlays full-screen above everything (header/status-bar
 * included), regardless of where the component is mounted in the tree. Modal
 * uses animationType="none" — our spring/timing drives the motion. Tokens +
 * motion encapsulated INSIDE. Honors reduce-motion.
 *
 * `swipeToDismiss` (default true) adds a swipe-down gesture gated to the
 * grab-handle area only — the PanResponder lives on the handle wrapper, so it
 * never fights a scrollable body below it. Past a distance/velocity threshold
 * it calls `onDismiss`, otherwise the sheet snaps back. `backdropTestID` lets a
 * consumer name the dismiss-backdrop explicitly (default `${testID}-backdrop`).
 */
import React, { useRef } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { color, radius, role, shadow, space, type } from '../m-tokens';
import { useOverlayProgress } from './useOverlayProgress';

const SHEET_TRAVEL = 320;
const SWIPE_DISMISS_DISTANCE = 90;
const SWIPE_DISMISS_VELOCITY = 0.8;
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-');

export interface MBottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  children?: React.ReactNode;
  testID?: string;
  /** Explicit testID for the dismiss-backdrop (default `${testID}-backdrop`). */
  backdropTestID?: string;
  /** Swipe-down-to-dismiss on the grab-handle area (default true). */
  swipeToDismiss?: boolean;
}

export const MBottomSheet: React.FC<MBottomSheetProps> = ({
  visible,
  onDismiss,
  children,
  testID,
  backdropTestID,
  swipeToDismiss = true,
}) => {
  const { progress, mounted } = useOverlayProgress(visible);
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_TRAVEL, 0],
  });
  // Finger-driven drag offset, composed on top of the entry translateY so the
  // sheet follows a swipe-down without disturbing the open/close motion.
  const dragY = useRef(new Animated.Value(0)).current;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const snapBack = () => {
    Animated.spring(dragY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  };

  // Gated to the grab-handle wrapper only — never intercepts a scrollable body.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gs) =>
        gs.dy > 6 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_evt, gs) => {
        if (gs.dy > 0) {
          dragY.setValue(gs.dy);
        }
      },
      onPanResponderRelease: (_evt, gs) => {
        if (gs.dy > SWIPE_DISMISS_DISTANCE || gs.vy > SWIPE_DISMISS_VELOCITY) {
          onDismissRef.current();
        } else {
          snapBack();
        }
      },
      onPanResponderTerminate: () => snapBack(),
    }),
  ).current;

  const resolvedBackdropTestID =
    backdropTestID ?? (testID ? `${testID}-backdrop` : undefined);

  return (
    <Modal
      transparent
      visible={mounted}
      onRequestClose={onDismiss}
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.scrim} testID={testID}>
        <Animated.View
          style={[styles.backdrop, { opacity: progress }]}
          pointerEvents="none"
        />
        <Pressable
          style={styles.sheetAnchor}
          onPress={onDismiss}
          testID={resolvedBackdropTestID}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Animated.View
            style={[
              styles.sheet,
              shadow.sheet,
              { transform: [{ translateY }, { translateY: dragY }] },
            ]}
          >
            <View
              style={styles.grabArea}
              {...(swipeToDismiss ? panResponder.panHandlers : {})}
            >
              <View style={styles.grab} />
            </View>
            {children}
          </Animated.View>
        </Pressable>
      </View>
    </Modal>
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
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_TRAVEL, 0],
  });
  return (
    <Modal
      transparent
      visible={mounted}
      onRequestClose={onDismiss}
      animationType="none"
      statusBarTranslucent
    >
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
            style={[
              styles.asheet,
              shadow.sheet,
              { transform: [{ translateY }] },
            ]}
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
    </Modal>
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
  // Wraps the grab handle so the swipe-down PanResponder is gated to this
  // area only (never the scrollable body). Hit-slop comes from the padding.
  grabArea: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  grab: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.n300,
    alignSelf: 'center',
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
