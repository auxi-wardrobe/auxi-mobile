import { useCallback, useEffect, useRef } from 'react';
import type { ScrollView } from 'react-native';

/**
 * The Discovery cover is tall, so each Make It Yours state (loading → result)
 * would land below the fold. Scroll to the end once the NEW panel has laid out
 * (content size change) — scrolling on the state change itself would target
 * the previous panel's end.
 */
export const useRevealPanelScroll = (panelKind: string) => {
  const scrollRef = useRef<ScrollView>(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    pendingRef.current = panelKind !== 'idle';
  }, [panelKind]);

  const onContentSizeChange = useCallback(() => {
    if (!pendingRef.current) return;
    pendingRef.current = false;
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  return { scrollRef, onContentSizeChange };
};
