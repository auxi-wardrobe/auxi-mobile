import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { track } from '../../services/analytics';
import type { BuildAroundStyle } from '../../services/buildAroundMatchService';
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
 */
export const useBuildAroundFlow = (itemId: string) => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'ItemDetail'>>();
  const [visible, setVisible] = useState(false);
  const [empty, setEmpty] = useState<EmptyReason | null>(null);

  const run = useBuildAroundMatch(itemId, result => {
    if (result.state === 'success') {
      setVisible(false);
      navigation.push('BuildAroundMatchResult', { itemId, result });
      return;
    }
    setEmpty(result.state === 'no_wardrobe' ? 'no_wardrobe' : 'no_match');
  });
  const { cancel } = run;

  const mode: BuildAroundSheetMode =
    run.status === 'loading'
      ? { kind: 'loading' }
      : run.status === 'error'
        ? { kind: 'error', code: run.errorCode }
        : empty
          ? { kind: 'empty', reason: empty }
          : { kind: 'choose' };

  const open = useCallback(() => {
    track('build_around_sheet_opened', { item_id: itemId });
    setEmpty(null);
    setVisible(true);
  }, [itemId]);

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

  const buildFromDiscovery = useCallback(
    (style: BuildAroundStyle) => {
      track('build_around_method_chosen', { item_id: itemId, method: 'discovery', style });
      setEmpty(null);
      run.start(style);
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
