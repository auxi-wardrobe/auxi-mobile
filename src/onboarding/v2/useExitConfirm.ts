import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useNavigation,
  type NavigationAction,
} from '@react-navigation/native';

/**
 * Guard an in-progress flow against accidental exit.
 *
 * While `enabled`, any attempt to leave the screen (header back, swipe-back,
 * Android hardware back — they all dispatch through `beforeRemove`) is
 * intercepted and surfaces a confirm dialog instead. The retake flow uses this
 * so leaving mid-edit prompts "Discard your changes?".
 *
 * `leave` lets a caller customise WHERE confirming sends the user (the default
 * just re-dispatches the original navigation action). Pass `allowLeave()`
 * before a programmatic, intentional exit (e.g. after Save) so it isn't blocked.
 */
export const useExitConfirm = (
  enabled: boolean,
  leave?: (dispatchPending: () => void) => void,
) => {
  const navigation = useNavigation();
  const [visible, setVisible] = useState(false);
  const pendingRef = useRef<NavigationAction | null>(null);
  const allowRef = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;
    const unsubscribe = navigation.addListener('beforeRemove', event => {
      if (allowRef.current) return;
      event.preventDefault();
      pendingRef.current = event.data.action;
      setVisible(true);
    });
    return unsubscribe;
  }, [enabled, navigation]);

  const onCancel = useCallback(() => setVisible(false), []);

  const onConfirm = useCallback(() => {
    allowRef.current = true;
    setVisible(false);
    const dispatchPending = () => {
      if (pendingRef.current) {
        navigation.dispatch(pendingRef.current);
      }
    };
    if (leave) {
      leave(dispatchPending);
    } else {
      dispatchPending();
    }
  }, [leave, navigation]);

  // Open the bypass gate for an intentional, non-discard exit (e.g. Save).
  const allowLeave = useCallback(() => {
    allowRef.current = true;
  }, []);

  return { visible, onCancel, onConfirm, allowLeave };
};
