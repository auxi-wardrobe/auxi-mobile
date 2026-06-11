import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import {
  BottomSheetSurface,
  DividerRow,
  PillButton,
  TopIconButton,
} from '../components/primitives/FigmaPrimitives';
import { Icons } from '../assets/icons';
import {
  getItemFavoriteState,
  getItemFitLabel,
  getItemStyleTags,
  getItemUsageFrequency,
  UsageFrequency,
  WardrobeAttributeUpdate,
  WardrobeItem,
  wardrobeService,
} from '../services/wardrobeService';
import { theme } from '../theme/theme';
import { AppStackParamList } from '../types/navigation';
import { getImageUrl } from '../utils/url';

type ScreenNavigation = NativeStackNavigationProp<
  AppStackParamList,
  'ItemDetail'
>;
type ScreenRoute = RouteProp<AppStackParamList, 'ItemDetail'>;
type EditableField = 'category' | 'color' | 'fit' | 'style';

const CATEGORY_OPTIONS = [
  'Top',
  'Bottom',
  'Shoes',
  'One-piece',
  'Outerwear',
  'Accessory',
];
const FIT_OPTIONS = ['Slim', 'Regular', 'Oversize'];
const STYLE_OPTIONS = ['Casual', 'Business Casual', 'Formal'];
const COLOR_OPTIONS = [
  { label: 'Black', hex: '#272A32' },
  { label: 'Blue', hex: '#8EA1BE' },
  { label: 'Green', hex: '#7DAA8C' },
  { label: 'Grey', hex: '#8F939B' },
  { label: 'Red', hex: '#CC4C3E' },
  { label: 'White', hex: '#F5F7FA' },
  { label: 'Yellow', hex: '#D9C26A' },
  { label: 'Pink', hex: '#DAA2B1' },
  { label: 'Purple', hex: '#A493BE' },
  { label: 'Orange', hex: '#C68A5A' },
];
const STYLE_TAG_FAVORITE = 'favorite';
const STYLE_TAG_LESS_USED = 'less-used';
const FIT_TAG_PREFIX = 'fit:';

const toTitleCase = (value: string): string =>
  value.replace(/_/g, ' ').replace(/\b\w/g, match => match.toUpperCase());

const normalizeCategoryLabel = (category?: string): string => {
  const normalized = category?.trim().toLowerCase() || '';

  switch (normalized) {
    case 'top':
      return 'Top';
    case 'bottom':
      return 'Bottom';
    case 'shoes':
      return 'Shoes';
    case 'one_piece':
    case 'one-piece':
    case 'dress':
      return 'One-piece';
    case 'outerwear':
      return 'Outerwear';
    case 'accessory':
    case 'ac':
      return 'Accessory';
    default:
      return normalized ? toTitleCase(normalized) : 'Top';
  }
};

const toApiCategory = (label: string): string => {
  const normalized = label.trim().toLowerCase();

  switch (normalized) {
    case 'top':
      return 'top';
    case 'bottom':
      return 'bottom';
    case 'shoes':
      return 'shoes';
    case 'one-piece':
      return 'one_piece';
    case 'outerwear':
      return 'outerwear';
    case 'accessory':
      return 'accessory';
    default:
      return normalized.replace(/\s+/g, '_');
  }
};

const normalizeFormalityLabel = (formalityLevel?: string): string => {
  if (!formalityLevel) {
    return 'Casual';
  }

  if (formalityLevel.toLowerCase() === 'business_casual') {
    return 'Business Casual';
  }

  return toTitleCase(formalityLevel.toLowerCase());
};

const toApiFormality = (label: string): string =>
  label.trim().toLowerCase().replace(/\s+/g, '_');

const findColorHex = (label: string): string =>
  COLOR_OPTIONS.find(option => option.label === label)?.hex || '#8EA1BE';

const normalizeColorLabel = (item: WardrobeItem): string => {
  if (item.dominant_color && typeof item.dominant_color === 'string') {
    return toTitleCase(item.dominant_color.toLowerCase());
  }

  if (Array.isArray(item.colors) && item.colors.length > 0) {
    return toTitleCase(String(item.colors[0]).toLowerCase());
  }

  if (typeof item.color_hex === 'string' && item.color_hex) {
    const matchedColor = COLOR_OPTIONS.find(
      option => option.hex.toLowerCase() === item.color_hex?.toLowerCase(),
    );
    return matchedColor?.label || 'Custom';
  }

  return 'Blue';
};

