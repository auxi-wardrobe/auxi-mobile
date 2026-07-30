import React, { useEffect, useRef, useState } from 'react';
import { Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MButton } from '../../components/design-system/lib';
import { AiLoadingSteps } from '../../components/features/AiLoadingSteps';
import { wardrobeService } from '../../services/wardrobeService';
import {
  BEAUTIFY_POLL_MS,
  goToWardrobe,
  markItemBeautifying,
} from './beautify-status';
import { track } from '../../services/analytics';
import { theme } from '../../theme/theme';
import type { AppStackParamList } from '../../types/navigation';

const MAX_WAIT_MS = 3 * 60 * 1000;

// The upload-time wait is the same beautify job the on-demand Enhance flow
// runs, so it says the same three things while it works.
const ENHANCE_ROW_KEYS = [
  'wardrobe.enhance.loading_rows.0',
  'wardrobe.enhance.loading_rows.1',
  'wardrobe.enhance.loading_rows.2',
] as const;

type ScreenNavigation = NativeStackNavigationProp<AppStackParamList>;
type ScreenRoute = RouteProp<AppStackParamList, 'BeautifyPending'>;

export function BeautifyPendingScreen() {
  const nav = useNavigation<ScreenNavigation>();
  const route = useRoute<ScreenRoute>();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { itemId, originalUri } = route.params;
  const [failed, setFailed] = useState(false);
  const started = useRef(Date.now());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearIntervals = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // The progress copy is on the shared loading body's own 2s cadence now, so
  // this screen only needs the status poll — no elapsed-time tick.
  const startIntervals = (alive: { current: boolean }) => {
    pollRef.current = setInterval(async () => {
      if (!alive.current) return;
      if (Date.now() - started.current > MAX_WAIT_MS) {
        clearIntervals();
        setFailed(true);
        return;
      }
      try {
        const s = await wardrobeService.getBeautifyStatus(itemId);
        if (!alive.current) return;
        if (s.status === 'ready') {
          track('beautify_ready');
          // The upload-time wait ends on the same Enhance result screen every
          // other entry point uses. `origin: 'wardrobe'` because there is no
          // ItemDetail under this stack to pop back to.
          nav.replace('EnhanceImage', {
            itemId,
            displayUri: originalUri,
            origin: 'wardrobe',
          });
        } else if (s.status === 'failed') {
          clearIntervals();
          setFailed(true);
        }
      } catch {
        // keep polling
      }
    }, BEAUTIFY_POLL_MS);
  };

  useEffect(() => {
    const alive = { current: true };
    startIntervals(alive);
    return () => {
      alive.current = false;
      clearIntervals();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, nav, originalUri]);

  if (failed) {
    return (
      <View style={styles.container} testID="beautify-pending-failed">
        <Image source={{ uri: originalUri }} style={styles.photo} />
        <Text style={styles.title}>Couldn't beautify this one</Text>
        <Text style={styles.sub}>
          Your item is saved with its background removed.
        </Text>
        <MButton
          testID="beautify-pending-keep"
          variant="primary"
          onPress={() => goToWardrobe(nav)}
        >
          Keep original
        </MButton>
        <MButton
          testID="beautify-pending-retry"
          variant="secondary"
          onPress={async () => {
            setFailed(false);
            started.current = Date.now();
            try {
              await wardrobeService.beautifyItem(itemId);
              track('beautify_regenerated', { source: 'retry_pending' });
              markItemBeautifying(queryClient, itemId);
            } catch {
              // ignore — server-side cap or network; UI already reset
            }
            const alive = { current: true };
            startIntervals(alive);
          }}
        >
          Try again
        </MButton>
      </View>
    );
  }

  // Same wait, same screen as the on-demand Enhance flow and see-on-me: the
  // shared AiLoadingSteps body, with the enhance copy (it IS the same beautify
  // job — this is just the upload-time entry into it).
  return (
    <SafeAreaView style={styles.loadingContainer} testID="beautify-pending">
      <AiLoadingSteps
        headline={t('wardrobe.enhance.loading_headline')}
        rows={ENHANCE_ROW_KEYS.map(key => t(key))}
        footerText={t('wardrobe.enhance.loading_note')}
        ctaLabel={t('wardrobe.enhance.leave_notify')}
        onCta={() => {
          track('beautify_wait_continued_browsing');
          goToWardrobe(nav);
        }}
        // This screen has no header and no back gesture (AppNavigator:
        // headerShown/gestureEnabled false), so the CTA is the only way out —
        // it can't sit behind the usual min-wait gate.
        ctaGated={false}
        testID="beautify-pending-steps"
        ctaTestID="beautify-pending-continue"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // The waiting state is the shared AiLoadingSteps body — this screen only
  // supplies the safe-area frame around it.
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.l,
    gap: theme.spacing.m,
    backgroundColor: theme.colors.background,
  },
  photo: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.15,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.ds.color.ink,
  },
  sub: {
    fontSize: 14,
    color: theme.ds.color.warm500,
  },
});
