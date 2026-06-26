import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
} from 'react-native';

type Props = {
  text: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
  /** Scroll speed in points/second. */
  speed?: number;
  /** Gap (pts) between the two copies of the text while scrolling. */
  gap?: number;
  /** Pause (ms) before the ticker starts moving, so the start is readable. */
  startDelay?: number;
};

// News-ticker / marquee text. When the text fits its container it renders as a
// normal single line. When it overflows, the text scrolls horizontally in a
// seamless loop (two copies separated by `gap`, translated by one copy width).
export const MarqueeText: React.FC<Props> = ({
  text,
  style,
  testID,
  speed = 45,
  gap = 32,
  startDelay = 1200,
}) => {
  const [containerW, setContainerW] = useState(0);
  const [textW, setTextW] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const overflow = containerW > 0 && textW > containerW;

  useEffect(() => {
    translateX.stopAnimation();
    translateX.setValue(0);
    if (!overflow) {
      return;
    }
    const distance = textW + gap;
    const duration = (distance / speed) * 1000;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(startDelay),
        Animated.timing(translateX, {
          toValue: -distance,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
    // Re-arm whenever the text or the measured geometry changes.
  }, [overflow, textW, gap, speed, startDelay, text, translateX]);

  const onContainerLayout = (e: LayoutChangeEvent) =>
    setContainerW(e.nativeEvent.layout.width);
  const onTextLayout = (e: LayoutChangeEvent) =>
    setTextW(e.nativeEvent.layout.width);

  return (
    <View
      testID={testID}
      style={styles.viewport}
      onLayout={onContainerLayout}
    >
      <Animated.View
        style={[styles.track, { transform: [{ translateX }] }]}
      >
        <Animated.Text
          numberOfLines={1}
          style={[style, styles.segment]}
          onLayout={onTextLayout}
        >
          {text}
        </Animated.Text>
        {overflow ? (
          <>
            <View style={{ width: gap }} />
            <Animated.Text numberOfLines={1} style={[style, styles.segment]}>
              {text}
            </Animated.Text>
          </>
        ) : null}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  viewport: {
    flexShrink: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // flexShrink:0 keeps each copy at its intrinsic width (no truncation), so the
  // measured width is the real text width and the overflow check is accurate.
  segment: {
    flexShrink: 0,
  },
});
