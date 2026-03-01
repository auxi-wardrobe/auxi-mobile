import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { ItemDetailBottomSheet } from '../components/features/ItemDetailBottomSheet';
import { PillButton, TopIconButton } from '../components/primitives/FigmaPrimitives';
import { Sidebar } from '../components/layout/Sidebar';
import { Icons } from '../assets/icons';
import { theme } from '../theme/theme';
import { Item } from '../types/item';
import { recommendationService } from '../services/recommendationService';
import { getImageUrl } from '../utils/url';
import { AppStackParamList } from '../types/navigation';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Home'>;

const buildGrid = (items: Item[]): Array<Item | null> =>
  Array.from({ length: 4 }, (_, index) => items[index] || null);

export const HomeScreen = () => {
  const navigation = useNavigation<Navigation>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [primaryItems, setPrimaryItems] = useState<Item[]>([]);
  const [secondaryItems, setSecondaryItems] = useState<Item[]>([]);
  const [recommendationSessionId, setRecommendationSessionId] = useState<string | null>(null);
  const [currentOutfitHash, setCurrentOutfitHash] = useState<string | null>(null);
  const [hasLoadedMoreOptions, setHasLoadedMoreOptions] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

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

  const { mutate: nextRecommendation } = useMutation({
    mutationFn: recommendationService.nextRecommendation,
    onSuccess: (data) => {
      if (data?.outfit) {
        setSecondaryItems(data.outfit.items || []);
      }
    },
    onError: (error) => {
      console.error('Failed to fetch more options', error);
    },
  });

  useEffect(() => {
    startRecommendation({});
  }, [startRecommendation]);

  useEffect(() => {
    if (!recommendationSessionId || !currentOutfitHash || hasLoadedMoreOptions) return;
    setHasLoadedMoreOptions(true);
    nextRecommendation({
      session_id: recommendationSessionId,
      current_outfit_hash: currentOutfitHash,
    });
  }, [currentOutfitHash, hasLoadedMoreOptions, nextRecommendation, recommendationSessionId]);

  const loading = isStartPending && primaryItems.length === 0;

  const primaryGrid = useMemo(() => buildGrid(primaryItems), [primaryItems]);
  const secondaryGrid = useMemo(() => {
    if (secondaryItems.length > 0) return buildGrid(secondaryItems);
    return buildGrid(primaryItems);
  }, [primaryItems, secondaryItems]);

  const optionSets = useMemo(() => [primaryGrid, secondaryGrid], [primaryGrid, secondaryGrid]);

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

      <View style={styles.header}>
        <TopIconButton
          onPress={handleLeadingAction}
          icon={<Text style={styles.backGlyph}>‹</Text>}
          style={styles.backButton}
        />

        <View style={styles.headerCenter}>
          <Icons.Heart width={24} height={24} />
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
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
    backgroundColor: '#191B22',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backButton: {
    backgroundColor: theme.colors.white,
  },
  backGlyph: {
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
    paddingBottom: 24,
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
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 16,
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
    gap: 4,
  },
  cardShell: {
    flex: 1,
  },
  card: {
    aspectRatio: 3 / 4,
    borderRadius: 16,
    backgroundColor: '#F1F2F6',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderCard: {
    backgroundColor: '#ECECF0',
  },
  cardImage: {
    width: '86%',
    height: '86%',
  },
  cardFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EC',
  },
  cardTag: {
    position: 'absolute',
    left: '50%',
    bottom: 0,
    marginLeft: -29,
    width: 58,
    height: 19,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: 'rgba(39,42,50,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTagText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 6,
    lineHeight: 12,
    color: theme.colors.white,
  },
  sheetCta: {
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 2,
    height: 36,
  },
  sheetCtaText: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaAction,
    fontSize: 16,
    lineHeight: 24,
  },
  sheetCtaSparkle: {
    color: '#7A2CFF',
    fontSize: 14,
    lineHeight: 18,
    marginLeft: 6,
  },
});
