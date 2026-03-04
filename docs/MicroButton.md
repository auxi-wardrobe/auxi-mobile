# MicroButton

Assumes `react-native-reanimated`, `react-native-gesture-handler`, and `react-native-haptic-feedback` are installed, the Reanimated Babel plugin is enabled, and your app entry imports `react-native-gesture-handler`.

## 1. Full component code (hook + component)

```tsx
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  useColorScheme,
  Vibration,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

const SPRING_CONFIG: WithSpringConfig = {
  damping: 12,
  stiffness: 120,
  mass: 0.72,
  overshootClamping: false,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
};

const ENTER_DURATION_MS = 180;
const HOLD_PREVIEW_DELAY_MS = 110;
const HOLD_SUCCESS_TOOLTIP_DELAY_MS = 380;
const HOLD_RING_SIZE = 26;
const HOLD_RING_STROKE = 2.5;
const HOLD_RING_RADIUS = (HOLD_RING_SIZE - HOLD_RING_STROKE) / 2;
const HOLD_RING_CIRCUMFERENCE = 2 * Math.PI * HOLD_RING_RADIUS;
const IS_JEST = typeof process !== 'undefined' && Boolean(process.env.JEST_WORKER_ID);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ImpactKind = 'impactLight' | 'impactMedium';
type ColorScheme = 'light' | 'dark';

interface MicroPalette {
  shellBackground: string;
  shellBorder: string;
  buttonBackground: string;
  buttonText: string;
  subText: string;
  shadow: string;
  ringTrack: string;
  ringProgress: string;
  tooltipBackground: string;
  tooltipText: string;
  disabledBackground: string;
  disabledText: string;
}

export interface UseMicroAnimOptions {
  pressedScale?: number;
  pressedOpacity?: number;
  enterOffsetY?: number;
  longPressDuration?: number;
  skipAnimations?: boolean;
  springConfig?: WithSpringConfig;
}

interface UseMicroAnimResult {
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
  tooltipAnimatedStyle: ReturnType<typeof useAnimatedStyle>;
  ringAnimatedStyle: ReturnType<typeof useAnimatedStyle>;
  ringProgress: SharedValue<number>;
  animateIn: () => void;
  animatePressIn: () => void;
  animatePressOut: () => void;
  showHoldUi: (progressDurationMs?: number) => void;
  hideHoldUi: (delayMs?: number) => void;
  pulseSignal: () => void;
}

export interface MicroButtonProps {
  title: string;
  onPress: () => void;
  onLongPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  tooltipText?: string;
  longPressDuration?: number;
  pressedScale?: number;
  pressedOpacity?: number;
  gestureMaxTravel?: number;
  skipAnimations?: boolean;
  mockGestures?: boolean;
  testID?: string;
  fullWidth?: boolean;
  signalPulseKey?: string | number;
  accentColor?: string;
  containerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  tooltipStyle?: StyleProp<ViewStyle>;
  tooltipTextStyle?: StyleProp<TextStyle>;
}

const HAPTIC_OPTIONS = {
  enableVibrateFallback: false,
  ignoreAndroidSystemSettings: false,
};

const triggerFeedback = (kind: ImpactKind = 'impactLight') => {
  if (Platform.OS === 'ios') {
    ReactNativeHapticFeedback.trigger(kind, HAPTIC_OPTIONS);
    return;
  }

  Vibration.vibrate(kind === 'impactMedium' ? 18 : 10);
};

const getScheme = (scheme: ReturnType<typeof useColorScheme>): ColorScheme =>
  scheme === 'light' ? 'light' : 'dark';

const withSafeTiming = (
  sharedValue: SharedValue<number>,
  toValue: number,
  mounted: boolean,
  skipAnimations: boolean,
  config?: WithTimingConfig,
) => {
  if (!mounted || skipAnimations) {
    sharedValue.value = toValue;
    return;
  }

  sharedValue.value = withTiming(toValue, config);
};

const withSafeSpring = (
  sharedValue: SharedValue<number>,
  toValue: number,
  mounted: boolean,
  skipAnimations: boolean,
  config: WithSpringConfig,
) => {
  if (!mounted || skipAnimations) {
    sharedValue.value = toValue;
    return;
  }

  sharedValue.value = withSpring(toValue, config);
};

const createPalette = (
  colorScheme: ColorScheme,
  accentColor?: string,
): MicroPalette => {
  const resolvedAccent = accentColor ?? (colorScheme === 'dark' ? '#14C784' : '#0E9F6E');

  if (colorScheme === 'dark') {
    return {
      shellBackground: '#0F1722',
      shellBorder: '#1E293B',
      buttonBackground: resolvedAccent,
      buttonText: '#F8FAFC',
      subText: '#A7B4C8',
      shadow: '#020617',
      ringTrack: 'rgba(248, 250, 252, 0.16)',
      ringProgress: '#F8FAFC',
      tooltipBackground: '#020617',
      tooltipText: '#E2E8F0',
      disabledBackground: '#243244',
      disabledText: '#7F8EA4',
    };
  }

  return {
    shellBackground: '#F8FBFF',
    shellBorder: '#D7E2F0',
    buttonBackground: resolvedAccent,
    buttonText: '#FFFFFF',
    subText: '#54657A',
    shadow: '#AEBBD0',
    ringTrack: 'rgba(16, 24, 39, 0.12)',
    ringProgress: '#101827',
    tooltipBackground: '#101827',
    tooltipText: '#F8FAFC',
    disabledBackground: '#C4D2E2',
    disabledText: '#6B7D91',
  };
};

export const useMicroAnim = ({
  pressedScale = 0.95,
  pressedOpacity = 0.96,
  enterOffsetY = 18,
  longPressDuration = 720,
  skipAnimations = false,
  springConfig = SPRING_CONFIG,
}: UseMicroAnimOptions = {}): UseMicroAnimResult => {
  const mountedRef = useRef(false);

  const scale = useSharedValue(1);
  const fade = useSharedValue(skipAnimations ? 1 : 0);
  const translateY = useSharedValue(skipAnimations ? 0 : enterOffsetY);
  const tooltipFade = useSharedValue(0);
  const tooltipLift = useSharedValue(8);
  const holdRingFade = useSharedValue(0);
  const holdRingProgress = useSharedValue(0);
  const signalScale = useSharedValue(1);

  const isReady = useCallback(() => mountedRef.current, []);

  const animateIn = useCallback(() => {
    withSafeTiming(fade, 1, isReady(), skipAnimations, {
      duration: ENTER_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
    withSafeSpring(translateY, 0, isReady(), skipAnimations, springConfig);
  }, [fade, isReady, skipAnimations, springConfig, translateY]);

  const animatePressIn = useCallback(() => {
    withSafeSpring(scale, pressedScale, isReady(), skipAnimations, springConfig);
    withSafeTiming(fade, pressedOpacity, isReady(), skipAnimations, {
      duration: 90,
      easing: Easing.out(Easing.quad),
    });
  }, [fade, isReady, pressedOpacity, pressedScale, scale, skipAnimations, springConfig]);

  const animatePressOut = useCallback(() => {
    withSafeSpring(scale, 1, isReady(), skipAnimations, springConfig);
    withSafeTiming(fade, 1, isReady(), skipAnimations, {
      duration: 120,
      easing: Easing.out(Easing.quad),
    });
  }, [fade, isReady, scale, skipAnimations, springConfig]);

  const showHoldUi = useCallback(
    (progressDurationMs = longPressDuration) => {
      const mounted = isReady();

      cancelAnimation(holdRingProgress);
      withSafeTiming(holdRingFade, 1, mounted, skipAnimations, {
        duration: 120,
        easing: Easing.out(Easing.quad),
      });
      withSafeTiming(tooltipFade, 1, mounted, skipAnimations, {
        duration: 120,
        easing: Easing.out(Easing.quad),
      });
      withSafeTiming(tooltipLift, 0, mounted, skipAnimations, {
        duration: 130,
        easing: Easing.out(Easing.cubic),
      });

      if (!mounted || skipAnimations) {
        holdRingProgress.value = 1;
        return;
      }

      holdRingProgress.value = withTiming(1, {
        duration: progressDurationMs,
        easing: Easing.linear,
      });
    },
    [
      holdRingFade,
      holdRingProgress,
      isReady,
      longPressDuration,
      skipAnimations,
      tooltipFade,
      tooltipLift,
    ],
  );

  const hideHoldUi = useCallback(
    (delayMs = 0) => {
      const mounted = isReady();

      cancelAnimation(holdRingProgress);
      withSafeTiming(holdRingFade, 0, mounted, skipAnimations, {
        duration: 140,
        easing: Easing.out(Easing.quad),
      });

      if (!mounted || skipAnimations || delayMs <= 0) {
        withSafeTiming(tooltipFade, 0, mounted, skipAnimations, {
          duration: 100,
          easing: Easing.out(Easing.quad),
        });
        withSafeTiming(tooltipLift, 8, mounted, skipAnimations, {
          duration: 120,
          easing: Easing.out(Easing.quad),
        });
      } else {
        tooltipFade.value = withDelay(
          delayMs,
          withTiming(0, {
            duration: 100,
            easing: Easing.out(Easing.quad),
          }),
        );
        tooltipLift.value = withDelay(
          delayMs,
          withTiming(8, {
            duration: 120,
            easing: Easing.out(Easing.quad),
          }),
        );
      }

      withSafeTiming(holdRingProgress, 0, mounted, skipAnimations, {
        duration: 140,
        easing: Easing.out(Easing.quad),
      });
    },
    [
      holdRingFade,
      holdRingProgress,
      isReady,
      skipAnimations,
      tooltipFade,
      tooltipLift,
    ],
  );

  const pulseSignal = useCallback(() => {
    const mounted = isReady();

    if (!mounted || skipAnimations) {
      signalScale.value = 1;
      return;
    }

    signalScale.value = withSequence(
      withSpring(1.06, {
        damping: 10,
        stiffness: 180,
      }),
      withSpring(1, springConfig),
    );
  }, [isReady, signalScale, skipAnimations, springConfig]);

  useEffect(() => {
    mountedRef.current = true;
    animateIn();

    return () => {
      mountedRef.current = false;
      cancelAnimation(scale);
      cancelAnimation(fade);
      cancelAnimation(translateY);
      cancelAnimation(tooltipFade);
      cancelAnimation(tooltipLift);
      cancelAnimation(holdRingFade);
      cancelAnimation(holdRingProgress);
      cancelAnimation(signalScale);
    };
  }, [
    animateIn,
    fade,
    holdRingFade,
    holdRingProgress,
    scale,
    signalScale,
    tooltipFade,
    tooltipLift,
    translateY,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value * signalScale.value },
    ],
  }));

  const tooltipAnimatedStyle = useAnimatedStyle(() => ({
    opacity: tooltipFade.value,
    transform: [{ translateY: tooltipLift.value }],
  }));

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    opacity: holdRingFade.value,
    transform: [{ scale: interpolate(holdRingProgress.value, [0, 1], [0.92, 1.04]) }],
  }));

  return {
    animatedStyle,
    tooltipAnimatedStyle,
    ringAnimatedStyle,
    ringProgress: holdRingProgress,
    animateIn,
    animatePressIn,
    animatePressOut,
    showHoldUi,
    hideHoldUi,
    pulseSignal,
  };
};

export const MicroButton = memo(
  ({
    title,
    onPress,
    onLongPress,
    loading = false,
    disabled = false,
    tooltipText = 'Hold to confirm',
    longPressDuration = 720,
    pressedScale = 0.95,
    pressedOpacity = 0.96,
    gestureMaxTravel = 12,
    skipAnimations = false,
    mockGestures = false,
    testID = 'micro-button',
    fullWidth = false,
    signalPulseKey,
    accentColor,
    containerStyle,
    titleStyle,
    tooltipStyle,
    tooltipTextStyle,
  }: MicroButtonProps) => {
    const colorScheme = getScheme(useColorScheme());
    const palette = useMemo(
      () => createPalette(colorScheme, accentColor),
      [accentColor, colorScheme],
    );

    const {
      animatedStyle,
      tooltipAnimatedStyle,
      ringAnimatedStyle,
      ringProgress,
      animatePressIn,
      animatePressOut,
      showHoldUi,
      hideHoldUi,
      pulseSignal,
    } = useMicroAnim({
      pressedScale,
      pressedOpacity,
      longPressDuration,
      skipAnimations,
    });

    const holdPreviewVisibleRef = useRef(false);
    const longPressTriggeredRef = useRef(false);
    const holdSuccessPendingRef = useRef(false);
    const holdPreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const holdSuccessResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isInteractionDisabled = disabled || loading;
    const canUseLongPress = Boolean(onLongPress) && !isInteractionDisabled;
    const shouldMockGestures = mockGestures || IS_JEST;
    const tapMaxDuration = Math.max(longPressDuration + 120, 260);

    const clearHoldPreviewTimer = useCallback(() => {
      if (holdPreviewTimerRef.current) {
        clearTimeout(holdPreviewTimerRef.current);
        holdPreviewTimerRef.current = null;
      }
    }, []);

    const clearHoldSuccessResetTimer = useCallback(() => {
      if (holdSuccessResetTimerRef.current) {
        clearTimeout(holdSuccessResetTimerRef.current);
        holdSuccessResetTimerRef.current = null;
      }
    }, []);

    const scheduleHoldPreview = useCallback(() => {
      if (!canUseLongPress) {
        return;
      }

      clearHoldPreviewTimer();
      holdPreviewTimerRef.current = setTimeout(() => {
        holdPreviewTimerRef.current = null;
        holdPreviewVisibleRef.current = true;
        showHoldUi(Math.max(longPressDuration - HOLD_PREVIEW_DELAY_MS, 1));
      }, HOLD_PREVIEW_DELAY_MS);
    }, [canUseLongPress, clearHoldPreviewTimer, longPressDuration, showHoldUi]);

    const cancelHoldPreview = useCallback(
      (hideDelayMs = 0) => {
        clearHoldPreviewTimer();

        if (!holdPreviewVisibleRef.current) {
          return;
        }

        holdPreviewVisibleRef.current = false;
        hideHoldUi(hideDelayMs);
      },
      [clearHoldPreviewTimer, hideHoldUi],
    );

    const handlePress = useCallback(() => {
      if (isInteractionDisabled) {
        return;
      }

      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
        return;
      }

      onPress();
    }, [isInteractionDisabled, onPress]);

    const handleLongPress = useCallback(() => {
      if (!canUseLongPress) {
        return;
      }

      longPressTriggeredRef.current = true;
      holdSuccessPendingRef.current = true;
      clearHoldPreviewTimer();
      clearHoldSuccessResetTimer();

      if (!holdPreviewVisibleRef.current) {
        holdPreviewVisibleRef.current = true;
        showHoldUi(1);
      }

      triggerFeedback('impactMedium');
      onLongPress?.();
      hideHoldUi(HOLD_SUCCESS_TOOLTIP_DELAY_MS);
      holdSuccessResetTimerRef.current = setTimeout(() => {
        holdSuccessResetTimerRef.current = null;
        holdPreviewVisibleRef.current = false;
        holdSuccessPendingRef.current = false;
        longPressTriggeredRef.current = false;
      }, HOLD_SUCCESS_TOOLTIP_DELAY_MS);
    }, [
      canUseLongPress,
      clearHoldPreviewTimer,
      clearHoldSuccessResetTimer,
      hideHoldUi,
      onLongPress,
      showHoldUi,
    ]);

    const handlePressBegin = useCallback(() => {
      if (isInteractionDisabled) {
        return;
      }

      if (holdSuccessPendingRef.current) {
        clearHoldSuccessResetTimer();
        holdSuccessPendingRef.current = false;
        holdPreviewVisibleRef.current = false;
        longPressTriggeredRef.current = false;
      }

      animatePressIn();
      triggerFeedback('impactLight');
      scheduleHoldPreview();
    }, [
      animatePressIn,
      clearHoldSuccessResetTimer,
      isInteractionDisabled,
      scheduleHoldPreview,
    ]);

    const handlePressEnd = useCallback(() => {
      animatePressOut();

      if (!longPressTriggeredRef.current && !holdSuccessPendingRef.current) {
        cancelHoldPreview();
      }
    }, [animatePressOut, cancelHoldPreview]);

    useEffect(() => {
      if (signalPulseKey === undefined || signalPulseKey === null) {
        return;
      }

      pulseSignal();
    }, [pulseSignal, signalPulseKey]);

    useEffect(
      () => () => {
        clearHoldPreviewTimer();
        clearHoldSuccessResetTimer();
      },
      [clearHoldPreviewTimer, clearHoldSuccessResetTimer],
    );

    const ringAnimatedProps = useAnimatedProps(() => ({
      strokeDashoffset: HOLD_RING_CIRCUMFERENCE * (1 - ringProgress.value),
    }));

    const buttonBackgroundStyle = useMemo<ViewStyle>(
      () => ({
        backgroundColor: isInteractionDisabled
          ? palette.disabledBackground
          : palette.buttonBackground,
        borderColor: palette.shellBorder,
        width: fullWidth ? '100%' : undefined,
      }),
      [fullWidth, isInteractionDisabled, palette.buttonBackground, palette.disabledBackground, palette.shellBorder],
    );

    const titleColorStyle = useMemo<TextStyle>(
      () => ({
        color: isInteractionDisabled ? palette.disabledText : palette.buttonText,
      }),
      [isInteractionDisabled, palette.buttonText, palette.disabledText],
    );

    const content = (
      <Animated.View
        style={[
          styles.host,
          fullWidth && styles.fullWidth,
          containerStyle,
        ]}
        testID={testID}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tooltip,
            tooltipAnimatedStyle,
            {
              backgroundColor: palette.tooltipBackground,
            },
            tooltipStyle,
          ]}
        >
          <Text style={[styles.tooltipText, { color: palette.tooltipText }, tooltipTextStyle]}>
            {tooltipText}
          </Text>
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[styles.holdRing, ringAnimatedStyle]}
        >
          <Svg
            height={HOLD_RING_SIZE}
            width={HOLD_RING_SIZE}
            style={styles.holdRingSvg}
          >
            <Circle
              cx={HOLD_RING_SIZE / 2}
              cy={HOLD_RING_SIZE / 2}
              r={HOLD_RING_RADIUS}
              stroke={palette.ringTrack}
              strokeWidth={HOLD_RING_STROKE}
              fill="none"
            />
            <AnimatedCircle
              animatedProps={ringAnimatedProps}
              cx={HOLD_RING_SIZE / 2}
              cy={HOLD_RING_SIZE / 2}
              r={HOLD_RING_RADIUS}
              stroke={palette.ringProgress}
              strokeLinecap="round"
              strokeWidth={HOLD_RING_STROKE}
              fill="none"
              strokeDasharray={[
                HOLD_RING_CIRCUMFERENCE,
                HOLD_RING_CIRCUMFERENCE,
              ]}
            />
          </Svg>
        </Animated.View>

        <Animated.View
          style={[
            styles.buttonShell,
            {
              backgroundColor: palette.shellBackground,
              borderColor: palette.shellBorder,
              shadowColor: palette.shadow,
            },
            animatedStyle,
          ]}
        >
          <View style={[styles.button, buttonBackgroundStyle]}>
            <View style={styles.buttonGloss} />

            {loading ? (
              <ActivityIndicator color={palette.buttonText} />
            ) : (
              <View style={styles.contentRow}>
                <View style={styles.signalDot} />
                <View style={styles.copyBlock}>
                  <Text
                    numberOfLines={1}
                    style={[styles.title, titleColorStyle, titleStyle]}
                  >
                    {title}
                  </Text>
                  <Text style={[styles.caption, { color: palette.subText }]}>
                    Tap to execute
                  </Text>
                </View>
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    );

    if (shouldMockGestures) {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          delayLongPress={longPressDuration}
          disabled={isInteractionDisabled}
          onLongPress={handleLongPress}
          onPress={handlePress}
          onPressIn={handlePressBegin}
          onPressOut={handlePressEnd}
        >
          {content}
        </Pressable>
      );
    }

    const tapGesture = Gesture.Tap()
      .runOnJS(true)
      .enabled(!isInteractionDisabled)
      .maxDuration(tapMaxDuration)
      .maxDistance(gestureMaxTravel)
      .onBegin(handlePressBegin)
      .onFinalize(handlePressEnd)
      .onEnd((_event, success) => {
        if (success) {
          handlePress();
        }
      })
      .withTestId(`${testID}-tap`);

    const longPressGesture = Gesture.LongPress()
      .runOnJS(true)
      .enabled(canUseLongPress)
      .minDuration(longPressDuration)
      .maxDistance(gestureMaxTravel)
      .onStart(handleLongPress)
      .onFinalize(() => {
        clearHoldPreviewTimer();

        if (holdSuccessPendingRef.current) {
          return;
        }

        if (!longPressTriggeredRef.current) {
          cancelHoldPreview();
        }
      })
      .withTestId(`${testID}-hold`);

    const gesture = canUseLongPress
      ? Gesture.Race(longPressGesture, tapGesture)
      : tapGesture;

    return <GestureDetector gesture={gesture}>{content}</GestureDetector>;
  },
);

MicroButton.displayName = 'MicroButton';

const styles = StyleSheet.create({
  host: {
    alignSelf: 'flex-start',
    minWidth: 180,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  tooltip: {
    position: 'absolute',
    top: -42,
    alignSelf: 'center',
    zIndex: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  holdRing: {
    position: 'absolute',
    left: 16,
    top: 15,
    zIndex: 2,
  },
  holdRingSvg: {
    transform: [{ rotate: '-90deg' }],
  },
  buttonShell: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 3,
    shadowOffset: {
      width: 0,
      height: 14,
    },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 8,
  },
  button: {
    minHeight: 58,
    borderRadius: 19,
    borderWidth: 1,
    paddingHorizontal: 18,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonGloss: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  copyBlock: {
    flexShrink: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  caption: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
});
```

