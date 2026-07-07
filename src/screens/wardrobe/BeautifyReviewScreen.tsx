import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { wardrobeService, wardrobeKeys } from '../../services/wardrobeService';
import { MButton } from '../../components/design-system/lib';
import { track } from '../../services/analytics';
import { theme } from '../../theme/theme';
import type { AppStackParamList } from '../../types/navigation';

const REGEN_CAP = 5;

type ScreenNavigation = NativeStackNavigationProp<AppStackParamList>;
type ScreenRoute = RouteProp<AppStackParamList, 'BeautifyReview'>;

export function BeautifyReviewScreen() {
  const nav = useNavigation<ScreenNavigation>();
  const route = useRoute<ScreenRoute>();
  const qc = useQueryClient();
  const { itemId, originalUri } = route.params;
  const [candidate, setCandidate] = useState<string | undefined>();
  const [attempts, setAttempts] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    track('beautify_review_opened', { from: route.params.from ?? 'loader' });
    wardrobeService
      .getBeautifyStatus(itemId)
      .then(s => {
        setCandidate(s.candidate_url);
        setAttempts(s.attempts);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  const done = () => {
    qc.invalidateQueries({ queryKey: wardrobeKeys.all });
    nav.navigate('Wardrobe');
  };

  const onAccept = async () => {
    setBusy(true);
    try {
      await wardrobeService.acceptBeautify(itemId);
      track('beautify_accepted');
      done();
    } catch {
      setBusy(false);
    }
  };

  const onKeep = async () => {
    setBusy(true);
    try {
      await wardrobeService.discardBeautify(itemId);
      track('beautify_kept_original');
      done();
    } catch {
      setBusy(false);
    }
  };

  const onRegenerate = async () => {
    setBusy(true);
    try {
      await wardrobeService.beautifyItem(itemId);
      track('beautify_regenerated', { source: 'review', attempt: attempts + 1 });
      nav.replace('BeautifyPending', { itemId, originalUri });
    } catch {
      setBusy(false); // cap hit (409) or network — stay on review
    }
  };

  const atCap = attempts >= REGEN_CAP;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      testID="beautify-review"
    >
      <Text style={styles.title}>Studio shot ready ✨</Text>
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Before</Text>
          <Image source={{ uri: originalUri }} style={styles.img} />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>After</Text>
          {candidate ? (
            <Image source={{ uri: candidate }} style={styles.img} />
          ) : (
            <View style={styles.img}>
              <ActivityIndicator />
            </View>
          )}
        </View>
      </View>
      <MButton
        testID="beautify-review-accept"
        variant="primary"
        disabled={busy}
        onPress={onAccept}
      >
        Accept & save
      </MButton>
      <MButton
        testID="beautify-review-regenerate"
        variant="secondary"
        disabled={busy || atCap}
        onPress={onRegenerate}
      >
        {atCap ? 'Keep the best one' : 'Regenerate'}
      </MButton>
      <MButton
        testID="beautify-review-keep-original"
        variant="text"
        disabled={busy}
        onPress={onKeep}
      >
        Keep original
      </MButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flexGrow: 1,
    padding: theme.spacing.l,
    gap: theme.spacing.m,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.ds.color.ink,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.m,
  },
  col: {
    flex: 1,
    gap: theme.spacing.s,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: theme.ds.color.warm500,
  },
  img: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: theme.ds.radius.sm,
    backgroundColor: theme.ds.color.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
