// useAiConsentGate — App Store blocker B1 (Guideline 5.1.1/5.1.2).
//
// Wraps an AI photo-upload action behind explicit, persisted consent. Both
// try-on photo-upload call sites (BodyScreen try-on + the "See this on me"
// generation flow) route through this hook so the gate logic lives in ONE
// place (DRY).
//
// Usage:
//   const consentGate = useAiConsentGate();
//   const onPress = () => consentGate.run(() => actuallyGenerate());
//   // render <AiConsentDialog {...consentGate.dialogProps} /> in the tree.
//
// run(): if consent is already granted → invoke the action immediately. If not
// → open the consent dialog and stash the action; Accept grants + runs it,
// Decline persists the decline and drops it (the app stays usable).

import { useCallback, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../types/navigation';
import {
  declineAiDataSharingConsent,
  grantAiDataSharingConsent,
  hasAiDataSharingConsent,
} from '../services/aiConsent';

type GateNavigation = NativeStackNavigationProp<AppStackParamList>;

export interface AiConsentGate {
  /**
   * Run `action` only if AI data-sharing consent is granted. Otherwise prompt;
   * Accept grants + runs, Decline aborts. `action` may be async — errors are
   * the caller's to handle (run() does not await it).
   */
  run: (action: () => void) => void;
  /** Spread onto <AiConsentDialog />. */
  dialogProps: {
    visible: boolean;
    onAccept: () => void;
    onDecline: () => void;
    onOpenPrivacyPolicy: () => void;
  };
}

export const useAiConsentGate = (): AiConsentGate => {
  const navigation = useNavigation<GateNavigation>();
  const [visible, setVisible] = useState(false);
  // The action awaiting a consent decision. Held in a ref so re-renders don't
  // drop it and Accept/Decline read the latest.
  const pendingActionRef = useRef<(() => void) | null>(null);

  const run = useCallback((action: () => void) => {
    hasAiDataSharingConsent().then(granted => {
      if (granted) {
        action();
        return;
      }
      pendingActionRef.current = action;
      setVisible(true);
    });
  }, []);

  const onAccept = useCallback(() => {
    setVisible(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    grantAiDataSharingConsent()
      .then(() => action?.())
      .catch(() => {
        /* persist failure is non-fatal — do NOT run the action without a
           recorded consent; the user can retry. */
      });
  }, []);

  const onDecline = useCallback(() => {
    setVisible(false);
    pendingActionRef.current = null;
    // Fire-and-forget: declining must never block the UI.
    declineAiDataSharingConsent().catch(() => {});
  }, []);

  const onOpenPrivacyPolicy = useCallback(() => {
    navigation.navigate('LegalDocument', {
      documentType: 'privacy',
      source: 'settings',
    });
  }, [navigation]);

  return {
    run,
    dialogProps: { visible, onAccept, onDecline, onOpenPrivacyPolicy },
  };
};
