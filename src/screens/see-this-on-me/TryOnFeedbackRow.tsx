/**
 * Thumbs up / down vote overlaid on a rendered try-on photo (Figma
 * `4814:13242` / `4814:13237`): two 32×32 white round buttons, 4px apart,
 * pinned bottom-center of the image frame.
 *
 * Shared by every surface that shows a finished "See on me" photo — the
 * See-this-on-me preview (`OutfitPreview`) and the Favourite card's try-on
 * hero — so the control looks and behaves identically on both. Vote state and
 * posting live in `useTryOnFeedback` (single-choice, optimistic,
 * fire-and-forget); this component is presentation only.
 *
 * `testIDStem` namespaces the selectors per surface (`stom-feedback` on the
 * preview, `favourite-card-<id>-feedback` on a saved outfit) so Maestro can
 * tell them apart. Per the testID convention the selected state FLIPS the
 * suffix (`-like` ↔ `-like-selected`) instead of dropping the testID.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { useTryOnFeedback } from './useTryOnFeedback';

interface TryOnFeedbackRowProps {
  /** The render job id backing the vote (null on a cached/rehydrated result
   *  with no live job — the vote still updates locally, see the hook). */
  jobId?: string | null;
  resultUrl: string;
  outfitHash?: string;
  /** Selector stem, e.g. `stom-feedback` → `stom-feedback-like`. */
  testIDStem: string;
}

export const TryOnFeedbackRow: React.FC<TryOnFeedbackRowProps> = ({
  jobId = null,
  resultUrl,
  outfitHash = '',
  testIDStem,
}) => {
  const { t } = useTranslation();
  const { vote, onLike, onDislike } = useTryOnFeedback({
    jobId,
    resultUrl,
    outfitHash,
  });

  return (
    <View style={styles.row} testID={`${testIDStem}-row`}>
      <TouchableOpacity
        testID={vote === 'up' ? `${testIDStem}-like-selected` : `${testIDStem}-like`}
        accessibilityRole="button"
        accessibilityLabel={t('seeThisOnMe.feedback.like')}
        accessibilityState={{ selected: vote === 'up' }}
        activeOpacity={0.8}
        style={[styles.button, vote === 'up' && styles.buttonSelected]}
        onPress={onLike}
      >
        <Icons.ThumbUp
          width={24}
          height={24}
          color={vote === 'up' ? theme.colors.white : theme.colors.uacTextBase}
        />
      </TouchableOpacity>
      <TouchableOpacity
        testID={
          vote === 'down' ? `${testIDStem}-dislike-selected` : `${testIDStem}-dislike`
        }
        accessibilityRole="button"
        accessibilityLabel={t('seeThisOnMe.feedback.dislike')}
        accessibilityState={{ selected: vote === 'down' }}
        activeOpacity={0.8}
        style={[styles.button, vote === 'down' && styles.buttonSelected]}
        onPress={onDislike}
      >
        <Icons.ThumbDown
          width={24}
          height={24}
          color={vote === 'down' ? theme.colors.white : theme.colors.uacTextBase}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    bottom: theme.spacing.m,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.ds.shadow.thumbButton,
  },
  buttonSelected: {
    backgroundColor: theme.colors.figmaAction,
  },
});
