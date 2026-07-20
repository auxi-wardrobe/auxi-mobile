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
 *
 * Swipe-to-dismiss: drag the sheet downward — dismiss if velocityY > 500 or
 * translationY > 80, otherwise spring back to resting position.
 */
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  color,
  FONT,
  radius,
  role,
  shadow,
  sheetCardSpec,
  space,
  type,
} from '../m-tokens';
// zIndex tiers live in the main theme (canonical six-tier model). A bottom
// sheet is tier 4 ("modal") and MUST paint above tier-2 sticky chrome
// (header/footer/tab-bar/FAB) — otherwise a screen's floating footer overlaps
// the sheet. See docs/Z_INDEX_LAYERING.md.
import { theme } from '../../../theme/theme';
import { useOverlayProgress } from './useOverlayProgress';
import { motion } from '../../../theme/motion';

const SHEET_TRAVEL = 320;
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-');

export interface MBottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  children?: React.ReactNode;
  testID?: string;
  /**
   * Dock the sheet flush to the bottom edge (full-width, rounded top corners
   * only, safe-area bottom padding) instead of the default floating card. Use
   * for primary bottom-anchored menus like the wardrobe switcher.
   */
  docked?: boolean;
}

export const MBottomSheet: React.FC<MBottomSheetProps> = ({
  visible,
  onDismiss,
  children,
  testID,
  docked = false,
}) => {
  const insets = useSafeAreaInsets();
  const { progress, mounted } = useOverlayProgress(visible);
  // Extra drag offset for swipe-to-dismiss gesture (clamp to >= 0, downward only).
  const dragY = useRef(new Animated.Value(0)).current;

  // Swipe-down-to-dismiss pan gesture.
  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      // Only allow downward drag — clamp negative values to 0.
      dragY.setValue(Math.max(0, e.translationY));
    })
    .onEnd(e => {
      const shouldDismiss = e.velocityY > 500 || e.translationY > 80;
      if (shouldDismiss) {
        // Let RN Animated handle the dismiss call on the JS thread.
        dragY.setValue(0);
        onDismiss();
      } else {
        // Spring back to resting position.
        Animated.spring(dragY, {
          toValue: 0,
          stiffness: motion.spring.standard.stiffness,
          damping: motion.spring.standard.damping,
          useNativeDriver: true,
        }).start();
      }
    })
    .runOnJS(true);

  if (!mounted) return null;

  const translateY = Animated.add(
    progress.interpolate({
      inputRange: [0, 1],
      outputRange: [SHEET_TRAVEL, 0],
    }),
    dragY,
  );

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
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheet,
              docked && styles.sheetDocked,
              docked && { paddingBottom: sheetCardSpec.pad + insets.bottom },
              shadow.sheetCard,
              { transform: [{ translateY }] },
            ]}
          >
            <View style={styles.grab} />
            {children}
          </Animated.View>
        </GestureDetector>
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
  scrim: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    // Tier 4 (modal) so the sheet + its scrim sit above any tier-2 sticky
    // footer / FAB / tab-bar on the host screen. A high (but sane) elevation
    // keeps Android's draw order consistent with the zIndex; the scrim is
    // transparent so it casts no shadow of its own.
    zIndex: theme.zIndex.modal,
    elevation: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: role.scrim, // rgba(0,0,0,0.45) — PR #138 / Figma scrim
  },
  sheetAnchor: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  // Floating-card sheet — PR #138 house pattern (OutfitLimitSheet.sheet):
  // all-corner radius 16, padding 16 both axes, 8px gutter + 8px bottom margin.
  sheet: {
    backgroundColor: role.surface2,
    borderRadius: sheetCardSpec.radius, // 16, all corners
    paddingHorizontal: sheetCardSpec.pad, // 16
    paddingVertical: sheetCardSpec.pad, // 16
    marginHorizontal: sheetCardSpec.gutter, // 8 each side
    marginBottom: sheetCardSpec.marginBottom, // 8 (=== theme.spacing.s)
    overflow: 'hidden',
  },
  // Docked variant — flush to the bottom edge, full width, top corners only.
  sheetDocked: {
    marginHorizontal: 0,
    marginBottom: 0,
    borderTopLeftRadius: sheetCardSpec.radius,
    borderTopRightRadius: sheetCardSpec.radius,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
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
    // Sheet head standardised to the app's title spec: SemiBold 14/20, ink.
    fontFamily: FONT.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: role.ink,
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
