import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { theme } from '../../theme/theme';
import { Item } from '../../types/item';
import { getImageUrl } from '../../utils/url';
import { GRID_GAP, OPTION_SHEET_HEIGHT, SHEET_PADDING } from './constants';
import { OutfitSheet, OutfitSheetWithGrid, SaveState } from './types';

type Props = {
  outfit: OutfitSheetWithGrid;
  saveState: SaveState;
  onItemPress: (item: Item) => void;
  onSave: (outfit: OutfitSheet) => void;
  onSeeThisOnMe: (outfit: OutfitSheet) => void;
};

export const OptionSheet = ({ outfit, saveState, onItemPress, onSave, onSeeThisOnMe }: Props) => {
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
      </View>
    </View>
  );
};

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
  optionSheet: {
    height: OPTION_SHEET_HEIGHT,
    borderRadius: 16,
    backgroundColor: theme.colors.white,
    paddingTop: 12,
    paddingHorizontal: SHEET_PADDING,
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
  placeholderCard: {
    backgroundColor: '#E6E9EE',
  },
  cardImage: {
    width: '88%',
    height: '88%',
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
  secondaryActionText: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaAction,
  },
});
