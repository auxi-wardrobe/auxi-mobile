/**
 * Item picker panel — slides in from the right over the Outfit Canvas to let the
 * user pick wardrobe items to add. Fully prop-controlled (visible/onClose/
 * onConfirm); owns its own tab/selection/fetch state. Extracted verbatim from
 * OutfitCanvasScreen.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { motion } from '../../theme/motion';
import { wardrobeService, WardrobeItem } from '../../services/wardrobeService';
import { CategoryTabs } from '../../components/features/CategoryTabs';
import { DotsLoader } from '../../components/atoms/DotsLoader';
import { getImageUrl } from '../../utils/url';
import IconChevronLeft from '../../assets/images/icon_chevron_left.svg';
import {
  PICKER_FILTER_TABS,
  PICKER_PANEL_OFFSCREEN_X,
  PickerFilterTab,
  resolvePickerCategory,
} from './picker-constants';
import { pickerStyles } from './ItemPickerPanel.styles';

interface ItemPickerPanelProps {
  visible: boolean;
  onClose: () => void;
  // May be async: the panel keeps its "Add" button in a loading state until the
  // promise settles (the parent warms the image cache before placing items).
  onConfirm: (items: WardrobeItem[]) => void | Promise<void>;
}

export const ItemPickerPanel: React.FC<ItemPickerPanelProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const slideX = useRef(new Animated.Value(PICKER_PANEL_OFFSCREEN_X)).current;
  const [selectedTab, setSelectedTab] = useState<PickerFilterTab>('All');
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // True while the parent is warming the picked images / placing them on the
  // canvas — drives the "Add" button's spinner.
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    Animated.timing(slideX, {
      toValue: visible ? 0 : PICKER_PANEL_OFFSCREEN_X,
      duration: motion.duration.medium,
      easing: motion.easing.standard,
      useNativeDriver: true,
    }).start();
    if (!visible) {
      setSelectedIds([]);
      setConfirming(false);
    }
  }, [visible, slideX]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    const category = resolvePickerCategory(selectedTab);
    wardrobeService
      .filterWardrobeItems({ category })
      .then(data => {
        if (!cancelled) {
          setWardrobeItems(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWardrobeItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [visible, selectedTab]);

  const toggleItem = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const handleConfirm = async () => {
    if (confirming || selectedIds.length === 0) {
      return;
    }
    const chosen = wardrobeItems.filter(it => selectedIds.includes(it.id));
    setConfirming(true);
    try {
      await onConfirm(chosen);
    } finally {
      // Guard against a state update after the panel closed/unmounted: the
      // visibility effect already resets `confirming`, so this is a no-op then.
      setConfirming(false);
    }
  };

  return (
    <Animated.View
      style={[pickerStyles.panel, { transform: [{ translateX: slideX }] }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <SafeAreaView style={pickerStyles.safeArea}>
        {/* Header */}
        <View style={pickerStyles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={pickerStyles.backBtn}
            accessibilityLabel={t('outfitCanvas.a11y_close_picker')}
          >
            <IconChevronLeft width={24} height={24} />
          </TouchableOpacity>
          <Text style={pickerStyles.title}>
            {t('outfitCanvas.add_to_canvas')}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Category tabs + grid */}
        <View style={pickerStyles.body}>
          <CategoryTabs
            categories={[...PICKER_FILTER_TABS]}
            selectedCategory={selectedTab}
            onSelectCategory={tab => setSelectedTab(tab as PickerFilterTab)}
          />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={pickerStyles.scrollContent}
          >
            {loading ? (
              <DotsLoader style={pickerStyles.loading} />
            ) : wardrobeItems.length === 0 ? (
              <Text style={pickerStyles.empty}>
                {t('outfitCanvas.no_items_found')}
              </Text>
            ) : (
              <View style={pickerStyles.grid}>
                {wardrobeItems.map(item => {
                  const uri = getImageUrl(item.image_png ?? item.image_url);
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        pickerStyles.tile,
                        isSelected && pickerStyles.tileSelected,
                      ]}
                      activeOpacity={0.82}
                      onPress={() => toggleItem(item.id)}
                    >
                      {uri ? (
                        <Image
                          source={{ uri }}
                          style={pickerStyles.tileImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={pickerStyles.tileFallback}>
                          <Text style={pickerStyles.tileFallbackText}>
                            {t('common.no_image')}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>

        {/* Confirm button — switches to a loading spinner while the picked
            images are being warmed/placed (testID flips so Maestro can target
            either state). */}
        <View style={pickerStyles.footer}>
          <TouchableOpacity
            testID={
              confirming ? 'canvas-picker-confirm-loading' : 'canvas-picker-confirm'
            }
            style={[
              pickerStyles.confirmBtn,
              (selectedIds.length === 0 || confirming) &&
                pickerStyles.confirmBtnDisabled,
            ]}
            onPress={handleConfirm}
            disabled={selectedIds.length === 0 || confirming}
            activeOpacity={0.85}
          >
            {confirming ? (
              <View style={pickerStyles.confirmBtnLoadingRow}>
                <DotsLoader
                  color={theme.colors.figmaPrimaryButtonText}
                  accessibilityLabel={t('outfitCanvas.adding')}
                />
                <Text style={pickerStyles.confirmBtnLabel}>
                  {t('outfitCanvas.adding')}
                </Text>
              </View>
            ) : (
              <Text style={pickerStyles.confirmBtnLabel}>
                {selectedIds.length > 0
                  ? t('outfitCanvas.add_count', { count: selectedIds.length })
                  : t('outfitCanvas.add_to_canvas')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
};
