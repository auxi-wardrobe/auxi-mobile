import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MacgieLoader } from '../../components/macgie';
import { MButton } from '../../components/design-system/lib';
import { wardrobeService } from '../../services/wardrobeService';
import { beautifyStep, BEAUTIFY_POLL_MS } from './beautify-status';
import { track } from '../../services/analytics';
import { theme } from '../../theme/theme';
import type { AppStackParamList } from '../../types/navigation';

const MAX_WAIT_MS = 3 * 60 * 1000;

type ScreenNavigation = NativeStackNavigationProp<AppStackParamList>;
type ScreenRoute = RouteProp<AppStackParamList, 'BeautifyPending'>;

export function BeautifyPendingScreen() {
  const nav = useNavigation<ScreenNavigation>();
  const route = useRoute<ScreenRoute>();
  const { itemId, originalUri } = route.params;
  const [elapsed, setElapsed] = useState(0);
  const [failed, setFailed] = useState(false);
  const started = useRef(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearIntervals = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startIntervals = (alive: { current: boolean }) => {
    tickRef.current = setInterval(() => {
      if (alive.current) setElapsed(Date.now() - started.current);
    }, 1000);
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
          nav.replace('BeautifyReview', {
            itemId,
            originalUri,
            from: 'loader',
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
          onPress={() => nav.navigate('Wardrobe')}
        >
          Keep original
        </MButton>
        <MButton
          testID="beautify-pending-retry"
          variant="secondary"
          onPress={async () => {
            setFailed(false);
            started.current = Date.now();
            setElapsed(0);
            try {
              await wardrobeService.beautifyItem(itemId);
              track('beautify_regenerated', { source: 'retry_pending' });
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

  return (
    <View style={styles.container} testID="beautify-pending">
      <Image
        source={{ uri: originalUri }}
        style={styles.photo}
        blurRadius={6}
      />
      <View style={styles.panel}>
        <MacgieLoader variant="inline" testID="beautify-pending-macgie" />
        <Text style={styles.title}>Beautifying ✨</Text>
        <Text style={styles.sub}>{beautifyStep(elapsed)}</Text>
        <Text style={styles.hint}>~30–60s</Text>
      </View>
      <MButton
        testID="beautify-pending-continue"
        variant="secondary"
        onPress={() => {
          track('beautify_wait_continued_browsing');
          nav.navigate('Wardrobe');
        }}
      >
        Continue browsing
      </MButton>
    </View>
  );
}

const styles = StyleSheet.create({
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
  panel: {
    alignItems: 'center',
    gap: theme.spacing.s,
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
  hint: {
    fontSize: 12,
    color: theme.ds.color.warm500,
  },
});
