import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { toast } from '../components/design-system/lib';
import {
  BottomSheetSurface,
  TopIconButton,
} from '../components/primitives/FigmaPrimitives';
import { MacgieLoader } from '../components/macgie';
import { ItemDetailEditPanel } from './item-detail/ItemDetailEditPanel';
import { ItemDetailReadPanel } from './item-detail/ItemDetailReadPanel';
import { OptionPickerSheet } from './item-detail/OptionPickerSheet';
import { canEnhanceItem } from './item-detail/enhance-session';
import { AiConsentDialog } from '../components/features/AiConsentDialog';
import { useAiConsentGate } from '../hooks/useAiConsentGate';
import { Icons } from '../assets/icons';
import {
  getItemFitLabel,
  getItemStyleTags,
  getItemUsageFrequency,
  UsageFrequency,
  WardrobeAttributeUpdate,
  WardrobeItem,
  wardrobeKeys,
  wardrobeService,
} from '../services/wardrobeService';
import { theme } from '../theme/theme';
import { AppStackParamList } from '../types/navigation';
import { getImageUrl } from '../utils/url';
import { track } from '../services/analytics';
import {
  areTagsEqual,
  EditableField,
  findColorHex,
  formatItemDate,
  getFriendlyError,
  normalizeCategoryLabel,
  normalizeColorLabel,
  normalizeFormalityLabel,
  replaceFitTag,
  replaceTag,
  STYLE_TAG_LESS_USED,
  toApiCategory,
  toApiFormality,
} from '../utils/wardrobeItemMappers';

type ScreenNavigation = NativeStackNavigationProp<
  AppStackParamList,
  'ItemDetail'
>;
type ScreenRoute = RouteProp<AppStackParamList, 'ItemDetail'>;

// AU-312 (Figma 2852:14557) one-off literals — flagged in
// figma-extraction-item-detail.md §One-off literals, not in the spacing scale:
// image frame is 378 wide on the 414 frame → 18px side margins; frame is
// 378×504 (3:4); button group bottom padding 36 = home-indicator allowance.
const IMAGE_SIDE_MARGIN = 18;
const IMAGE_ASPECT = 3 / 4;
const SHEET_BOTTOM_PADDING = 36;

