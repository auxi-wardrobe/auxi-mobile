import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { favouriteService } from '../../services/favouriteService';
import { recommendationService } from '../../services/recommendationService';
import { Item } from '../../types/item';
import { AppStackParamList } from '../../types/navigation';
import { MAX_DUPLICATE_PREFETCH_RETRIES, SNACKBAR_DURATION_MS } from './constants';
import { OutfitSheet, SaveState } from './types';
import {
  buildGridOutfitSheet,
  buildOutfitSheet,
  buildTryOnContext,
  clearTimeoutRef,
  getSaveStateForOutfit,
  getSheetIndexFromOffset,
} from './utils';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Home'>;

export const useHomeScreen = () => {
  const navigation = useNavigation<Navigation>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [outfitSheets, setOutfitSheets] = useState<OutfitSheet[]>([]);
  const [recommendationSessionId, setRecommendationSessionId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [visibleSheetIndex, setVisibleSheetIndex] = useState(0);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [prefetchRetryTick, setPrefetchRetryTick] = useState(0);
  const requestedNextFromHashesRef = useRef(new Set<string>());
  const duplicatePrefetchCountsRef = useRef<Record<string, number>>({});
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { mutate: startRecommendation, isPending: isStartPending } = useMutation({
    mutationFn: recommendationService.startRecommendation,
    onSuccess: (data) => {
      if (!data?.outfit) {
        return;
      }
      setOutfitSheets([buildOutfitSheet(data.outfit)]);
      setRecommendationSessionId(data.session_id);
      setVisibleSheetIndex(0);
      requestedNextFromHashesRef.current.clear();
      duplicatePrefetchCountsRef.current = {};
    },
    onError: (error) => {
      console.error('Failed to load recommendation', error);
    },
  });

  const { mutate: nextRecommendation, isPending: isNextPending } = useMutation({
    mutationFn: recommendationService.nextRecommendation,
    onSuccess: (data, variables) => {
      if (!data?.outfit) {
        return;
      }
      const requestedFromHash = variables.current_outfit_hash;
      let appended = false;

      setOutfitSheets((currentSheets) => {
        if (currentSheets.some((sheet) => sheet.outfitHash === data.outfit.outfit_hash)) {
          return currentSheets;
        }
        appended = true;
        return [...currentSheets, buildOutfitSheet(data.outfit)];
      });
      setRecommendationSessionId(data.session_id);

      if (appended) {
        delete duplicatePrefetchCountsRef.current[requestedFromHash];
        return;
      }

      const duplicateCount = duplicatePrefetchCountsRef.current[requestedFromHash] || 0;
      if (duplicateCount >= MAX_DUPLICATE_PREFETCH_RETRIES) {
        return;
      }
      duplicatePrefetchCountsRef.current[requestedFromHash] = duplicateCount + 1;
      requestedNextFromHashesRef.current.delete(requestedFromHash);
      setPrefetchRetryTick((currentTick) => currentTick + 1);
    },
    onError: (error, variables) => {
      if (variables?.current_outfit_hash) {
        requestedNextFromHashesRef.current.delete(variables.current_outfit_hash);
      }
      console.error('Failed to fetch more options', error);
    },
  });

  const { mutate: saveFavourite } = useMutation({
    mutationFn: favouriteService.saveFavourite,
    onSuccess: (_, variables) => {
      setSaveStates((currentState) => ({
        ...currentState,
        [variables.outfit_hash]: 'saved',
      }));
      clearTimeoutRef(snackbarTimeoutRef);
      setSnackbarMessage('This look is now saved to your favourite');
      snackbarTimeoutRef.current = setTimeout(() => {
        setSnackbarMessage(null);
        clearTimeoutRef(snackbarTimeoutRef);
      }, SNACKBAR_DURATION_MS);
    },
    onError: (error, variables) => {
      setSaveStates((currentState) => ({
        ...currentState,
        [variables.outfit_hash]: 'error',
      }));
      console.error('Failed to save favourite', error);
    },
  });

  useEffect(() => {
    const fetchLocationAndStart = async () => {
      let hasPermission = false;

      if (Platform.OS === 'ios') {
        const auth = await Geolocation.requestAuthorization('whenInUse');
        hasPermission = auth === 'granted';
      } else if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      if (hasPermission) {
        Geolocation.getCurrentPosition(
          (position) => {
            startRecommendation({
              weather: {
                lat: position.coords.latitude,
                long: position.coords.longitude,
                temp_c: 22,
              },
            });
          },
          (error) => {
            console.warn('Geolocation error:', error.code, error.message);
            startRecommendation({ weather: { temp_c: 22 } });
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
        );
      } else {
        startRecommendation({ weather: { temp_c: 22 } });
      }
    };

    fetchLocationAndStart();
  }, [startRecommendation]);

  const requestNextIfNeeded = useCallback((sheetIndex: number) => {
    const currentLastIndex = outfitSheets.length - 1;
    // Prefetch next outfit when user is 1 outfit away from the end (like "try another")
    const hasReachedPrefetchThreshold = currentLastIndex >= 0 && sheetIndex >= currentLastIndex - 1;

    if (!recommendationSessionId || !hasReachedPrefetchThreshold || isNextPending) {
      return;
    }

    const lastOutfitHash = outfitSheets[outfitSheets.length - 1]?.outfitHash;
    if (!lastOutfitHash || requestedNextFromHashesRef.current.has(lastOutfitHash)) {
      return;
    }

    requestedNextFromHashesRef.current.add(lastOutfitHash);
    nextRecommendation({
      session_id: recommendationSessionId,
      current_outfit_hash: lastOutfitHash,
    });
  }, [isNextPending, nextRecommendation, outfitSheets, recommendationSessionId]);

  useEffect(() => {
    requestNextIfNeeded(visibleSheetIndex);
  }, [prefetchRetryTick, requestNextIfNeeded, visibleSheetIndex]);

  useEffect(() => {
    return () => {
      clearTimeoutRef(snackbarTimeoutRef);
    };
  }, []);

  const loading = isStartPending && outfitSheets.length === 0;
  const activeOutfit = outfitSheets[visibleSheetIndex] ?? outfitSheets[0] ?? null;
  const activeSaveState = getSaveStateForOutfit(activeOutfit, saveStates);
  const optionSets = useMemo(() => outfitSheets.map(buildGridOutfitSheet), [outfitSheets]);

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

  const handleOptionSwipeEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentSheetIndex = getSheetIndexFromOffset(event.nativeEvent.contentOffset.y);
    setVisibleSheetIndex(currentSheetIndex);
    requestNextIfNeeded(currentSheetIndex);
  };

  return {
    isSidebarOpen,
    setIsSidebarOpen,
    selectedItem,
    setSelectedItem,
    saveStates,
    snackbarMessage,
    loading,
    activeOutfit,
    activeSaveState,
    optionSets,
    isNextPending,
    handleSaveOutfit,
    handleOpenTryOn,
    handleOptionSwipeEnd,
  };
};
