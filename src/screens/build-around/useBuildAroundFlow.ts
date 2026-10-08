import { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { track } from '../../services/analytics';
import { FLAGS } from '../../services/featureFlags';
import { isBuildAroundSuccess, trendTagProps } from '../../services/buildAroundMatchService';
import type { AppStackParamList } from '../../types/navigation';
import type { BuildAroundSheetMode } from './BuildAroundSheet';
import { useBuildAroundMatch } from './useBuildAroundMatch';

type EmptyReason = 'no_match' | 'no_wardrobe';

/**
 * State machine behind "Build around this" on ItemDetail:
 *
 *   open() ─▶ choose ─ wardrobe ─▶ popTo Home (existing pin + rebuild)
 *                 └─ discovery ─▶ loading ─▶ push BuildAroundMatchResult
 *                                    ├────▶ error ─ retry ─▶ loading
 *                                    ├────▶ empty (no_match / no_wardrobe)
 *                                    └─ cancel ─▶ choose
 *
 * Dismissing the sheet at any point cancels a running search.
 *
 * Gated by `build_around_discovery` (keep OFF in prod until auxi-backend#193
 * — the ba-2 multi-look contract — is deployed):
 * flag OFF → `open()` skips the sheet and runs the wardrobe method directly,
 * i.e. exactly the pre-feature behaviour.
 */
export const useBuildAroundFlow = (itemId: string) => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'ItemDetail'>>();
  const discoveryEnabled = useFeatureFlag(FLAGS.BUILD_AROUND_DISCOVERY);
  const [visible, setVisible] = useState(false);
  const [empty, setEmpty] = useState<EmptyReason | null>(null);

  const anchorIds = useMemo(() => [itemId], [itemId]);
  const run = useBuildAroundMatch(
    anchorIds,
    result => {
      if (isBuildAroundSuccess(result)) {
        setVisible(false);
        navigation.push('BuildAroundMatchResult', { itemId, result });
        return;
      }
      setEmpty(result.state === 'no_wardrobe' ? 'no_wardrobe' : 'no_match');
    },
    'item_detail',
  );
  const { cancel } = run;

  const mode: BuildAroundSheetMode =
    run.status === 'loading'
      ? { kind: 'loading' }
      : run.status === 'error'
        ? { kind: 'error', code: run.errorCode }
        : empty
          ? { kind: 'empty', reason: empty }
          : { kind: 'choose' };

  const dismiss = useCallback(() => {
    cancel();
    setEmpty(null);
    setVisible(false);
  }, [cancel]);

  const buildWithWardrobe = useCallback(() => {
    track('build_around_method_chosen', { item_id: itemId, method: 'wardrobe' });
    setVisible(false);
    // ItemDetail is a native modal: popTo (pop semantics) dismisses it AND lands
    // on Home with the pin intent — navigate() desyncs the modal (see
    // ItemDetailScreen history). Unchanged from the pre-sheet behaviour.
    navigation.popTo('Home', { pinFromDetail: itemId });
  }, [navigation, itemId]);

  const open = useCallback(() => {
    if (!discoveryEnabled) {
      // Flag OFF: original behaviour — no sheet, pin + rebuild on Home.
      navigation.popTo('Home', { pinFromDetail: itemId });
      return;
    }
    track('build_around_sheet_opened', { item_id: itemId });
    setEmpty(null);
    setVisible(true);
  }, [discoveryEnabled, navigation, itemId]);

  const buildFromDiscovery = useCallback(
    (trendTag: string | null) => {
      track('build_around_method_chosen', {
        item_id: itemId,
        method: 'discovery',
        ...trendTagProps(trendTag),
      });
      setEmpty(null);
      run.start(trendTag ? [trendTag] : []);
    },
    [itemId, run],
  );

  // Cancelling the search returns to the choice, not out of the sheet.
  const cancelLoading = useCallback(() => cancel(), [cancel]);

  return {
    sheetProps: {
      visible,
      mode,
      onDismiss: dismiss,
      onBuildWithWardrobe: buildWithWardrobe,
      onBuildFromDiscovery: buildFromDiscovery,
      onCancelLoading: cancelLoading,
      onRetry: run.retry,
      onBackToChoice: () => setEmpty(null),
    },
    open,
  };
};
