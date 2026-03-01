import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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

export const HomeScreen = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [recommendationSessionId, setRecommendationSessionId] = useState<string | null>(null);
  const [currentOutfitHash, setCurrentOutfitHash] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const { mutate: startRecommendation, isPending: isStartPending } = useMutation({
    mutationFn: recommendationService.startRecommendation,
    onSuccess: (data) => {
      if (data?.outfit) {
        setItems(data.outfit.items || []);
        setRecommendationSessionId(data.session_id);
        setCurrentOutfitHash(data.outfit.outfit_hash);
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
        setItems(data.outfit.items || []);
        if (data.session_id) setRecommendationSessionId(data.session_id);
        setCurrentOutfitHash(data.outfit.outfit_hash);
      }
    },
    onError: (error) => {
      console.error('Failed to fetch next recommendation', error);
    },
  });

  useEffect(() => {
    startRecommendation({});
  }, [startRecommendation]);

  const loading = isStartPending || isNextPending;

  const displayItems = useMemo(() => items.slice(0, 3), [items]);

  const handleTryAnother = () => {
    if (!recommendationSessionId || !currentOutfitHash) return;
    nextRecommendation({
      session_id: recommendationSessionId,
      current_outfit_hash: currentOutfitHash,
    });
  };

  const openItemDetail = (item: Item) => setSelectedItem(item);

  return (
    <SafeAreaView style={styles.container}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <Header onBack={() => setIsSidebarOpen(true)} onFeedback={() => undefined} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.weatherText}>It's 24°C and partly cloudy today</Text>
        <Text style={styles.weatherText}>Here is a outfit option.</Text>

        <Text style={styles.optionLabel}>✦ Option 01</Text>

        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="large" color={theme.colors.figmaAction} />
          </View>
        ) : (
          <View style={styles.cardsRow}>
            {displayItems.map((item) => {
              const imageUrl = getImageUrl(item.image_url);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  activeOpacity={0.86}
                  onPress={() => openItemDetail(item)}
                >
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.cardFallback} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.summary}>Comfortable and easy to match.</Text>

        <Text style={styles.note}>All items from starter wardrobe.</Text>
        <Text style={styles.note}>You can replace it with your own clothes anytime.</Text>
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
    marginTop: 26,
    marginBottom: 10,
  },
  loadingBlock: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardsRow: {
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
  inputPlaceholder: {
    flex: 1,
    ...theme.typography.aliases.manropeBody,
    color: '#B8B8BC',
  },
  sendButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
