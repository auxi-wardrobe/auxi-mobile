import React from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Sidebar } from '../components/layout/Sidebar';
import { ItemDetailBottomSheet } from '../components/features/ItemDetailBottomSheet';
import { TopIconButton } from '../components/primitives/FigmaPrimitives';
import { Icons } from '../assets/icons';
import { theme } from '../theme/theme';
import { OPTION_SHEET_HEIGHT, OPTION_SHEET_SNAP_INTERVAL, SHEET_GAP } from './home/constants';
import { OptionSheet } from './home/OptionSheet';
import { useHomeScreen } from './home/useHomeScreen';

export const HomeScreen = () => {
  const {
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
  } = useHomeScreen();

  return (
    <SafeAreaView style={styles.container}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <View style={styles.header}>
        <TopIconButton
          onPress={() => setIsSidebarOpen(true)}
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
                saveState={saveStates[outfit.outfitHash] || 'idle'}
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
    </SafeAreaView>
  );
};

const HomeLoadingState = () => (
  <View style={styles.loadingSheet}>
    <View style={styles.loadingCards}>
      {[0, 1].map((row) => (
        <View key={`loading-row-${row}`} style={styles.loadingRow}>
          {[0, 1].map((column) => (
            <View key={`loading-card-${row}-${column}`} style={styles.loadingCardShell}>
              <View style={styles.loadingCard} />
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
    <ActivityIndicator size="small" color={theme.colors.white} />
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
    paddingBottom: 10,
  },
  headerTitle: {
    ...theme.typography.aliases.playfairDisplaySection,
    color: theme.colors.white,
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
  loadingSheet: {
    height: OPTION_SHEET_HEIGHT,
    borderRadius: 16,
    backgroundColor: theme.colors.white,
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  loadingCards: {
    gap: 4,
  },
  loadingRow: {
    flexDirection: 'row',
    gap: 4,
  },
  loadingCardShell: {
    flex: 1,
  },
  loadingCard: {
    aspectRatio: 3 / 4,
    borderRadius: 16,
    backgroundColor: '#E4E7ED',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  loadingMoreText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.white,
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
