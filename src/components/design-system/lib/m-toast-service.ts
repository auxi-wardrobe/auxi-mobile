/**
 * m-toast-service — framework-free imperative toast singleton.
 *
 *   import { toast } from '../components/design-system/lib';
 *   toast.success('Saved');
 *   toast.show({ type: 'error', text1: 'Oops', text2: 'Try again' });
 *
 * On-system replacement for `react-native-toast-message`'s `Toast.show`. NO
 * React import here so non-component callers (AuthContext, try-on notices) can
 * fire a toast. A tiny event emitter holds the single active toast + an
 * auto-increment id; `MToastHost` subscribes and renders it.
 *
 * Queue policy = REPLACE (most-recent wins) — mirrors the old lib, KISS, no
 * multi-stack.
 */

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastOptions {
  /** Tone accent + a11y semantics. Default 'info'. */
  type?: ToastTone;
  /** Title (required). */
  text1: string;
  /** Optional body line. */
  text2?: string;
  /** Default 'bottom'. */
  position?: 'top' | 'bottom';
  /** Auto-dismiss ms. `0`/undefined → default 4000. */
  visibilityTime?: number;
  /** Tap action (e.g. undo). Host fires it then auto-hides. */
  onPress?: () => void;
  /**
   * VoiceOver hint announced for ACTION toasts (those with `onPress`) — mirrors
   * MSnackbar's labeled action so the user hears what activating it does (e.g.
   * "Undo the reset"). Ignored when there is no `onPress` (a non-actionable
   * toast must not announce as a button). Optional.
   */
  accessibilityHint?: string;
  /** testID pass-through → `<testID>` on the surface, `<testID>-action` on tap. */
  testID?: string;
}

/** The resolved toast the host renders (defaults filled in). */
export interface ActiveToast extends ToastOptions {
  id: string;
  type: ToastTone;
  position: 'top' | 'bottom';
  visibilityTime: number;
}

type Listener = (active: ActiveToast | null) => void;

const DEFAULT_VISIBILITY_MS = 4000;

let current: ActiveToast | null = null;
let counter = 0;
const listeners = new Set<Listener>();

const emit = (): void => {
  listeners.forEach(listener => listener(current));
};

/**
 * Host hook: subscribe to the active toast. Fires immediately with the current
 * value so a freshly-mounted host catches an in-flight toast. Returns an
 * unsubscribe.
 */
export const subscribeToast = (listener: Listener): (() => void) => {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
};

const show = (opts: ToastOptions): string => {
  counter += 1;
  const id = `toast-${counter}`;
  current = {
    ...opts,
    id,
    type: opts.type ?? 'info',
    position: opts.position ?? 'bottom',
    visibilityTime:
      opts.visibilityTime && opts.visibilityTime > 0
        ? opts.visibilityTime
        : DEFAULT_VISIBILITY_MS,
  };
  emit();
  return id;
};

const hide = (id?: string): void => {
  if (!current) return;
  // No id → hide whatever is active. With an id, only hide if it still matches
  // (a newer toast may have replaced it).
  if (id && current.id !== id) return;
  current = null;
  emit();
};

const withTone = (
  tone: ToastTone,
  text1: string,
  opts?: Partial<ToastOptions>,
): string => show({ ...opts, type: tone, text1 });

/**
 * Imperative toast API (drop-in for `react-native-toast-message`'s `Toast`).
 *
 * Z-ORDER CAVEAT: `MToastHost` is a root overlay rendered in the normal view
 * tree, so it sits BELOW a native `<Modal>` (and native date/time pickers). A
 * toast fired while a native modal/sheet is still up renders behind it. Callers
 * inside a modal should DEFER the toast until after the modal dismisses — see
 * `screens/schedule/useScheduleAddedToast.ts`, which waits out the sheet's
 * dismissal animation before calling `toast.show`.
 */
export const toast = {
  show,
  hide,
  success: (text1: string, opts?: Partial<ToastOptions>): string =>
    withTone('success', text1, opts),
  error: (text1: string, opts?: Partial<ToastOptions>): string =>
    withTone('error', text1, opts),
  info: (text1: string, opts?: Partial<ToastOptions>): string =>
    withTone('info', text1, opts),
};
