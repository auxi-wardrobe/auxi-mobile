import { createStackNavigator } from '@react-navigation/stack';
import type { ParamListBase } from '@react-navigation/native';
import React from 'react';

// Web uses the JS stack (@react-navigation/native-stack has no web support).
// Same { Navigator, Screen } API; headerShown / gestureEnabled are honored.
//
// Web scroll fix: the JS stack's CardContent switches to "page mode"
// (minHeight: 100%) whenever the card fills the viewport, delegating scrolling
// to document.body. That clashes with our full-height flex wrapper tree
// (GestureHandlerRootView → BackgroundScaleProvider's overflow:hidden → drawer):
// the body can never grow, so the page-mode card grows past the clip and the
// in-screen ScrollView (sized to its content) stops being a scroller — nothing
// scrolls. Native doesn't hit this because RN ScrollViews always scroll.
//
// `cardStyle` is merged into the card content style AFTER the page-mode style,
// so flattening `{ flex: 1, minHeight: 0 }` over it cancels the `minHeight: 100%`
// and bounds the card to the screen. The screen's own ScrollView then clamps to
// the viewport and scrolls, matching native behavior. Callers can still override
// `cardStyle` via screenOptions.
const WEB_CARD_STYLE = { flex: 1, minHeight: 0 } as const;

export function createAppStack<T extends ParamListBase>() {
  const Stack = createStackNavigator<T>();
  const OriginalNavigator = Stack.Navigator;

  const Navigator: typeof OriginalNavigator = ({
    screenOptions,
    ...rest
  }: React.ComponentProps<typeof OriginalNavigator>) => {
    // AppNavigator passes an object; merge so our default loses to any explicit
    // caller cardStyle. (Function form is unused here, but pass it through.)
    const mergedScreenOptions =
      typeof screenOptions === 'function'
        ? screenOptions
        : { cardStyle: WEB_CARD_STYLE, ...screenOptions };
    return React.createElement(OriginalNavigator, {
      ...rest,
      screenOptions: mergedScreenOptions,
    });
  };

  return { ...Stack, Navigator } as typeof Stack;
}
