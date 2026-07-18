import React, { useMemo, useState } from 'react';
import { Dimensions, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  MBottomSheet,
  MButton,
} from '../../../components/design-system/lib';
import { MacgieLoader } from '../../../components/macgie';
import {
  wardrobeKeys,
  wardrobeService,
} from '../../../services/wardrobeService';
import { capsuleStyles as s } from '../styles';
import { CapsuleItemTile } from './CapsuleItemTile';

interface SelectWardrobeItemsSheetProps {
  visible: boolean;
  /** Item ids already in the capsule → disabled + "Already in capsule" tag. */
  existingItemIds: Set<string>;
  busy?: boolean;
  onDismiss: () => void;
  onConfirm: (itemIds: string[]) => void;
  /** 'single' picks exactly one (change/replace flow); default 'multi' (add). */
  mode?: 'single' | 'multi';
  /** Override the confirm button label (defaults to "Add to capsule"). */
  confirmLabel?: string;
  /** Extra item ids to disable (e.g. the item being replaced). */
  excludeItemIds?: Set<string>;
}

const COLUMNS = 4;
const H_PADDING = 16; // sheet content padding (matches MBottomSheet card pad)
const GAP = 8;

/**
 * Wardrobe-item multi-select grid for the capsule add flow. Items already in
 * the capsule are dimmed + tagged and cannot be re-selected (dedup at the UI
 * layer; the backend dedups again).
 */
export const SelectWardrobeItemsSheet: React.FC<
  SelectWardrobeItemsSheetProps
> = ({
  visible,
  existingItemIds,
  busy,
  onDismiss,
  onConfirm,
  mode = 'multi',
  confirmLabel,
  excludeItemIds,
}) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: items = [], isLoading } = useQuery({
    queryKey: wardrobeKeys.list(),
    queryFn: wardrobeService.getWardrobeItems,
    enabled: visible,
  });

  const tileSize = useMemo(() => {
    const width = Dimensions.get('window').width - H_PADDING * 2;
    return Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS);
  }, []);

  const toggle = (id: string) => {
    setSelected(prev => {
      if (mode === 'single') {
        return prev.has(id) ? new Set() : new Set([id]);
      }
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

  return (
    <MBottomSheet
      visible={visible}
      onDismiss={onDismiss}
      testID="capsule-select-wardrobe-sheet"
    >
      <Text style={s.sheetTitle}>{t('capsule.source_wardrobe')}</Text>
      {isLoading ? (
        <View style={s.sheetLoading}>
          <MacgieLoader variant="inline" testID="capsule-select-loading" />
        </View>
      ) : (
        <ScrollView style={s.sheetScroll} contentContainerStyle={s.grid}>
          {items.map(item => (
            <CapsuleItemTile
              key={item.id}
              item={item}
              size={tileSize}
              selected={selected.has(item.id)}
              disabled={
                (mode === 'multi' && existingItemIds.has(item.id)) ||
                (excludeItemIds?.has(item.id) ?? false)
              }
              alreadyLabel={t('capsule.already_in_capsule')}
              onPress={() => toggle(item.id)}
              testID={`capsule-select-item-${item.id}`}
            />
          ))}
        </ScrollView>
      )}
      <View style={s.sheetConfirm}>
        <MButton
          variant="primary"
          onPress={handleConfirm}
          disabled={selected.size === 0 || busy}
          loading={busy}
          testID="capsule-select-wardrobe-confirm"
        >
          {confirmLabel ?? t('capsule.confirm_add')}
        </MButton>
      </View>
    </MBottomSheet>
  );
};