const normalizeColorHex = (item: WardrobeItem, colorLabel: string): string => {
  if (
    colorLabel === 'Custom' &&
    typeof item.color_hex === 'string' &&
    item.color_hex
  ) {
    return item.color_hex;
  }

  return findColorHex(colorLabel);
};

const replaceTag = (
  tags: string[],
  tagToReplace: string,
  enabled: boolean,
): string[] => {
  const nextTags = tags.filter(tag => tag !== tagToReplace);

  if (enabled) {
    nextTags.push(tagToReplace);
  }

  return nextTags;
};

const replaceFitTag = (tags: string[], fitLabel: string): string[] => {
  const nextTags = tags.filter(tag => !tag.startsWith(FIT_TAG_PREFIX));
  nextTags.push(`${FIT_TAG_PREFIX}${fitLabel.trim().toLowerCase()}`);
  return nextTags;
};

const areTagsEqual = (left: string[], right: string[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((tag, index) => tag === right[index]);
};

type TFn = (key: string, options?: Record<string, unknown>) => string;

const getFriendlyError = (error: any, fallback: string, t: TFn): string => {
  switch (error?.response?.status) {
    case 403:
      return t('wardrobe.itemDetail.error_403');
    case 404:
      return t('wardrobe.itemDetail.error_404');
    case 429:
      return t('wardrobe.itemDetail.error_429');
    default:
      return fallback;
  }
};

export const ItemDetailScreen = () => {
  const navigation = useNavigation<ScreenNavigation>();
  const route = useRoute<ScreenRoute>();
  const { t } = useTranslation();
  const { itemId } = route.params;

  const [item, setItem] = useState<WardrobeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [pickerField, setPickerField] = useState<EditableField | null>(null);
  const [draftCategory, setDraftCategory] = useState('Top');
  const [draftColor, setDraftColor] = useState('Blue');
  const [draftFit, setDraftFit] = useState('Regular');
  const [draftStyle, setDraftStyle] = useState('Casual');
  const [showMore, setShowMore] = useState(false);

  const syncDraftsFromItem = (nextItem: WardrobeItem) => {
    setDraftCategory(normalizeCategoryLabel(nextItem.category));
    setDraftColor(normalizeColorLabel(nextItem));
    setDraftFit(getItemFitLabel(nextItem));
    setDraftStyle(
      normalizeFormalityLabel(nextItem.formality_level as string | undefined),
    );
  };

  useEffect(() => {
    let cancelled = false;

    const loadItem = async () => {
      try {
        setLoading(true);
        const data = await wardrobeService.getWardrobeItem(itemId);

        if (!data) {
          Toast.show({
            type: 'error',
            text1: t('wardrobe.itemDetail.toast_item_not_found'),
            position: 'bottom',
          });
          navigation.goBack();
          return;
        }

        if (!cancelled) {
          setItem(data);
          syncDraftsFromItem(data);
        }
      } catch (error) {
        console.error('Failed to load wardrobe item', error);

        if (!cancelled) {
          Toast.show({
            type: 'error',
            text1: t('wardrobe.itemDetail.toast_load_failed_title'),
            text2: t('wardrobe.itemDetail.toast_load_failed_body'),
            position: 'bottom',
          });
          navigation.goBack();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadItem();

    return () => {
      cancelled = true;
    };
  }, [itemId, navigation, t]);

  const imageUrl = useMemo(() => getImageUrl(item?.image_url), [item]);

  const isFavorited = getItemFavoriteState(item);
  const usageFrequency = getItemUsageFrequency(item);
  const isCommonSystemItem = item?.is_common_item === true;
  // AU-287: SYSTEM common items AND per-user clones (USR_* hrid) belong to
  // the suggestion catalog. Both are immutable — users demote via LESS_USE
  // instead of permanent delete.
  const isCatalogItem =
    isCommonSystemItem ||
    (typeof item?.human_readable_id === 'string' &&
      item.human_readable_id.startsWith('USR_'));

  const getPickerOptions = (field: EditableField): string[] => {
    switch (field) {
      case 'category':
        return CATEGORY_OPTIONS;
      case 'color':
        return COLOR_OPTIONS.map(option => option.label);
      case 'fit':
        return FIT_OPTIONS;
      case 'style':
        return STYLE_OPTIONS;
      default:
        return [];
    }
  };

  const getPickerFieldLabel = (field: EditableField): string => {
    switch (field) {
      case 'category':
        return t('wardrobe.itemDetail.row_type');
      case 'color':
        return t('wardrobe.itemDetail.row_color');
      case 'fit':
        return t('wardrobe.itemDetail.row_fit');
      case 'style':
        return t('wardrobe.itemDetail.row_style');
      default:
        return '';
    }
  };

  const handleSelectOption = (option: string) => {
    if (!pickerField) {
      return;
    }

    switch (pickerField) {
      case 'category':
        setDraftCategory(option);
        break;
      case 'color':
        setDraftColor(option);
        break;
      case 'fit':
        setDraftFit(option);
        break;
      case 'style':
        setDraftStyle(option);
        break;
      default:
        break;
    }

    setPickerField(null);
  };

  const handleToggleFavorite = async () => {
    if (!item || saving) {
      return;
    }

    const nextFavorited = !isFavorited;
    const previousItem = item;
    const nextTags = replaceTag(
      getItemStyleTags(item),
      STYLE_TAG_FAVORITE,
      nextFavorited,
    );

    setItem({
      ...item,
      is_favorited: nextFavorited,
      style_tags: nextTags,
    });

    try {
      const updatedItem = await wardrobeService.toggleFavorite(
        item.id,
        nextFavorited,
      );
      setItem(currentItem =>
        currentItem
          ? {
              ...currentItem,
              ...updatedItem,
              is_favorited: nextFavorited,
              style_tags: Array.isArray(updatedItem.style_tags)
                ? updatedItem.style_tags
                : nextTags,
            }
          : currentItem,
      );
    } catch (error) {
      console.error('Failed to toggle favorite', error);
      setItem(previousItem);
      Toast.show({
        type: 'error',
        text1: t('wardrobe.itemDetail.toast_favorite_failed_title'),
        text2: getFriendlyError(
          error,
          t('wardrobe.itemDetail.toast_generic_update_failed'),
          t,
        ),
        position: 'bottom',
      });
    }
  };

  const handleToggleUsageFrequency = async () => {
    if (!item || saving) {
      return;
    }

    const nextUsageFrequency: UsageFrequency =
      usageFrequency === 'LESS_USED' ? 'NORMAL' : 'LESS_USED';
    const previousItem = item;
    const nextTags = replaceTag(
      getItemStyleTags(item),
      STYLE_TAG_LESS_USED,
      nextUsageFrequency === 'LESS_USED',
    );

    setItem({
      ...item,
      usage_frequency: nextUsageFrequency,
      style_tags: nextTags,
    });

    try {
      const updatedItem = await wardrobeService.updateUsageFrequency(
        item.id,
        nextUsageFrequency,
      );
      setItem(currentItem =>
        currentItem
          ? {
              ...currentItem,
              ...updatedItem,
              usage_frequency: nextUsageFrequency,
              style_tags: Array.isArray(updatedItem.style_tags)
                ? updatedItem.style_tags
                : nextTags,
            }
          : currentItem,
      );
    } catch (error) {
      console.error('Failed to update usage frequency', error);
      setItem(previousItem);
      Toast.show({
        type: 'error',
        text1: t('wardrobe.itemDetail.toast_usage_failed_title'),
        text2: getFriendlyError(
          error,
          t('wardrobe.itemDetail.toast_generic_update_failed'),
          t,
        ),
        position: 'bottom',
      });
    }
  };

  const handleDelete = () => {
    if (!item) {
      return;
    }

    // AU-287 defense-in-depth: Trash button is hidden for catalog items,
    // but keep this guard in case handleDelete is wired up by another caller
    // in the future (long-press, swipe, etc.).
    if (isCatalogItem) {
      Toast.show({
        type: 'error',
        text1: t('wardrobe.itemDetail.toast_catalog_delete_blocked'),
        position: 'bottom',
      });
      return;
    }

    Alert.alert(
      t('wardrobe.itemDetail.delete_title'),
      t('wardrobe.itemDetail.delete_body'),
      [
        {
          text: t('wardrobe.itemDetail.cancel'),
          style: 'cancel',
        },
        {
          text: t('wardrobe.itemDetail.delete_confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await wardrobeService.deleteWardrobeItem(item.id);
              Toast.show({
                type: 'success',
                text1: t('wardrobe.itemDetail.toast_deleted'),
                position: 'bottom',
              });
              navigation.goBack();
            } catch (error) {
              console.error('Failed to delete item', error);
              Toast.show({
                type: 'error',
                text1: t('wardrobe.itemDetail.toast_delete_failed_title'),
                text2: getFriendlyError(
                  error,
                  t('wardrobe.itemDetail.toast_delete_failed_body'),
                  t,
                ),
                position: 'bottom',
              });
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const handleCancelEditing = () => {
    if (!item) {
      setIsEditing(false);
      return;
    }

    syncDraftsFromItem(item);
    setPickerField(null);
    setIsEditing(false);
  };

  const handleSaveEdits = async () => {
    if (!item || saving) {
      return;
    }

    const currentColor = normalizeColorLabel(item);
    const currentStyle = normalizeFormalityLabel(
      item.formality_level as string | undefined,
    );
    const currentCategory = normalizeCategoryLabel(item.category);
    const currentFitTags = getItemStyleTags(item);
    const nextFitTags = replaceFitTag(currentFitTags, draftFit);

    const payload: WardrobeAttributeUpdate = {};

    if (draftCategory !== currentCategory) {
      payload.category = toApiCategory(draftCategory);
    }

    if (draftColor !== currentColor) {
      payload.dominant_color = draftColor.toLowerCase();
      payload.colors = [draftColor.toLowerCase()];
      payload.color_hex = findColorHex(draftColor);
    }

    if (draftStyle !== currentStyle) {
      payload.formality_level = toApiFormality(draftStyle);
    }

    if (!areTagsEqual(nextFitTags, currentFitTags)) {
      payload.style_tags = nextFitTags;
    }

    if (!Object.keys(payload).length) {
      setIsEditing(false);
      return;
    }

    try {
      setSaving(true);
      const updatedItem = await wardrobeService.updateWardrobeItemAttributes(
        item.id,
        payload,
      );

      const mergedItem: WardrobeItem = {
        ...item,
        ...updatedItem,
      };

      if (payload.category) {
        mergedItem.category = payload.category;
      }
      if (payload.dominant_color) {
        mergedItem.dominant_color = payload.dominant_color;
      }
      if (payload.colors) {
        mergedItem.colors = payload.colors;
      }
      if (payload.color_hex) {
        mergedItem.color_hex = payload.color_hex;
      }
      if (payload.formality_level) {
        mergedItem.formality_level = payload.formality_level;
      }
      if (payload.style_tags) {
        mergedItem.style_tags = payload.style_tags;
      }

      setItem(mergedItem);
      syncDraftsFromItem(mergedItem);
      setIsEditing(false);

      Toast.show({
        type: 'success',
        text1: t('wardrobe.itemDetail.toast_updated'),
        position: 'bottom',
      });
    } catch (error) {
      console.error('Failed to save item updates', error);
      Toast.show({
        type: 'error',
        text1: t('wardrobe.itemDetail.toast_save_failed_title'),
        text2: getFriendlyError(
          error,
          t('wardrobe.itemDetail.toast_save_failed_body'),
          t,
        ),
        position: 'bottom',
      });
    } finally {
      setSaving(false);
    }
  };

  const renderDetailRow = (
    label: string,
    value: string,
    field: EditableField,
    hideDivider?: boolean,
  ) => {
    const canEdit = isEditing && !isCatalogItem;
    const showColor = field === 'color';
    const colorHex =
      showColor && item ? normalizeColorHex(item, draftColor) : null;

    return (
      <TouchableOpacity
        testID={`item-detail-row-${field}`}
        activeOpacity={0.85}
        disabled={!canEdit}
        onPress={() => setPickerField(field)}
      >
        <DividerRow
          label={label}
          hideDivider={hideDivider}
          labelStyle={styles.rowLabel}
          rightNode={
            <View style={styles.rowRight}>
              {showColor && colorHex ? (
                <View
                  style={[styles.colorDot, { backgroundColor: colorHex }]}
                />
              ) : null}
              <Text style={styles.rowValue}>{value}</Text>
              {canEdit ? (
                <Icons.Edit
                  width={18}
                  height={18}
                  color={theme.colors.figmaTextDark}
                />
              ) : null}
            </View>
          }
        />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.figmaAction} />
      </View>
    );
  }

  if (!item) {
    return null;
  }

  return (
    <SafeAreaView testID="item-detail-screen-root" style={styles.container}>
      <View style={styles.topRegion}>
        <View style={styles.topBar}>
          <TopIconButton
            testID="item-detail-back-btn"
            accessibilityLabel={t('uac.common.back')}
            onPress={() => navigation.goBack()}
            icon={
              <Icons.ChevronLeft
                width={22}
                height={22}
                color={theme.colors.figmaAction}
              />
            }
          />

          <TopIconButton
            testID={
              isFavorited
                ? 'item-detail-favorite-btn-active'
                : 'item-detail-favorite-btn'
            }
            accessibilityLabel={t('wardrobe.itemDetail.a11y_favorite')}
            onPress={() => {
              handleToggleFavorite();
            }}
            disabled={saving}
            style={isFavorited ? styles.heartButtonActive : undefined}
            icon={<Icons.Heart width={22} height={22} />}
          />
        </View>

        <View style={styles.imageWrap}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.imageFallback}>
              <Text style={styles.imageFallbackText}>
                {t('wardrobe.itemDetail.image_unavailable')}
              </Text>
            </View>
          )}

          {isCatalogItem ? (
            <View style={styles.imageBadge}>
              <Text style={styles.imageBadgeText}>
                {t('wardrobe.itemDetail.common_badge')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <BottomSheetSurface style={styles.sheet}>
        <View style={styles.details}>
          {/* Name — read-only (free-text edit needs a text-input picker; the
              option picker only supports enumerations. Tracked in extraction
              note §New backend fields). Energy/Lable/Material/Occasion/Purchase
              Date in Figma are mock fields with no API contract — omitted until
              backend support lands. */}
          {item.name ? (
            <DividerRow
              label={t('wardrobe.itemDetail.row_name')}
              value={item.name}
              labelStyle={styles.rowLabel}
              valueStyle={styles.rowValue}
            />
          ) : null}
          {renderDetailRow(
            t('wardrobe.itemDetail.row_type'),
            draftCategory,
            'category',
          )}
          {renderDetailRow(
            t('wardrobe.itemDetail.row_style'),
            draftStyle,
            'style',
            !showMore,
          )}
          {showMore
            ? renderDetailRow(
                t('wardrobe.itemDetail.row_color'),
                draftColor,
                'color',
              )
            : null}
          {showMore
            ? renderDetailRow(
                t('wardrobe.itemDetail.row_fit'),
                draftFit,
                'fit',
                true,
              )
            : null}

          <View style={styles.expandRow}>
            <TouchableOpacity
              testID={
                showMore ? 'item-detail-less-btn' : 'item-detail-more-btn'
              }
              onPress={() => setShowMore(prev => !prev)}
              style={styles.expandButton}
            >
              <Text style={styles.expandText}>
                {showMore
                  ? t('wardrobe.itemDetail.less')
                  : t('wardrobe.itemDetail.more')}
              </Text>
            </TouchableOpacity>

            {/* Read-mode "Edit" link enters edit mode. In edit mode the link is
                disabled/greyed (per Figma "more - edit"); discard/persist move to
                the bottom Cancel/Save bar. Hidden entirely for catalog items. */}
            {!isCatalogItem ? (
              <TouchableOpacity
                testID="item-detail-edit-link"
                style={styles.editLink}
                onPress={() => setIsEditing(true)}
                disabled={isEditing || saving}
              >
                <Text
                  style={[styles.editText, isEditing && styles.disabledText]}
                >
                  {t('wardrobe.itemDetail.edit')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.actionBlock}>
          {isEditing ? (
            // EDIT MODE (Figma "detail - save" / "more - edit"): bottom shifts to
            // [Cancel] [Save]. Cancel discards drafts + exits; Save persists via
            // wardrobeService.updateWardrobeItemAttributes.
            <View style={styles.editActionRow}>
              <PillButton
                testID="item-detail-cancel-btn"
                variant="text"
                title={t('wardrobe.itemDetail.cancel')}
                onPress={handleCancelEditing}
                disabled={saving}
                style={styles.editCancelButton}
              />
              <PillButton
                testID="item-detail-save-btn"
                variant="filled"
                title={t('wardrobe.itemDetail.save')}
                onPress={handleSaveEdits}
                loading={saving}
                disabled={saving}
                style={styles.editSaveButton}
              />
            </View>
          ) : (
            // READ MODE (Figma "detail item - more"): Mix-with-this pill +
            // [Trash][Less used] / [Change] row.
            <>
              <PillButton
                testID="item-detail-mix-btn"
                variant="outline"
                title={t('wardrobe.itemDetail.mix_with_this')}
                trailing={
                  <Icons.Remix
                    width={20}
                    height={20}
                    color={theme.colors.figmaAction}
                  />
                }
                style={styles.mixPill}
                onPress={() => {
                  Alert.alert(
                    t('wardrobe.itemDetail.coming_soon_title'),
                    t('wardrobe.itemDetail.coming_soon_body'),
                  );
                }}
              />

              <View style={styles.bottomRow}>
                <View style={styles.leftRow}>
                  {/* AU-287: Trash hidden for catalog items (SYSTEM + USR_*
                      clones). User demotes them via the Less used toggle. */}
                  {!isCatalogItem ? (
                    <TouchableOpacity
                      testID="item-detail-delete-btn"
                      accessibilityLabel={t('wardrobe.itemDetail.a11y_delete')}
                      onPress={handleDelete}
                      style={styles.iconOnlyButton}
                      disabled={saving}
                    >
                      <Icons.Trash
                        width={20}
                        height={20}
                        color={theme.colors.figmaItemDetailDanger}
                      />
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    testID={
                      usageFrequency === 'LESS_USED'
                        ? 'item-detail-less-used-btn-active'
                        : 'item-detail-less-used-btn'
                    }
                    style={[
                      styles.secondaryAction,
                      usageFrequency === 'LESS_USED' &&
                        styles.secondaryActionActive,
                    ]}
                    onPress={() => {
                      handleToggleUsageFrequency();
                    }}
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.lessUsedText,
                        usageFrequency === 'LESS_USED' &&
                          styles.lessUsedTextActive,
                      ]}
                    >
                      {t('wardrobe.itemDetail.less_used')}
                    </Text>
                    <Icons.MinusCircle
                      width={20}
                      height={20}
                      color={
                        usageFrequency === 'LESS_USED'
                          ? theme.colors.figmaItemDetailDanger
                          : theme.colors.figmaAction
                      }
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  testID="item-detail-change-btn"
                  style={styles.secondaryAction}
                  onPress={() => setIsEditing(true)}
                  disabled={saving || isCatalogItem}
                >
                  <Text
                    style={[
                      styles.changeText,
                      isCatalogItem && styles.disabledText,
                    ]}
                  >
                    {t('wardrobe.itemDetail.change')}
                  </Text>
                  <Icons.Change
                    width={20}
                    height={20}
                    color={theme.colors.figmaAction}
                  />
                </TouchableOpacity>
              </View>

              {isCatalogItem ? (
                <Text
                  testID="item-detail-catalog-explainer"
                  style={styles.catalogExplainer}
                >
                  {t('wardrobe.itemDetail.catalog_explainer')}
                </Text>
              ) : null}
            </>
          )}
        </View>
      </BottomSheetSurface>

      <Modal
        visible={!!pickerField}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerField(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('wardrobe.itemDetail.picker_title', {
                  field: pickerField ? getPickerFieldLabel(pickerField) : '',
                })}
              </Text>
              <TouchableOpacity
                testID="item-detail-picker-close-btn"
                onPress={() => setPickerField(null)}
              >
                <Text style={styles.modalClose}>
                  {t('wardrobe.itemDetail.picker_close')}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {(pickerField ? getPickerOptions(pickerField) : []).map(
                option => {
                  const isSelected =
                    (pickerField === 'category' && draftCategory === option) ||
                    (pickerField === 'color' && draftColor === option) ||
                    (pickerField === 'fit' && draftFit === option) ||
                    (pickerField === 'style' && draftStyle === option);

                  return (
                    <TouchableOpacity
                      key={option}
                      testID={`item-detail-option-${option}`}
                      style={styles.optionItem}
                      onPress={() => handleSelectOption(option)}
                    >
                      <View style={styles.optionLeft}>
                        {pickerField === 'color' ? (
                          <View
                            style={[
                              styles.optionColorDot,
                              { backgroundColor: findColorHex(option) },
                            ]}
                          />
                        ) : null}
                        <Text style={styles.optionText}>{option}</Text>
                      </View>
                      {isSelected ? (
                        <Icons.ChevronRight
                          width={18}
                          height={18}
                          color={theme.colors.figmaAction}
                        />
                      ) : null}
                    </TouchableOpacity>
                  );
                },
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaSurfaceSoft,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.figmaSurfaceSoft,
  },
  topRegion: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  heartButtonActive: {
    backgroundColor: theme.colors.figmaItemDetailFavoriteActive,
  },
  imageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 14,
  },
  image: {
    width: '100%',
    height: '100%',
    maxHeight: 430,
  },
  imageFallback: {
    width: '92%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    backgroundColor: theme.colors.figmaItemDetailImageFallbackBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageFallbackText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaTextMuted,
  },
  imageBadge: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    minHeight: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(39, 42, 50, 0.9)',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageBadgeText: {
    ...theme.typography.aliases.interCaptionXxs,
    fontSize: 11,
    lineHeight: 14,
    color: theme.colors.white,
  },
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  details: {
    gap: 8,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowLabel: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaItemDetailRowText,
  },
  rowValue: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.figmaItemDetailRowText,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.figmaItemDetailColorDotBorder,
  },
  actionBlock: {
    marginTop: 22,
    gap: 8,
  },
  bottomRow: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconOnlyButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryAction: {
    height: 56,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  secondaryActionActive: {
    backgroundColor: theme.colors.figmaItemDetailLessUsedActive,
  },
  lessUsedText: {
    ...theme.typography.aliases.uacBodyMdMedium,
    color: theme.colors.figmaAction,
  },
  lessUsedTextActive: {
    color: theme.colors.figmaItemDetailDanger,
  },
  changeText: {
    ...theme.typography.aliases.uacBodyMdMedium,
    color: theme.colors.figmaAction,
  },
  editText: {
    ...theme.typography.aliases.uacBodyXsMedium,
    color: theme.colors.figmaTextDark,
  },
  editLink: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  editActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  editCancelButton: {
    flex: 1,
    // Figma "Text button / size 56": match the Save pill's height + radius so
    // the two bottom buttons align. PillButton's `text` variant defaults to h40.
    height: 56,
    borderRadius: 100,
    paddingHorizontal: 20,
  },
  editSaveButton: {
    flex: 1,
    borderRadius: 16,
  },
  mixPill: {
    alignSelf: 'stretch',
    // qa-ui M4 (Figma node 2852-7175): Mix pill is a rounded rect (r16), not a
    // stadium. PillButton.pillBase defaults to r100; override here only.
    borderRadius: 16,
  },
  disabledText: {
    opacity: 0.45,
  },
  catalogExplainer: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextMuted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '55%',
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.figmaItemDetailModalDivider,
  },
  modalTitle: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.figmaItemDetailRowText,
  },
  modalClose: {
    ...theme.typography.aliases.uacBodyMdMedium,
    color: theme.colors.figmaItemDetailModalClose,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.figmaItemDetailOptionDivider,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionColorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: theme.colors.figmaItemDetailOptionDotBorder,
  },
  optionText: {
    ...theme.typography.aliases.interBodyMd,
    color: theme.colors.figmaItemDetailRowText,
  },
  expandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  expandButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  expandText: {
    ...theme.typography.aliases.uacBodyXsMedium,
    color: theme.colors.figmaTextDark,
  },
});
