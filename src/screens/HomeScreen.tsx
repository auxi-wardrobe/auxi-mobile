import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { ItemDetailBottomSheet } from '../components/features/ItemDetailBottomSheet';
import { PillButton } from '../components/primitives/FigmaPrimitives';
import { theme } from '../theme/theme';
import { Item } from '../types/item';
import { recommendationService } from '../services/recommendationService';
import { getImageUrl } from '../utils/url';
import { Icons } from '../assets/icons';

const { width: screenWidth } = Dimensions.get('window');
const CARD_GAP = 8;
const CARD_WIDTH = Math.floor((screenWidth - 44 - CARD_GAP * 2) / 3);

type OutfitSheet = {
  items: Item[];
  outfitHash: string;
};

const OPTION_SHEET_HEIGHT = 617;
const OPTION_SHEET_GAP = 4;
const OPTION_SHEET_SNAP_INTERVAL = OPTION_SHEET_HEIGHT + OPTION_SHEET_GAP;
const INITIAL_BUFFER_SHEETS = 1;
const STEADY_STATE_BUFFER_SHEETS = 2;

export const HomeScreen = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [primaryItems, setPrimaryItems] = useState<Item[]>([]);
  const [secondaryItems, setSecondaryItems] = useState<Item[]>([]);
  const [recommendationSessionId, setRecommendationSessionId] = useState<string | null>(null);
  const [currentOutfitHash, setCurrentOutfitHash] = useState<string | null>(null);
  const [hasLoadedMoreOptions, setHasLoadedMoreOptions] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [visibleSheetIndex, setVisibleSheetIndex] = useState(0);
  const requestedNextFromHashesRef = useRef(new Set<string>());

  const { mutate: startRecommendation, isPending: isStartPending } = useMutation({
    mutationFn: recommendationService.startRecommendation,
    onSuccess: (data) => {
      if (data?.outfit) {
        setPrimaryItems(data.outfit.items || []);
        setSecondaryItems([]);
        setRecommendationSessionId(data.session_id);
        setCurrentOutfitHash(data.outfit.outfit_hash);
        setHasLoadedMoreOptions(false);
      }
    },
    onError: (error) => {
      console.error('Failed to load recommendation', error);
    },
  });

  const { mutate: nextRecommendation, isPending: isNextPending } = useMutation({
    mutationFn: recommendationService.nextRecommendation,
    onSuccess: (data) => {
      if (data?.outfit) {
        setSecondaryItems(data.outfit.items || []);
      }
    },
    onError: (error) => {
      console.error('Failed to fetch next recommendation', error);
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

  useEffect(() => {
    if (!recommendationSessionId || !currentOutfitHash || hasLoadedMoreOptions) return;
    setHasLoadedMoreOptions(true);
    nextRecommendation({
      session_id: recommendationSessionId,
      current_outfit_hash: lastOutfitHash,
    });
  }, [currentOutfitHash, hasLoadedMoreOptions, nextRecommendation, recommendationSessionId]);

  const loading = isStartPending && primaryItems.length === 0;

  const primaryGrid = useMemo(() => buildGrid(primaryItems), [primaryItems]);
  const secondaryGrid = useMemo(() => {
    if (secondaryItems.length > 0) return buildGrid(secondaryItems);
    return buildGrid(primaryItems);
  }, [primaryItems, secondaryItems]);

  const tertiaryGrid = useMemo(() => {
    if (secondaryItems.length > 0) return buildGrid(secondaryItems);
    return buildGrid(primaryItems);
  }, [primaryItems, secondaryItems]);

  const optionSets = useMemo(
    () => [primaryGrid, secondaryGrid, tertiaryGrid],
    [primaryGrid, secondaryGrid, tertiaryGrid],
  );

  const handleLeadingAction = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    setIsSidebarOpen(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <Header onBack={() => setIsSidebarOpen(true)} onFeedback={() => undefined} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.weatherText}>It's 24°C and partly cloudy today</Text>
        <Text style={styles.weatherText}>Here is a outfit option.</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="large" color={theme.colors.white} />
          </View>
        ) : (
          optionSets.map((optionItems, index) => (
            <OptionSheet
              key={`option-${index}`}
              items={optionItems}
              onItemPress={(item) => setSelectedItem(item)}
              onSeeThisOnMe={() => navigation.navigate('Body')}
            />
          ))
        )}
      </ScrollView>

      <View style={styles.bottomDock}>
        <View style={styles.chipRow}>
          <PillButton title="Work" variant="outline" style={styles.chipButton} textStyle={styles.chipText} />
          <PillButton title="Casual" variant="outline" style={styles.chipButton} textStyle={styles.chipText} />
          <PillButton
            title="Try another"
            variant="outline"
            style={styles.chipTryButton}
            textStyle={styles.chipText}
            onPress={handleTryAnother}
          />
        </View>

        <View style={styles.inputBar}>
          <Text style={styles.inputLeading}>◌</Text>
          <Text style={styles.inputLeading}>◻</Text>
          <Text style={styles.inputPlaceholder}>Provide me more</Text>
          <TouchableOpacity style={styles.sendButton} activeOpacity={0.8}>
            <Icons.Send width={18} height={18} />
          </TouchableOpacity>
        </View>
      </View>

      <ItemDetailBottomSheet
        visible={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </SafeAreaView>
  );
};

