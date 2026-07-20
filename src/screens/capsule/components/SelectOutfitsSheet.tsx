import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  MBottomSheet,
  MButton,
} from '../../../components/design-system/lib';
import { MacgieLoader } from '../../../components/macgie';
import { theme } from '../../../theme/theme';
import { favouriteService } from '../../../services/favouriteService';
import { creationsService } from '../../../services/creationsService';
import { resolveItemImage } from '../../../utils/url';
import type { CapsuleOutfitSource } from '../../../services/capsuleService';
import { capsuleStyles as s } from '../styles';

interface SelectOutfitsSheetProps {
  visible: boolean;
  source: CapsuleOutfitSource;
  busy?: boolean;
  onDismiss: () => void;
  onConfirm: (outfitIds: string[]) => void;
}

/** Normalised selectable-outfit row (favourite or creation). */
interface OutfitRow {
  id: string;
  thumbUris: string[];
}

/**
 * Saved-outfit multi-select for the capsule add flow. Fetches favourites or
 * creations depending on `source`; each row shows the outfit's item thumbnails
 * and a select toggle. Confirm hands the chosen outfit ids up (the backend
 * extracts + dedups the items).
 */
export const SelectOutfitsSheet: React.FC<SelectOutfitsSheetProps> = ({
  visible,
  source,
  busy,
  onDismiss,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['capsule-outfit-picker', source],
    enabled: visible,
    queryFn: async (): Promise<OutfitRow[]> => {
      if (source === 'favourites') {
        const res = await favouriteService.listFavourites();
        return res.favorites.map(fav => ({
          id: fav.id,
          thumbUris: fav.outfit_items
            .map(item => resolveItemImage(item))
            .filter((u): u is string => !!u),
        }));
      }
      const res = await creationsService.listCreations();
      return res.creations.map(creation => ({
        id: creation.id,
        thumbUris: creation.items.map(i => i.imageUri).filter(Boolean),
      }));
    },
  });

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selected));
    setSelected(new Set());
  };

  const title =
    source === 'favourites'
      ? t('capsule.source_favourites')
      : t('capsule.source_creations');

  return (
    <MBottomSheet
      visible={visible}
      onDismiss={onDismiss}
      testID="capsule-select-outfits-sheet"
    >
      <Text style={s.sheetTitle}>{title}</Text>
      {isLoading ? (
        <View style={s.sheetLoading}>
          <MacgieLoader variant="inline" testID="capsule-outfits-loading" />
        </View>
      ) : (
        <ScrollView style={s.sheetScroll}>
          {rows.map(row => {
            const isSelected = selected.has(row.id);
            return (
              <Pressable
                key={row.id}
                onPress={() => toggle(row.id)}
                testID={
                  isSelected
                    ? `capsule-select-outfit-${row.id}-selected`
                    : `capsule-select-outfit-${row.id}`
                }
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={title}
                style={[styles.row, isSelected && styles.rowSelected]}
              >
                {row.thumbUris.slice(0, 4).map((uri, i) => (
                  <Image
                    key={`${row.id}-${i}`}
                    source={{ uri }}
                    style={styles.thumb}
                    resizeMode="cover"
                  />
                ))}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      <View style={s.sheetConfirm}>
        <MButton
          variant="primary"
          onPress={handleConfirm}
          disabled={selected.size === 0 || busy}
          loading={busy}
          testID="capsule-select-outfits-confirm"
        >
          {t('capsule.confirm_add')}
        </MButton>
      </View>
    </MBottomSheet>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    padding: theme.spacing.s,
    borderRadius: theme.borderRadius.figmaTile,
    marginBottom: theme.spacing.xs,
  },
  rowSelected: {
    borderWidth: 2,
    borderColor: theme.colors.figmaTextDark,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.figmaCardSurface,
  },
});
