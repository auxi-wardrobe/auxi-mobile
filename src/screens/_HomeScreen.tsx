import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
  // PermissionsAndroid,
  // Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
// import Geolocation from 'react-native-geolocation-service';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { Sidebar } from '../components/layout/Sidebar';
import {
  ContextChipId,
  ContextChipOption,
  ContextChipsModal,
} from '../components/features/ContextChipsModal';
import { ItemDetailBottomSheet } from '../components/features/ItemDetailBottomSheet';
import { PillButton, TopIconButton } from '../components/primitives/FigmaPrimitives';
import { Icons } from '../assets/icons';
import { theme } from '../theme/theme';
import { Item } from '../types/item';
import { AppStackParamList, TryOnOutfitContext } from '../types/navigation';
import { favouriteService } from '../services/favouriteService';
import {
  NextRecommendationParams,
  Outfit,
  recommendationService,
} from '../services/recommendationService';
import { getImageUrl } from '../utils/url';

const { width: screenWidth } = Dimensions.get('window');

const GRID_GAP = 4;
const SHEET_GAP = 4;
const SHEET_PADDING = 12;
const OPTION_ACTIONS_HEIGHT = 188;
const CARD_WIDTH = Math.floor((screenWidth - SHEET_PADDING * 2 - GRID_GAP) / 2);
const OPTION_SHEET_HEIGHT = Math.round(CARD_WIDTH * (8 / 3) + OPTION_ACTIONS_HEIGHT);
const OPTION_SHEET_SNAP_INTERVAL = OPTION_SHEET_HEIGHT + SHEET_GAP;
const SNACKBAR_DURATION_MS = 2200;
// const MAX_DUPLICATE_PREFETCH_RETRIES = 3;

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Home'>;

type OutfitSheet = {
  items: Item[];
  outfitHash: string;
  stylingNote: string;
};