const OptionSheet = ({
  items,
  onItemPress,
  onSeeThisOnMe,
}: {
  items: Array<Item | null>;
  onItemPress: (item: Item) => void;
  onSeeThisOnMe: () => void;
}) => {
  const rows = [items.slice(0, 2), items.slice(2, 4)];

  return (
    <View style={styles.optionSheet}>
      <View style={styles.gridWrap}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.cardRow}>
            {row.map((item, itemIndex) => (
              <View key={`card-${rowIndex}-${itemIndex}`} style={styles.cardShell}>
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

      <PillButton
        title="See this on me"
        variant="text"
        onPress={onSeeThisOnMe}
        style={styles.sheetCta}
        textStyle={styles.sheetCtaText}
        trailing={<Text style={styles.sheetCtaSparkle}>✦</Text>}
      />
    </View>
  );
};

const GarmentPreview = ({ item }: { item: Item }) => {
  const imageUrl = getImageUrl(item.image_url);

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
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 210,
  },
  weatherText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaText,
  },
  optionLabel: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaAction,
    fontSize: 34,
    lineHeight: 34,
    marginTop: -2,
  },
  headerCenter: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 45,
    height: 45,
  },
  scrollContent: {
    paddingTop: 4,
    gap: 4,
  },
  loadingBlock: {
    flex: 1,
    minHeight: 320,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionSheet: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    height: 617,
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
    gap: 4,
  },
  cardRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.colors.figmaSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderCard: {
    backgroundColor: '#ECECF0',
  },
  cardImage: {
    width: '92%',
    height: '92%',
  },
  cardFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E7E8EC',
  },
  summary: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaText,
    marginTop: 28,
    marginBottom: 22,
  },
  note: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaText,
  },
  bottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
    backgroundColor: theme.colors.figmaBackground,
    gap: 10,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipButton: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: theme.colors.figmaAction,
    paddingHorizontal: 12,
  },
  chipTryButton: {
    flex: 1.45,
    height: 52,
    borderWidth: 1,
    borderColor: theme.colors.figmaAction,
    paddingHorizontal: 12,
  },
  chipText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaAction,
  },
  inputBar: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D0D0D6',
    backgroundColor: '#F4F4F5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 14,
  },
  inputLeading: {
    color: theme.colors.figmaAction,
    fontSize: 18,
    lineHeight: 20,
  },
  sheetCtaSparkle: {
    color: '#7A2CFF',
    fontSize: 14,
    lineHeight: 18,
    marginLeft: 6,
  },
  heartActive: {
    opacity: 0.72,
  },
});
