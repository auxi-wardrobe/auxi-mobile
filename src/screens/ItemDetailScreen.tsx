import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MBottomSheet } from '../components/design-system/lib';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import {
  BottomSheetSurface,
  DividerRow,
  PillButton,
  TopIconButton,
} from '../components/primitives/FigmaPrimitives';
import { MacgieLoader } from '../components/macgie';
import { Icons } from '../assets/icons';
import {
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
import { track } from '../services/analytics';

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
const STYLE_TAG_LESS_USED = 'less-used';
const FIT_TAG_PREFIX = 'fit:';

// AU-312 (Figma 2852:14557) one-off literals — flagged in
// figma-extraction-item-detail.md §One-off literals, not in the spacing scale:
// image frame is 378 wide on the 414 frame → 18px side margins; frame is
// 378×504 (3:4); button group bottom padding 36 = home-indicator allowance.
const IMAGE_SIDE_MARGIN = 18;
const IMAGE_ASPECT = 3 / 4;
const SHEET_BOTTOM_PADDING = 36;

/**
 * AU-312: Figma read mode shows "Date: 11/06/2026" under the title.
 * Source field is `created_at`, rendered dd/mm/yyyy (qa-ui safe default #2).
 * Returns null on missing/invalid input so the row can be hidden (fallback
 * items pushed from Home carry no created_at). Exported for unit tests.
 */
export const formatItemDate = (iso?: string): string | null => {
  if (!iso) {
    return null;
  }

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const dd = String(parsed.getDate()).padStart(2, '0');
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${parsed.getFullYear()}`;
};

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
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { itemId, fallbackItem } = route.params;

  const [item, setItem] = useState<WardrobeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [pickerField, setPickerField] = useState<EditableField | null>(null);
  const [draftCategory, setDraftCategory] = useState('Top');
  const [draftColor, setDraftColor] = useState('Blue');
  const [draftFit, setDraftFit] = useState('Regular');
  const [draftStyle, setDraftStyle] = useState('Casual');
  // Measured size of the flexible region between header and bottom panel —
  // the 3:4 image frame is fitted into it (Figma: 378×504 centred, 18px
  // side margins; height-constrained devices shrink the frame, not crop it).
  const [imageRegion, setImageRegion] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const syncDraftsFromItem = (nextItem: WardrobeItem) => {
    setDraftCategory(normalizeCategoryLabel(nextItem.category));
    setDraftColor(normalizeColorLabel(nextItem));
    setDraftFit(getItemFitLabel(nextItem));
    setDraftStyle(
      normalizeFormalityLabel(nextItem.formality_level as string | undefined),
    );
  };

  useEffect(() => {
    // §3.7 #52: Fire once per mount. Source is derived from the navigation
    // payload: a fallbackItem only ever rides along with Home pushes (V05
    // recommendation injections), so its presence is the discriminator
    // between the Wardrobe-grid path and the Home-card path. database_search
    // path doesn't currently push ItemDetail directly.
    track('item_detail_opened', {
      item_id: itemId,
      source: fallbackItem ? 'home' : 'wardrobe',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    // AU-312 Q7 guard (documented decision): Home passes V05 recommendation
    // ids. `wardrobeService.getWardrobeItem` is a list+find over the USER's
    // wardrobe, so V05 `common_essential` injections (not cloned into the
    // wardrobe) miss the lookup. Instead of bouncing back with a "not found"
    // toast, render from the route's fallback payload; unfetchable fields
    // degrade gracefully (no created_at → date row hidden, no name →
    // category-label title, is_common_item → catalog rules apply).
    const applyFallback = (): boolean => {
      if (!fallbackItem) {
        return false;
      }

      const fromFallback: WardrobeItem = { ...fallbackItem };
      setItem(fromFallback);
      syncDraftsFromItem(fromFallback);
      return true;
    };

    const loadItem = async () => {
      try {
        setLoading(true);
        const data = await wardrobeService.getWardrobeItem(itemId);

        if (cancelled) {
          return;
        }

        if (!data) {
          if (applyFallback()) {
            return;
          }
          Toast.show({
            type: 'error',
            text1: t('wardrobe.itemDetail.toast_item_not_found'),
            position: 'bottom',
          });
          navigation.goBack();
          return;
        }

        setItem(data);
        syncDraftsFromItem(data);
      } catch (error) {
        console.error('Failed to load wardrobe item', error);

        if (cancelled) {
          return;
        }

        if (applyFallback()) {
          return;
        }

        Toast.show({
          type: 'error',
          text1: t('wardrobe.itemDetail.toast_load_failed_title'),
          text2: t('wardrobe.itemDetail.toast_load_failed_body'),
          position: 'bottom',
        });
        navigation.goBack();
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
  }, [itemId, fallbackItem, navigation, t]);

  // AU-312 review fix: prefer the background-removed cutout (`image_png`)
  // like every other surface (see utils/url.ts resolveItemImage). That
  // helper's input requires a non-optional `image_url` (legacy Item shape),
  // which WardrobeItem doesn't satisfy — apply the same png-first
  // preference via getImageUrl directly.
  const imageUrl = useMemo(
    () => getImageUrl(item?.image_png || item?.image_url),
    [item],
  );

  // Fit the Figma 378×504 (3:4) image frame into the measured flexible
  // region: width-bound on tall screens (region width − 2×18 margins),
  // height-bound on short ones so the frame never pushes the bottom panel.
  const imageFrame = useMemo(() => {
    if (!imageRegion) {
      return null;
    }

    const width = Math.max(
      Math.min(
        imageRegion.width - IMAGE_SIDE_MARGIN * 2,
        imageRegion.height * IMAGE_ASPECT,
      ),
      0,
    );
    return { width, height: width / IMAGE_ASPECT };
  }, [imageRegion]);

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

  // DISPLAY-ONLY: localize a canonical option value (e.g. 'Top', 'Black') for
  // rendering. The raw value still drives selection, lookup (toApiCategory /
  // findColorHex / toApiFormality), comparison, and persistence — never mutate
  // it. `EditableField` maps 1:1 to the `wardrobe.options.<group>` namespace.
  // defaultValue falls back to the canonical English if a key is missing.
  const getOptionDisplayLabel = (field: EditableField, value: string): string =>
    t(`wardrobe.options.${field}.${value}`, { defaultValue: value });

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

  // AU-312: favorite/heart removed from this screen — updated Figma header
  // variant is rightIcon=no (qa-ui safe default #1; flagged for CEO: where
  // does item-favoriting live next?).

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
              const deletedProps: Record<string, unknown> = {
                item_id: item.id,
              };
              if (item.category) {
                deletedProps.category = item.category;
              }
              track('wardrobe_item_deleted', deletedProps);
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

      // §3.4 #30: collapse API payload keys to user-facing field names so
      // analytics sees the human concept (color/fit) instead of the storage
      // shape (dominant_color/style_tags).
      const fieldsChanged: string[] = [];
      if (payload.category) {
        fieldsChanged.push('category');
      }
      if (payload.dominant_color || payload.colors || payload.color_hex) {
        fieldsChanged.push('color');
      }
      if (payload.formality_level) {
        fieldsChanged.push('style');
      }
      if (payload.style_tags) {
        fieldsChanged.push('fit');
      }
      track('wardrobe_item_edited', {
        item_id: item.id,
        fields_changed: fieldsChanged,
      });

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
    // Display-only: `value` stays the canonical draft for logic/persistence.
    const displayValue = getOptionDisplayLabel(field, value);

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
              <Text style={styles.rowValue}>{displayValue}</Text>
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
        <MacgieLoader testID="item-detail-loading" />
      </View>
    );
  }

  if (!item) {
    return null;
  }

  // Figma read mode shows ONLY title + date. Title = item name; fallback
  // items pushed from Home may carry no name → degrade to the category label.
  const titleText = item.name?.trim() || normalizeCategoryLabel(item.category);
  const dateText = formatItemDate(item.created_at);
  const isPreparing = item.is_preparing === true;
  // AU-351: backend exploration signal — the item is queued, waiting for a
  // suitable occasion to be recommended. Single status line for now; the
  // per-reason breakdown (weather/occasion/compatibility) is a documented
  // future enhancement.
  const isWaiting = item.exploration_waiting === true;

  return (
    <View testID="item-detail-screen-root" style={styles.container}>
      {/* Pinned header (Figma instance 3227:24191, variant rightIcon=no):
          single back button, white@90% bar extends behind the status bar.
          The Figma backdrop-blur 7.5 is approximated by the near-opaque
          rgba token — no blur dependency (qa-ui safe default #5). */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TopIconButton
          testID="item-detail-back-btn"
          accessibilityLabel={t('uac.common.back')}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          icon={
            // icon_chevron_left.svg has a baked #272A32 stroke shared by 6
            // other screens — normalizing it to currentColor is outside the
            // AU-312 blast radius. Figma wants #070707; the delta between
            // the two near-blacks is imperceptible. Follow-up: a
            // figma-icons-sync normalization pass over legacy SVGs.
            <Icons.ChevronLeft width={24} height={24} />
          }
        />
      </View>

      <View
        style={styles.imageRegion}
        onLayout={event => {
          const { width, height } = event.nativeEvent.layout;
          setImageRegion({ width, height });
        }}
      >
        {imageFrame ? (
          <View style={[styles.imageFrame, imageFrame]}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="cover"
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
        ) : null}
      </View>

      {/* Bottom panel (Figma component 3516:18640). Read mode = title +
          date + button group ONLY — attribute rows moved to the Edit flow
          (qa-ui safe default #3). pb 36 covers the home indicator zone
          (extraction §One-off literals); larger future insets win. */}
      <BottomSheetSurface
        style={{
          ...styles.sheet,
          paddingBottom: Math.max(SHEET_BOTTOM_PADDING, insets.bottom),
        }}
      >
        {isEditing ? (
          // EDIT MODE (Figma 3508:8356): editable attribute list + bottom
          // [Cancel] [Save]. Name stays read-only (free-text edit needs a
          // text-input picker; the option picker only supports enumerations
          // — tracked in extraction note §New backend fields).
          <>
            <View style={styles.details}>
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
              )}
              {renderDetailRow(
                t('wardrobe.itemDetail.row_color'),
                draftColor,
                'color',
              )}
              {renderDetailRow(
                t('wardrobe.itemDetail.row_fit'),
                draftFit,
                'fit',
                true,
              )}
            </View>

            <View style={styles.actionBlock}>
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
            </View>
          </>
        ) : (
          // READ MODE (Figma 2852:14557 "detail"): centred title + date,
          // outlined "Build around this" CTA, [trash][Less use] … [Edit].
          <>
            <View style={styles.titleBlock}>
              {isPreparing ? (
                <>
                  <View style={styles.skeletonTitle} />
                  <View style={styles.skeletonDate} />
                </>
              ) : (
                <>
                  <Text testID="item-detail-title" style={styles.titleText}>
                    {titleText}
                  </Text>
                  {dateText ? (
                    <Text testID="item-detail-date" style={styles.dateText}>
                      {t('wardrobe.itemDetail.date_label', { date: dateText })}
                    </Text>
                  ) : null}
                  {/* AU-351: single "Waiting for the right occasion" status
                      line when the backend flags the item as exploration-
                      waiting. Per-reason breakdown deferred. */}
                  {isWaiting ? (
                    <Text
                      testID="item-detail-waiting-status"
                      style={styles.waitingStatus}
                    >
                      {t('wardrobe.itemDetail.waiting_status')}
                    </Text>
                  ) : null}
                </>
              )}
            </View>

            <View style={styles.buttonGroup}>
              {/* AU-307 phase 05 — "Build around this" navigates Home with
                  `pinFromDetail` set to the item id. HomeScreen's mount
                  effect dispatches CONFIRM_PIN_FROM_DETAIL (skips modal),
                  then clears the param. SYSTEM common-essential items hide
                  the CTA entirely (spec §9 IDOR / SYSTEM-item defense-in-
                  depth; BE rejects 422 as backup). testID preserved so
                  existing Maestro flows keep resolving. */}
              {!isCommonSystemItem ? (
                <PillButton
                  testID="item-detail-mix-btn"
                  variant="outline"
                  title={t('wardrobe.itemDetail.build_around_this')}
                  trailing={
                    <Icons.Remix
                      width={24}
                      height={24}
                      color={theme.colors.uacTextBase}
                    />
                  }
                  style={styles.ctaPill}
                  textStyle={styles.ctaPillText}
                  onPress={() => {
                    navigation.navigate('Home', { pinFromDetail: itemId });
                  }}
                  disabled={isPreparing}
                />
              ) : null}

              <View style={styles.bottomRow}>
                <View style={styles.leftRow}>
                  {/* AU-287: Trash hidden for catalog items (SYSTEM + USR_*
                      clones). User demotes them via the Less use toggle. */}
                  {!isCatalogItem ? (
                    <TouchableOpacity
                      testID="item-detail-delete-btn"
                      accessibilityLabel={t('wardrobe.itemDetail.a11y_delete')}
                      onPress={handleDelete}
                      style={styles.iconOnlyButton}
                      disabled={saving || isPreparing}
                    >
                      <Icons.Trash
                        width={24}
                        height={24}
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
                    disabled={saving || isPreparing}
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
                      width={24}
                      height={24}
                      color={theme.colors.figmaItemDetailDanger}
                    />
                  </TouchableOpacity>
                </View>

                {/* Figma renames "Change" → "Edit" with a pencil glyph; same
                    behaviour (enters edit mode). testID preserved for
                    existing Maestro flows. */}
                <TouchableOpacity
                  testID="item-detail-change-btn"
                  style={styles.secondaryAction}
                  onPress={() => setIsEditing(true)}
                  disabled={saving || isCatalogItem || isPreparing}
                >
                  <Text
                    style={[
                      styles.editActionText,
                      isCatalogItem && styles.disabledText,
                    ]}
                  >
                    {t('wardrobe.itemDetail.edit')}
                  </Text>
                  <Icons.Edit
                    width={24}
                    height={24}
                    color={theme.colors.uacTextBase}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </BottomSheetSurface>

      <MBottomSheet
        visible={!!pickerField}
        onDismiss={() => setPickerField(null)}
        testID="item-detail-picker-sheet"
      >
        <View style={styles.modalBody}>
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
            {(pickerField ? getPickerOptions(pickerField) : []).map(option => {
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
                    <Text style={styles.optionText}>
                      {pickerField
                        ? getOptionDisplayLabel(pickerField, option)
                        : option}
                    </Text>
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
            })}
          </ScrollView>
        </View>
      </MBottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Figma frame bg: background/primary/subtle_50 #f2efec
    backgroundColor: theme.colors.figmaBackground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.figmaBackground,
  },
  // Figma header inner: column justify-end, padding 12 → bar = status area
  // + 44pt button + 12pt bottom padding (≈107 on the 414×896 frame).
  header: {
    backgroundColor: theme.colors.figmaItemDetailHeaderBg,
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingBottom: theme.spacing.uacDimension12,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  // Figma "menu" back button: 44×44 white rounded square (r≈14, baked into
  // an image asset — qa-ui safe default #8), soft warm drop shadow tinted
  // background/overlay/dark/10 (#827137 @10%).
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: theme.colors.white,
    shadowColor: theme.colors.figmaOverlayDark10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  imageRegion: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFrame: {
    backgroundColor: theme.colors.figmaBackground,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.figmaItemDetailImageFallbackBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageFallbackText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaTextMuted,
  },
  // Figma "common" badge: centred, bottom 19 (one-off), h19, padX 12, r8,
  // bg color/neutral/black/Alpha300, Inter Regular 10/12, text #fcfcfd.
  imageBadge: {
    position: 'absolute',
    bottom: 19,
    alignSelf: 'center',
    minHeight: 19,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.figmaCardTag,
    paddingHorizontal: theme.spacing.uacDimension12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageBadgeText: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.uacBackgroundNeutral50,
  },
  sheet: {
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.m,
  },
  // Figma "List items": pt 12, column gap 16, centred, text/neutral/base.
  titleBlock: {
    paddingTop: theme.spacing.uacDimension12,
    alignItems: 'center',
    gap: theme.spacing.m,
  },
  titleText: {
    ...theme.typography.aliases.poppinsH4SemiBold,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
  dateText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
  },
  // AU-351: "Waiting for the right occasion" status — muted secondary text,
  // centred to match the title block. Token-styled (no hex).
  waitingStatus: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
  // Figma "button group": column, gap 12, pt 16 (pb handled inline with the
  // safe-area inset).
  buttonGroup: {
    paddingTop: theme.spacing.m,
    gap: theme.spacing.uacDimension12,
  },
  // "Build around this": outline pill, border 1.5 border/neutral/base,
  // padX 20. Radius reuses uacButtonCta=16 — Figma draws 17, deliberate 1px
  // deviation pending CEO answer (qa-ui safe default #4).
  ctaPill: {
    alignSelf: 'stretch',
    borderRadius: theme.borderRadius.uacButtonCta,
    borderColor: theme.colors.uacBorderBase,
    paddingHorizontal: theme.spacing.uacButtonPaddingX,
  },
  ctaPillText: {
    color: theme.colors.uacTextBase,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.uacDimension12,
  },
  iconOnlyButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryAction: {
    height: 56,
    borderRadius: 16,
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
    color: theme.colors.uacTextBase,
  },
  lessUsedTextActive: {
    color: theme.colors.figmaItemDetailDanger,
  },
  editActionText: {
    ...theme.typography.aliases.uacBodyMdMedium,
    color: theme.colors.uacTextBase,
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
    borderRadius: 16,
    paddingHorizontal: 20,
  },
  editSaveButton: {
    flex: 1,
    borderRadius: 16,
  },
  disabledText: {
    opacity: 0.5,
  },
  // MBottomSheet provides the scrim + rounded surface; this just caps the
  // picker list height and pads the bottom (home-indicator zone).
  modalBody: {
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
  skeletonTitle: {
    width: '100%',
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.figmaDetailSurface,
    alignSelf: 'center',
  },
  skeletonDate: {
    width: '60%',
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.figmaDetailSurface,
    alignSelf: 'center',
  },
});
