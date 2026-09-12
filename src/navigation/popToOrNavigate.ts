import type { AppStackParamList } from '../types/navigation';

/**
 * The slice of a stack navigation object this helper needs. Structural (not
 * `NavigationProp<AppStackParamList>`) so both the native-stack and the web JS
 * stack prop types satisfy it without a cast at every call site.
 */
export interface StackLikeNavigation {
  getState: () => { routes?: ReadonlyArray<{ name: string }> } | undefined;
}

/**
 * Move to a top-level destination without ever stacking a duplicate of it.
 *
 * Under React Navigation 7 `navigate(name)` no longer pops back to a screen
 * already in the stack — it PUSHES a second copy. On the four `AppNavFooter`
 * tabs that is actively harmful: a second `Home` remounts the recommender and
 * throws away the live deck, and the stack grows on every tab tap. So: pop to
 * the target when it is already below us, push it when it isn't.
 *
 * The loose cast mirrors `AppNavigator.applyPendingScreenIntent` — the target
 * is a runtime value, so the per-route params overload can't be resolved
 * statically. Only no-param routes are reachable here (every `AppNavFooter`
 * destination takes `undefined` params), so nothing is lost by bypassing it.
 */
export const popToOrNavigate = (
  navigation: StackLikeNavigation,
  target: keyof AppStackParamList,
): void => {
  const inStack = navigation
    .getState()
    ?.routes?.some(route => route.name === target);
  const nav = navigation as unknown as {
    popTo: (name: string) => void;
    navigate: (name: string) => void;
  };
  if (inStack) {
    nav.popTo(target as string);
  } else {
    nav.navigate(target as string);
  }
};