type OutfitSheetWithGrid = OutfitSheet & {
  gridItems: Array<Item | null>;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const buildGrid = (items: Item[]): Array<Item | null> =>
  Array.from({ length: 4 }, (_, index) => items[index] || null);

// const buildOutfitSheet = (outfit: Outfit): OutfitSheet => ({
//   items: outfit.items || [],
//   outfitHash: outfit.outfit_hash,
//   stylingNote: outfit.styling_note || '',
// });

const buildGridOutfitSheet = (outfit: OutfitSheet): OutfitSheetWithGrid => ({
  ...outfit,
  gridItems: buildGrid(outfit.items),
});

const buildTryOnContext = (outfit: OutfitSheet): TryOnOutfitContext => ({
  outfitHash: outfit.outfitHash,
  itemIds: outfit.items.map((item) => item.id),
  itemImageUrls: outfit.items.map((item) => item.image_url),
  stylingNote: outfit.stylingNote,
});

const getSaveStateForOutfit = (
  outfit: OutfitSheet | null,
  saveStates: Record<string, SaveState>,
): SaveState => (outfit ? saveStates[outfit.outfitHash] || 'idle' : 'idle');

const getSheetIndexFromOffset = (offsetY: number) =>
  Math.round(offsetY / OPTION_SHEET_SNAP_INTERVAL);

const clearTimeoutRef = (
  timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
) => {
  if (!timeoutRef.current) {
    return;
  }

  clearTimeout(timeoutRef.current);
  timeoutRef.current = null;
};

const CONTEXT_CHIP_SETS: ContextChipOption[][] = [
  [
    { id: 'more_relaxed', label: 'More relaxed' },
    { id: 'different_vibe', label: 'Different vibe' },
  ],
  [
    { id: 'more_polished', label: 'More polished' },
    { id: 'more_casual', label: 'More casual' },
  ],
  [
    { id: 'bolder_choice', label: 'Bolder choice' },
    { id: 'simpler_look', label: 'Simpler look' },
  ],
];

const CONTEXT_CHIP_PAYLOADS: Record<
  ContextChipId,
  Pick<NextRecommendationParams, 'style_feedback' | 'force_variation_axis'>
> = {
  more_relaxed: {
    style_feedback: 'Make it feel more relaxed and easy to wear.',
  },
  different_vibe: {
    style_feedback: 'Show me a distinctly different style direction that still feels wearable.',
    force_variation_axis: 'NEW_ANCHOR',
  },
  more_polished: {
    style_feedback: 'Make it look more polished and put together.',
  },
  more_casual: {
    style_feedback: 'Make it more casual and effortless.',
  },
  bolder_choice: {
    style_feedback: 'Make it bolder and more expressive.',
  },
  simpler_look: {
    style_feedback: 'Make it simpler, cleaner, and less busy.',
  },
};

export const HomeScreen = () => {
  const navigation = useNavigation<Navigation>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // const [outfitSheets, setOutfitSheets] = useState<OutfitSheet[]>([]);
  // const [recommendationSessionId, setRecommendationSessionId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [visibleSheetIndex, setVisibleSheetIndex] = useState(0);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  // const [prefetchRetryTick, setPrefetchRetryTick] = useState(0);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [contextSuggestionSetIndex, setContextSuggestionSetIndex] = useState(0);
  const [selectedContextChipId, setSelectedContextChipId] = useState<ContextChipId | null>(null);
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [customContextText, setCustomContextText] = useState('');
  const requestedNextFromHashesRef = useRef(new Set<string>());
  // const duplicatePrefetchCountsRef = useRef<Record<string, number>>({});
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [listOutfits, setListOutfits] = useState<any[]>([]);

  const showSnackbar = useCallback((message: string) => {
    clearTimeoutRef(snackbarTimeoutRef);
    setSnackbarMessage(message);
    snackbarTimeoutRef.current = setTimeout(() => {
      setSnackbarMessage(null);
      clearTimeoutRef(snackbarTimeoutRef);
    }, SNACKBAR_DURATION_MS);
  }, []);

  const resetContextDraft = useCallback(() => {
    setContextSuggestionSetIndex(0);
    setSelectedContextChipId(null);
    setIsEditingContext(false);
    setCustomContextText('');
  }, []);

  const closeContextModal = useCallback(() => {
    Keyboard.dismiss();
    setIsContextModalOpen(false);
    resetContextDraft();
  }, [resetContextDraft]);

  // const { mutate: startRecommendation, isPending: isStartPending } = useMutation({
  //   mutationFn: recommendationService.startRecommendation,
  //   onSuccess: (data) => {
  //     if (!data?.outfit) {
  //       return;
  //     }

  //     setOutfitSheets([buildOutfitSheet(data.outfit)]);
  //     setRecommendationSessionId(data.session_id || null);
  //     setVisibleSheetIndex(0);
  //     requestedNextFromHashesRef.current.clear();
  //     duplicatePrefetchCountsRef.current = {};
  //   },
  //   onError: (error) => {
  //     console.error('Failed to load recommendation', error);
  //   },
  // });


  const { mutate: valenGetRecommendation, isPending: isStartPending } = useMutation({
    mutationFn: recommendationService.valenGetRecommendation,
    onSuccess: (data) => {
      // if (!data?.outfit) {
      //   return;
      // }
      setListOutfits(data)

      // setOutfitSheets([buildOutfitSheet(data.outfit)]);
      // setRecommendationSessionId(data.session_id || null);
      // setVisibleSheetIndex(0);
      // requestedNextFromHashesRef.current.clear();
      // duplicatePrefetchCountsRef.current = {};
    },
    onError: (error) => {
      console.error('Failed to load recommendation', error);
    },
  });

  // const { mutate: nextRecommendation, isPending: isNextPending } = useMutation({
  //   mutationFn: recommendationService.nextRecommendation,
  //   onSuccess: (data, variables) => {
  //     if (!data?.outfit) {
  //       return;
  //     }

  //     const requestedFromHash = variables.current_outfit_hash;
  //     const nextOutfitSheet = buildOutfitSheet(data.outfit);
  //     const isDuplicateOutfit = outfitSheets.some(
  //       (sheet) => sheet.outfitHash === nextOutfitSheet.outfitHash,
  //     );

  //     if (data.session_id) {
  //       setRecommendationSessionId(data.session_id);
  //     }

  //     if (!isDuplicateOutfit) {
  //       setOutfitSheets((currentSheets) => [...currentSheets, nextOutfitSheet]);
  //       delete duplicatePrefetchCountsRef.current[requestedFromHash];
  //       return;
  //     }

  //     const duplicateCount = duplicatePrefetchCountsRef.current[requestedFromHash] || 0;

  //     if (duplicateCount >= MAX_DUPLICATE_PREFETCH_RETRIES) {
  //       return;
  //     }

  //     duplicatePrefetchCountsRef.current[requestedFromHash] = duplicateCount + 1;
  //     requestedNextFromHashesRef.current.delete(requestedFromHash);
  //     setPrefetchRetryTick((currentTick) => currentTick + 1);
  //   },
  //   onError: (error, variables) => {
  //     if (variables?.current_outfit_hash) {
  //       requestedNextFromHashesRef.current.delete(variables.current_outfit_hash);
  //     }
  //     console.error('Failed to fetch more options', error);
  //   },
  // });

  // const { mutate: submitContextRecommendation, isPending: isContextSubmitting } = useMutation({
  //   mutationFn: recommendationService.nextRecommendation,
  //   onSuccess: (data, variables) => {
  //     if (!data?.outfit) {
  //       showSnackbar(data?.message || 'No more unique variations available.');
  //       closeContextModal();
  //       return;
  //     }

  //     if (data.outfit.outfit_hash === variables.current_outfit_hash) {
  //       showSnackbar('No new variation found. Try another suggestion.');
  //       closeContextModal();
  //       return;
  //     }

  //     setOutfitSheets([buildOutfitSheet(data.outfit)]);
  //     setVisibleSheetIndex(0);
  //     requestedNextFromHashesRef.current.clear();
  //     duplicatePrefetchCountsRef.current = {};

  //     if (data.session_id) {
  //       setRecommendationSessionId(data.session_id);
  //     }

  //     closeContextModal();
  //   },
  //   onError: (error) => {
  //     showSnackbar('Unable to update this look right now. Please try again.');
  //     console.error('Failed to apply context', error);
  //   },
  // });

  const { mutate: saveFavourite } = useMutation({
    mutationFn: favouriteService.saveFavourite,
    onSuccess: (_, variables) => {
      setSaveStates((currentState) => ({
        ...currentState,
        [variables.outfit_hash]: 'saved',
      }));
      showSnackbar('This look is now saved to your favourite');
    },
    onError: (error, variables) => {
      setSaveStates((currentState) => ({
        ...currentState,
        [variables.outfit_hash]: 'error',
      }));
      console.error('Failed to save favourite', error);
    },
  });

  // useEffect(() => {
  //   const fetchLocationAndStart = async () => {
  //     let hasPermission = false;

  //     if (Platform.OS === 'ios') {
  //       const auth = await Geolocation.requestAuthorization('whenInUse');
  //       hasPermission = auth === 'granted';
  //     } else if (Platform.OS === 'android') {
  //       const granted = await PermissionsAndroid.request(
  //         PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  //       );
  //       hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
  //     }

  //     if (hasPermission) {
  //       Geolocation.getCurrentPosition(
  //         (position) => {
  //           startRecommendation({
  //             weather: {
  //               lat: position.coords.latitude,
  //               long: position.coords.longitude,
  //               temp_c: 22,
  //             },
  //           });
  //         },
  //         (error) => {
  //           console.warn('Geolocation error:', error.code, error.message);
  //           startRecommendation({ weather: { temp_c: 22 } });
  //         },
  //         { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
  //       );
  //     } else {
  //       startRecommendation({ weather: { temp_c: 22 } });
  //     }
  //   };

  //   fetchLocationAndStart();
  // }, [startRecommendation]);

  useEffect(() => {
    valenGetRecommendation({});
  }, [valenGetRecommendation]);

  // const requestNextIfNeeded = useCallback((sheetIndex: number) => {
  //   const currentLastIndex = outfitSheets.length - 1;
  //   // Prefetch next outfit when user is 1 outfit away from the end (like "try another")
  //   const hasReachedPrefetchThreshold = currentLastIndex >= 0 && sheetIndex >= currentLastIndex - 1;

  //   if (
  //     !recommendationSessionId
  //     || !hasReachedPrefetchThreshold
  //     || isNextPending
  //     || isContextModalOpen
  //     || isContextSubmitting
  //   ) {
  //     return;
  //   }

  //   const lastOutfitHash = outfitSheets[outfitSheets.length - 1]?.outfitHash;

  //   if (!lastOutfitHash || requestedNextFromHashesRef.current.has(lastOutfitHash)) {
  //     return;
  //   }

  //   requestedNextFromHashesRef.current.add(lastOutfitHash);
  //   nextRecommendation({
  //     session_id: recommendationSessionId,
  //     current_outfit_hash: lastOutfitHash,
  //   });
  // }, [
  //   isContextModalOpen,
  //   isContextSubmitting,
  //   isNextPending,
  //   nextRecommendation,
  //   outfitSheets,
  //   recommendationSessionId,
  // ]);

  // useEffect(() => {
  //   requestNextIfNeeded(visibleSheetIndex);
  // }, [prefetchRetryTick, requestNextIfNeeded, visibleSheetIndex]);

  useEffect(() => {
    return () => {
      clearTimeoutRef(snackbarTimeoutRef);
    };
  }, []);

  // const loading = isStartPending && outfitSheets.length === 0;
  // const activeOutfit = outfitSheets[visibleSheetIndex] ?? outfitSheets[0] ?? null;
  const loading = isStartPending && listOutfits.length === 0;
  const activeOutfit = listOutfits[visibleSheetIndex] ?? listOutfits[0] ?? null;
  const activeSaveState = getSaveStateForOutfit(activeOutfit, saveStates);
  const activeContextChipOptions =
    CONTEXT_CHIP_SETS[contextSuggestionSetIndex] ?? CONTEXT_CHIP_SETS[0];
  const trimmedCustomContextText = customContextText.trim();
  const isContextConfirmDisabled =
    !selectedContextChipId && trimmedCustomContextText.length === 0;

  // const optionSets = useMemo(
  //   () => outfitSheets.map(buildGridOutfitSheet),
  //   [outfitSheets],
  // );

  const handleSaveOutfit = (outfit: OutfitSheet | null) => {
    if (!outfit) {
      return;
    }

    const currentState = saveStates[outfit.outfitHash] || 'idle';

    if (currentState === 'saving' || currentState === 'saved') {
      return;
    }

    setSaveStates((currentStateMap) => ({
      ...currentStateMap,
      [outfit.outfitHash]: 'saving',
    }));

    saveFavourite({
      outfit_hash: outfit.outfitHash,
      item_ids: outfit.items.map((item) => item.id),
      source: 'home',
    });
  };

  const handleOpenTryOn = (outfit: OutfitSheet) => {
    navigation.navigate('Body', {
      mode: 'tryOn',
      outfit: buildTryOnContext(outfit),
    });
  };

  const handleOpenContextModal = (outfit: OutfitSheet) => {
    if (!recommendationSessionId || isContextSubmitting) {
      return;
    }

    const targetIndex = outfitSheets.findIndex(
      (sheet) => sheet.outfitHash === outfit.outfitHash,
    );

    if (targetIndex >= 0) {
      setVisibleSheetIndex(targetIndex);
    }

    resetContextDraft();
    setIsContextModalOpen(true);
  };

  const handleShuffleSuggestions = () => {
    Keyboard.dismiss();
    setContextSuggestionSetIndex(
      (currentIndex) => (currentIndex + 1) % CONTEXT_CHIP_SETS.length,
    );
    setSelectedContextChipId(null);
    setIsEditingContext(false);
    setCustomContextText('');
  };

  const handleSelectContextChip = (chipId: ContextChipId) => {
    Keyboard.dismiss();
    setSelectedContextChipId((currentChipId) => (
      currentChipId === chipId ? null : chipId
    ));
    setIsEditingContext(false);
    setCustomContextText('');
  };

  const handleOpenContextEdit = () => {
    setSelectedContextChipId(null);
    setIsEditingContext(true);
  };

  const handleChangeContextText = (text: string) => {
    setSelectedContextChipId(null);
    setIsEditingContext(true);
    setCustomContextText(text);
  };

  const handleSubmitContext = () => {
    if (!activeOutfit || !recommendationSessionId || isContextConfirmDisabled) {
      return;
    }

    const selectedPayload = selectedContextChipId
      ? CONTEXT_CHIP_PAYLOADS[selectedContextChipId]
      : null;

    const payload: NextRecommendationParams = {
      session_id: recommendationSessionId,
      current_outfit_hash: activeOutfit.outfitHash,
      ...(selectedPayload || {}),
      ...(trimmedCustomContextText
        ? { style_feedback: trimmedCustomContextText }
        : {}),
    };

    submitContextRecommendation(payload);
  };

  const handleLeadingAction = () => {
    setIsSidebarOpen(true);
  };

  const handleOptionSwipeEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentSheetIndex = getSheetIndexFromOffset(event.nativeEvent.contentOffset.y);
    setVisibleSheetIndex(currentSheetIndex);
    requestNextIfNeeded(currentSheetIndex);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <View style={styles.header}>
        <TopIconButton
          onPress={handleLeadingAction}
          icon={<MenuGlyph />}
        />

        <Text style={styles.headerTitle}>Auxi</Text>

        <TouchableOpacity
          activeOpacity={0.82}
          style={[
            styles.heartButton,
            activeSaveState === 'saved' && styles.heartButtonSaved,
            activeSaveState === 'error' && styles.heartButtonError,
          ]}
          disabled={!activeOutfit || activeSaveState === 'saving' || activeSaveState === 'saved'}
          onPress={() => handleSaveOutfit(activeOutfit)}
        >
          {activeSaveState === 'saving' ? (
            <ActivityIndicator size="small" color={theme.colors.figmaAction} />
          ) : (
            <Icons.Heart width={24} height={24} />
          )}
        </TouchableOpacity>
      </View>

      {snackbarMessage ? (
        <View style={styles.snackbar}>
          <Text style={styles.snackbarText}>{snackbarMessage}</Text>
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToAlignment="start"
        snapToInterval={OPTION_SHEET_SNAP_INTERVAL}
        decelerationRate="fast"
        onScrollEndDrag={handleOptionSwipeEnd}
        onMomentumScrollEnd={handleOptionSwipeEnd}
      >
        {loading ? (
          <HomeLoadingState />
        ) : (
          <>
            {optionSets.map((outfit) => (
              <OptionSheet
                key={outfit.outfitHash}
                outfit={outfit}
                contextDisabled={!recommendationSessionId || isContextSubmitting}
                saveState={saveStates[outfit.outfitHash] || 'idle'}
                onAddContext={handleOpenContextModal}
                onItemPress={(item) => setSelectedItem(item)}
                onSave={handleSaveOutfit}
                onSeeThisOnMe={handleOpenTryOn}
              />
            ))}
            {isNextPending ? <LoadingMoreIndicator /> : null}
          </>
        )}
      </ScrollView>

      <ItemDetailBottomSheet
        visible={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />

      <ContextChipsModal
        visible={isContextModalOpen}
        chipOptions={activeContextChipOptions}
        selectedChipId={selectedContextChipId}
        isEditing={isEditingContext}
        customContextText={customContextText}
        isSubmitting={isContextSubmitting}
        confirmDisabled={isContextConfirmDisabled}
        onSelectChip={handleSelectContextChip}
        onShuffle={handleShuffleSuggestions}
        onEdit={handleOpenContextEdit}
        onChangeText={handleChangeContextText}
        onCancel={closeContextModal}
        onConfirm={handleSubmitContext}
      />
    </SafeAreaView>
  );
};

const OptionSheet = ({
  contextDisabled,
  outfit,
  saveState,
  onAddContext,
  onItemPress,
  onSave,
  onSeeThisOnMe,
}: {
  contextDisabled: boolean;
  outfit: OutfitSheetWithGrid;
  saveState: SaveState;
  onAddContext: (outfit: OutfitSheet) => void;
  onItemPress: (item: Item) => void;
  onSave: (outfit: OutfitSheet) => void;
  onSeeThisOnMe: (outfit: OutfitSheet) => void;
}) => {
  const rows = [outfit.gridItems.slice(0, 2), outfit.gridItems.slice(2, 4)];

  return (
    <View style={styles.optionSheet}>
      <View style={styles.gridWrap}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${outfit.outfitHash}-${rowIndex}`} style={styles.cardRow}>
            {row.map((item, itemIndex) => (
              <View key={`card-${outfit.outfitHash}-${rowIndex}-${itemIndex}`} style={styles.cardShell}>
                {item ? (
                  <TouchableOpacity
                    activeOpacity={0.86}
                    style={styles.card}
                    onPress={() => onItemPress(item)}
                  >
                    <GarmentPreview item={item} />
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.card, styles.placeholderCard]} />
                )}
              </View>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.actionCluster}>
        <PillButton
          title={saveState === 'saved' ? 'Saved to favourite' : 'Wear this'}
          variant="filled"
          onPress={() => onSave(outfit)}
          disabled={saveState === 'saved'}
          loading={saveState === 'saving'}
          style={styles.primaryAction}
        />

        {saveState === 'error' ? (
          <Text style={styles.saveErrorText}>
            {"Couldn't save this look. Tap \"Wear this\" to retry."}
          </Text>
        ) : null}

        <PillButton
          title="See this on me"
          variant="text"
          onPress={() => onSeeThisOnMe(outfit)}
          style={styles.secondaryAction}
          textStyle={styles.secondaryActionText}
        />

        <PillButton
          title="Add context"
          variant="text"
          onPress={() => onAddContext(outfit)}
          disabled={contextDisabled}
          style={styles.contextAction}
          textStyle={styles.secondaryActionText}
        />
      </View>
    </View>
  );
};

const HomeLoadingState = () => (
  <View style={styles.optionSheet}>
    <View style={styles.loadingCards}>
      {[0, 1].map((row) => (
        <View key={`loading-row-${row}`} style={styles.cardRow}>
          {[0, 1].map((column) => (
            <View key={`loading-card-${row}-${column}`} style={styles.cardShell}>
              <View style={[styles.card, styles.loadingCard]} />
            </View>
          ))}
        </View>
      ))}
    </View>

    <View style={styles.loadingFooter}>
      <ActivityIndicator size="small" color={theme.colors.figmaAction} />
      <Text style={styles.loadingFooterText}>Building your next looks</Text>
    </View>
  </View>
);

const LoadingMoreIndicator = () => (
  <View style={styles.loadingMoreIndicator}>
    <ActivityIndicator size="small" color={theme.colors.figmaAction} />
    <Text style={styles.loadingMoreText}>Loading more options...</Text>
  </View>
);

const MenuGlyph = () => (
  <View style={styles.menuGlyph}>
    <View style={styles.menuGlyphLine} />
    <View style={styles.menuGlyphLine} />
    <View style={styles.menuGlyphLine} />
  </View>
);

const GarmentPreview = ({ item }: { item: Item }) => {
  const imageUrl = getImageUrl(item.image_url) || item.image_url;

  return (
    <>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="contain" />
      ) : (
        <View style={styles.cardFallback} />
      )}
      <View style={styles.cardTag}>
        <Text style={styles.cardTagText}>common items</Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTitle: {
    ...theme.typography.aliases.playfairDisplaySection,
    color: theme.colors.figmaText,
  },
  heartButton: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
  },
  heartButtonSaved: {
    borderWidth: 1.5,
    borderColor: '#3BA3D0',
  },
  heartButtonError: {
    borderWidth: 1.5,
    borderColor: theme.colors.figmaRed,
  },
  snackbar: {
    position: 'absolute',
    top: 64,
    left: 22,
    right: 22,
    zIndex: 20,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#3BA3D0',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  snackbarText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.white,
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 24,
    gap: SHEET_GAP,
  },
  optionSheet: {
    height: OPTION_SHEET_HEIGHT,
    borderRadius: 16,
    backgroundColor: theme.colors.white,
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 24,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  gridWrap: {
    gap: GRID_GAP,
  },
  loadingCards: {
    gap: GRID_GAP,
  },
  cardRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
  },
  cardShell: {
    flex: 1,
  },
  card: {
    aspectRatio: 3 / 4,
    borderRadius: 16,
    backgroundColor: '#ECEEF2',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    backgroundColor: '#E4E7ED',
  },
  placeholderCard: {
    backgroundColor: '#E6E9EE',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#DDE2EA',
  },
  cardTag: {
    position: 'absolute',
    left: '50%',
    bottom: 0,
    marginLeft: -28.5,
    width: 57,
    height: 19,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: 'rgba(39,42,50,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTagText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 8,
    lineHeight: 12,
    color: theme.colors.white,
  },
  actionCluster: {
    gap: 8,
    alignItems: 'center',
  },
  primaryAction: {
    alignSelf: 'stretch',
  },
  saveErrorText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaRed,
    textAlign: 'center',
  },
  secondaryAction: {
    height: 40,
  },
  contextAction: {
    height: 32,
  },
  secondaryActionText: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaAction,
  },
  loadingFooter: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  loadingFooterText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaAction,
  },
  loadingMoreIndicator: {
    marginHorizontal: 24,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: theme.colors.figmaSurfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.figmaDivider,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  loadingMoreText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaAction,
  },
  menuGlyph: {
    width: 20,
    height: 16,
    justifyContent: 'space-between',
  },
  menuGlyphLine: {
    width: '100%',
    height: 2,
    borderRadius: 999,
    backgroundColor: theme.colors.figmaAction,
  },
});
