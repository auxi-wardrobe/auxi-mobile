import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MacgieLoader } from '../../components/macgie';
import { MButton } from '../../components/design-system/lib';
import { wardrobeService } from '../../services/wardrobeService';
import { beautifyStep, BEAUTIFY_POLL_MS } from './beautify-status';
import { track } from '../../services/analytics';
import { theme } from '../../theme/theme';

const MAX_WAIT_MS = 3 * 60 * 1000;

export function BeautifyPendingScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { itemId, originalUri } = route.params;
  const [elapsed, setElapsed] = useState(0);
  const [failed, setFailed] = useState(false);
  const started = useRef(Date.now());

  useEffect(() => {
    let alive = true;
    const tick = setInterval(() => {
      if (alive) setElapsed(Date.now() - started.current);
    }, 1000);
    const poll = setInterval(async () => {
      if (!alive) return;
      if (Date.now() - started.current > MAX_WAIT_MS) {
        setFailed(true);
        return;
      }
      try {
        const s = await wardrobeService.getBeautifyStatus(itemId);
        if (!alive) return;
        if (s.status === 'ready') {
          track('beautify_ready');
          nav.replace('BeautifyReview', { itemId, originalUri, from: 'loader' });
        } else if (s.status === 'failed') {
          setFailed(true);
        }
      } catch {
        // keep polling
      }
    }, BEAUTIFY_POLL_MS);
    return () => {
      alive = false;
      clearInterval(tick);
      clearInterval(poll);
    };
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
              track('beautify_regenerated', { attempt: 'retry' });
            } catch {
              // ignore — server-side cap or network; UI already reset
            }
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