export const ItemDetailScreen = () => {
  const navigation = useNavigation<ScreenNavigation>();
  const route = useRoute<ScreenRoute>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { itemId, fallbackItem, enhancedItem } = route.params;

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
          toast.show({
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

        toast.show({
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

  // AI Image Enhancement return path: EnhanceImage pops back here with
  // `enhancedItem` set after "Replace original" succeeds. Merge it into the
  // loaded item (so the accepted studio shot renders immediately, no refetch)
  // and clear the param so re-focus / re-render never re-applies it.
  useEffect(() => {
    if (!enhancedItem) {
      return;
    }
    setItem(currentItem =>
      currentItem && currentItem.id === enhancedItem.id
        ? { ...currentItem, ...enhancedItem }
        : currentItem,
    );
    navigation.setParams({ enhancedItem: undefined });
  }, [enhancedItem, navigation]);

  // AU-312 review fix: prefer the background-removed cutout (`image_png`)
  // like every other surface (see utils/url.ts resolveItemImage). That
  // helper's input requires a non-optional `image_url` (legacy Item shape),
  // which WardrobeItem doesn't satisfy — apply the same precedence
  // (image_studio → image_png → image_url) via getImageUrl directly. The
  // accepted studio shot (AI enhancement) wins when present.
  const imageUrl = useMemo(
    () => getImageUrl(item?.image_studio || item?.image_png || item?.image_url),
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

  // A `fallbackItem` only ever rides along with Home (suggestion-engine) pushes
  // — the Wardrobe grid opens ItemDetail with just `{ itemId }` (same
  // discriminator the `item_detail_opened` analytics source uses). The
  // "Change" swap button is a suggestion-only affordance: from the wardrobe the
  // item IS the item, there's nothing to swap.
  const openedFromSuggestion = !!fallbackItem;

  const handleOpenChange = () => {
    // ItemDetail is a modal layer; push a fresh select-mode Wardrobe ON TOP of
    // it (never navigate to a sibling below the modal — that desyncs the native
    // presentation, see the popTo note on "Build around this"). The picker's
    // "Change" CTA pops straight back to Home with the chosen id. Exclude the
    // current item so the swap is always to a DIFFERENT item.
    navigation.push('Wardrobe', { mode: 'select', excludeItemId: itemId });
  };

  const usageFrequency = getItemUsageFrequency(item);
  const isCommonSystemItem = item?.is_common_item === true;
  // AU-287: SYSTEM common items AND per-user clones (USR_* hrid) belong to
  // the suggestion catalog. Both are immutable — users demote via LESS_USE
  // instead of permanent delete.
  const isCatalogItem =
    isCommonSystemItem ||
    (typeof item?.human_readable_id === 'string' &&
      item.human_readable_id.startsWith('USR_'));

  // Field-driven picker: the draft value + setter are looked up per field —
  // collapses the former parallel `switch (field)` blocks with identical
  // behavior. Options + header label live in FIELD_CONFIG (used by the sheet).
  const draftValues: Record<EditableField, string> = {
    category: draftCategory,
    color: draftColor,
    fit: draftFit,
    style: draftStyle,
  };
  const draftSetters: Record<EditableField, (value: string) => void> = {
    category: setDraftCategory,
    color: setDraftColor,
    fit: setDraftFit,
    style: setDraftStyle,
  };

  const handleSelectOption = (option: string) => {
    if (!pickerField) {
      return;
    }

    draftSetters[pickerField](option);
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
      // Wardrobe list is cached (60s stale, no focus-refetch): mutations must
      // invalidate to refresh the grid when returning from ItemDetail.
      queryClient.invalidateQueries({ queryKey: wardrobeKeys.all });
    } catch (error) {
      console.error('Failed to update usage frequency', error);
      setItem(previousItem);
      toast.show({
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
      toast.show({
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
              toast.show({
                type: 'success',
                text1: t('wardrobe.itemDetail.toast_deleted'),
                position: 'bottom',
              });
              queryClient.invalidateQueries({ queryKey: wardrobeKeys.all });
              navigation.goBack();
            } catch (error) {
              console.error('Failed to delete item', error);
              toast.show({
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
      queryClient.invalidateQueries({ queryKey: wardrobeKeys.all });

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

      toast.show({
        type: 'success',
        text1: t('wardrobe.itemDetail.toast_updated'),
        position: 'bottom',
      });
    } catch (error) {
      console.error('Failed to save item updates', error);
      toast.show({
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

  // AI Image Enhancement (on-demand beautify). Gated behind the persisted AI
  // data-sharing consent (B1) like every flow that sends a user photo to an
  // AI provider — the same AiConsentDialog the beautify upload mode uses.
  const consentGate = useAiConsentGate();
  // Multiple rapid taps on the FAB must create ONE enhancement session: the
  // ref latches on first tap and only releases when this screen regains focus
  // (back from EnhanceImage) or the consent dialog is declined.
  const enhanceLatchRef = useRef(false);
  useEffect(
    () =>
      navigation.addListener('focus', () => {
        enhanceLatchRef.current = false;
      }),
    [navigation],
  );

  const enhanceDialogProps = {
    ...consentGate.dialogProps,
    onDecline: () => {
      enhanceLatchRef.current = false;
      consentGate.dialogProps.onDecline();
    },
  };

  const handleEnhance = () => {
    if (enhanceLatchRef.current || !item || !imageUrl) {
      return;
    }
    enhanceLatchRef.current = true;
    consentGate.run(() => {
      navigation.push('EnhanceImage', { itemId: item.id, displayUri: imageUrl });
    });
  };

  // Offer Enhance only as the next step after a user's own upload finished
  // processing successfully (cutout exists) — catalog/seeded items, items
  // still preparing, failed processing, and already-enhanced items never get
  // the FAB. Full rules: enhance-session.ts#canEnhanceItem.
  const canEnhance = !!item && !!imageUrl && canEnhanceItem(item);

  const handleBuildAround = () => {
    // ItemDetail is presented as a modal layer (AppNavigator
    // presentation:'modal'). navigate('Home',…) to a screen BELOW the modal
    // updates JS nav state but can leave the native iOS modal still presented
    // → desync: the sheet stays stuck on top and nothing responds. popTo issues
    // pop semantics (like the back button's goBack) that dismiss the modal AND
    // land on Home with the pin intent.
    navigation.popTo('Home', { pinFromDetail: itemId });
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

            {/* AI Image Enhancement entry — sparkle FAB pinned to the image's
                bottom-right corner. Hidden while editing (the edit panel owns
                its own save state) and whenever the item is not enhanceable
                (catalog / preparing / already enhanced — see canEnhance). */}
            {canEnhance && !isEditing ? (
              <TouchableOpacity
                testID="item-detail-enhance-fab"
                accessibilityRole="button"
                accessibilityLabel={t('wardrobe.enhance.a11y_enhance')}
                style={styles.enhanceFab}
                onPress={handleEnhance}
                disabled={saving}
              >
                <Icons.Sparkle
                  width={20}
                  height={20}
                  color={theme.colors.figmaAiSparkle}
                />
              </TouchableOpacity>
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
          <ItemDetailEditPanel
            item={item}
            draftCategory={draftCategory}
            draftStyle={draftStyle}
            draftColor={draftColor}
            draftFit={draftFit}
            canEditRows={isEditing && !isCatalogItem}
            saving={saving}
            onPickField={setPickerField}
            onCancel={handleCancelEditing}
            onSave={handleSaveEdits}
          />
        ) : (
          <ItemDetailReadPanel
            titleText={titleText}
            dateText={dateText}
            isPreparing={isPreparing}
            isWaiting={isWaiting}
            isCommonSystemItem={isCommonSystemItem}
            openedFromSuggestion={openedFromSuggestion}
            isCatalogItem={isCatalogItem}
            usageFrequency={usageFrequency}
            saving={saving}
            onSwap={handleOpenChange}
            onBuildAround={handleBuildAround}
            onDelete={handleDelete}
            onToggleUsage={handleToggleUsageFrequency}
            onEdit={() => setIsEditing(true)}
          />
        )}
      </BottomSheetSurface>

      <OptionPickerSheet
        field={pickerField}
        selectedValue={pickerField ? draftValues[pickerField] : ''}
        onSelect={handleSelectOption}
        onClose={() => setPickerField(null)}
      />

      {/* B1 consent gate for the AI enhancement flow — shown on first FAB tap
          when AI data-sharing consent hasn't been granted yet. */}
      <AiConsentDialog {...enhanceDialogProps} />
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
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.white,
    ...theme.ds.shadow.headerIcon,
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
    minHeight: 24, // chip size SM
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
  // AI enhancement FAB: 36pt white rounded square pinned to the image's
  // bottom-right corner, same soft warm shadow as the header back button.
  enhanceFab: {
    position: 'absolute',
    bottom: theme.spacing.uacDimension12,
    right: theme.spacing.uacDimension12,
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.ds.shadow.headerIcon,
  },
  sheet: {
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.m,
  },
});
