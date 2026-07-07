import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { Icons } from '../../assets/icons';
import { UsageFrequency } from '../../services/wardrobeService';
import { theme } from '../../theme/theme';
import { itemDetailStyles as styles } from './itemDetailStyles';

interface ItemDetailReadPanelProps {
  titleText: string;
  dateText: string | null;
  isPreparing: boolean;
  isWaiting: boolean;
  isCommonSystemItem: boolean;
  openedFromSuggestion: boolean;
  isCatalogItem: boolean;
  usageFrequency: UsageFrequency;
  saving: boolean;
  onSwap: () => void;
  onBuildAround: () => void;
  onDelete: () => void;
  onToggleUsage: () => void;
  onEdit: () => void;
}

/**
 * READ MODE (Figma 2852:14557 "detail"): centred title + date, outlined
 * "Build around this" CTA, [trash][Less use] … [Edit]. Extracted verbatim from
 * ItemDetailScreen — same raw primitives + styles (GH-364 de-bloat). A
 * DS-primitive migration (→ MButton/MIconButton) is flagged separately.
 */
export const ItemDetailReadPanel: React.FC<ItemDetailReadPanelProps> = ({
  titleText,
  dateText,
  isPreparing,
  isWaiting,
  isCommonSystemItem,
  openedFromSuggestion,
  isCatalogItem,
  usageFrequency,
  saving,
  onSwap,
  onBuildAround,
  onDelete,
  onToggleUsage,
  onEdit,
}) => {
  const { t } = useTranslation();

  return (
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
          <View style={styles.ctaRow}>
            {/* Suggestion-only "Change" swap button — opens the wardrobe
                as a single-item picker so the user can build around a
                different item instead. Hidden when the detail was opened
                from the wardrobe (note in the AU spec). Square outline
                chip sized to the primary pill's height. */}
            {openedFromSuggestion ? (
              <TouchableOpacity
                testID="item-detail-swap-btn"
                accessibilityRole="button"
                accessibilityLabel={t('wardrobe.itemDetail.a11y_change_item')}
                style={styles.swapButton}
                onPress={onSwap}
                disabled={isPreparing}
              >
                <Icons.Change
                  width={24}
                  height={24}
                  color={theme.colors.uacTextBase}
                />
              </TouchableOpacity>
            ) : null}
            <PillButton
              testID="item-detail-mix-btn"
              variant="filled"
              title={t('wardrobe.itemDetail.build_around_this')}
              trailing={<Icons.Remix width={24} height={24} />}
              style={styles.ctaPrimary}
              onPress={onBuildAround}
              disabled={isPreparing}
            />
          </View>
        ) : null}

        <View style={styles.bottomRow}>
          <View style={styles.leftRow}>
            {/* AU-287: Trash hidden for catalog items (SYSTEM + USR_*
                clones). User demotes them via the Less use toggle. */}
            {!isCatalogItem ? (
              <TouchableOpacity
                testID="item-detail-delete-btn"
                accessibilityLabel={t('wardrobe.itemDetail.a11y_delete')}
                onPress={onDelete}
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
                usageFrequency === 'LESS_USED' && styles.secondaryActionActive,
              ]}
              onPress={() => {
                onToggleUsage();
              }}
              disabled={saving || isPreparing}
            >
              <Text
                style={[
                  styles.lessUsedText,
                  usageFrequency === 'LESS_USED' && styles.lessUsedTextActive,
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
            onPress={onEdit}
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
            <Icons.Edit width={24} height={24} color={theme.colors.uacTextBase} />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};
