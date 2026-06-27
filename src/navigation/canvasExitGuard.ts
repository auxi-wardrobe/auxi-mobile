// Module-singleton guard for leaving the Outfit Canvas with unsaved changes.
//
// Mirrors `navigationRef`'s pattern: a single shared hook reachable both from
// inside the navigator (the canvas screen, which registers the guard) and from
// outside it (SidebarMenu renders in RootDrawer, beyond the NavigationContainer,
// and navigates via the same module-level refs).
//
// `beforeRemove` only fires when the canvas is REMOVED from the stack (back
// chevron, hardware back, a sidebar "Home" that pops). Affordances that leave
// the canvas by PUSHING another screen on top (the My Creations icon, sidebar
// destinations not already in the stack) never trigger `beforeRemove`, so they
// route through this guard instead to get the same "Discard this creation?"
// confirmation.
//
// CONTRACT — single registrant, last-writer-wins. This module holds ONE guard
// slot, so it assumes at most one screen is registered at a time. The canvas
// upholds that by registering only while focused + dirty and clearing on
// blur/unmount (focus-gated `useFocusEffect` in OutfitCanvasScreen). If a second
// canvas-like screen ever needs a guard, this must become a stack/keyed registry
// — a bare second `setCanvasExitGuard` would silently clobber the first.

type ExitProceed = () => void;
type ExitGuard = (proceed: ExitProceed) => void;

let guard: ExitGuard | null = null;

/** The canvas registers a guard while it has unsaved changes, and clears it
 *  (passes null) once saved/clean or on unmount. */
export const setCanvasExitGuard = (next: ExitGuard | null): void => {
  guard = next;
};

/** Exit affordances call this instead of navigating directly. With a guard
 *  registered it intercepts (shows the discard sheet, replays `proceed` on
 *  confirm); with none it runs `proceed` immediately. */
export const requestCanvasExit = (proceed: ExitProceed): void => {
  if (guard) {
    guard(proceed);
  } else {
    proceed();
  }
};