## 2. Demo `App.tsx` snippet

```tsx
import 'react-native-gesture-handler';
import React, { useCallback, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MicroButton } from './MicroButton';

export default function App() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [signalPulseKey, setSignalPulseKey] = useState(0);

  const handleTrade = useCallback(() => {
    setIsExecuting(true);

    setTimeout(() => {
      setIsExecuting(false);
      setSignalPulseKey(previous => previous + 1);
    }, 900);
  }, []);

  const handlePriceAlertHold = useCallback(() => {
    setSignalPulseKey(previous => previous + 1);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>BTC-USD momentum signal</Text>
          <Text style={styles.price}>$68,420.12</Text>
          <Text style={styles.copy}>
            Attach this button to a price alert action and pulse it again when the
            signal hits.
          </Text>

          <MicroButton
            title="Buy"
            loading={isExecuting}
            onPress={handleTrade}
            onLongPress={handlePriceAlertHold}
            signalPulseKey={signalPulseKey}
            fullWidth
            tooltipText="Hold to arm alert"
          />
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050B14',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 28,
    backgroundColor: '#0F1722',
    padding: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  eyebrow: {
    color: '#8BA3C7',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  price: {
    marginTop: 12,
    color: '#F8FAFC',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  copy: {
    marginTop: 10,
    marginBottom: 20,
    color: '#A7B4C8',
    fontSize: 14,
    lineHeight: 22,
  },
});
```

## 3. Key optimizations explained

- All motion is driven by Reanimated shared values, so tap scale, slide-up enter, tooltip fade, hold progress, and signal bounce stay off the JS layout path once triggered.
- `React.memo`, deferred hold-preview timers, and the mounted guard prevent wasteful re-renders and avoid scheduling animation work when the component is still mounting or already gone.
- `mockGestures` plus the automatic Jest fallback make tests deterministic without native gesture plumbing, while `gestureMaxTravel` reduces scroll-view conflicts by failing fast when the finger turns into a drag.

## 4. GIF-worthy motion values

- Tap press: `scale -> 0.95`, `opacity -> 0.96`, release in `120ms`.
- Enter motion: `translateY 18 -> 0`, `opacity 0 -> 1`.
- Signal bounce: `scale 1 -> 1.06 -> 1`.
- Spring config: `{ damping: 12, stiffness: 120 }`.
