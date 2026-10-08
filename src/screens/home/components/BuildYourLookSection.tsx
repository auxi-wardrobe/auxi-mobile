import React from 'react';
import { Image, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../../assets/icons';
import { TopIconButton } from '../../../components/primitives/FigmaPrimitives';
import type { WardrobeItem } from '../../../services/wardrobeService';
import { BUILD_LOOK_MAX_ITEMS } from '../../../services/buildAroundMatchService';
import { theme } from '../../../theme/theme';
import { resolveWardrobeItemImage } from '../../capsule/capsule-format';
import { tagLabel } from '../../build-around/BuildAroundSheet';
import { SectionHeader } from './SectionHeader';
import { styles } from '../styles';

/** Cards per row — the chosen items plus the "Add item" card never exceed it. */
const COLUMNS = BUILD_LOOK_MAX_ITEMS;
const ICON = 20;

type Props = {
  /** Items chosen so far, in pick order (≤ `BUILD_LOOK_MAX_ITEMS`). */
  items: WardrobeItem[];
  /** Discovery trend tags chosen so far (slugs). */
  tags: string[];
  /** "Add item" card → opens the wardrobe picker. */
  onAddItem: () => void;
  onRemoveItem: (itemId: string) => void;
  /** "+ add tags" chip → opens the tag sheet. */
  onAddTags: () => void;
  onRemoveTag: (tag: string) => void;
  /** "Find the best match" — only called with at least one item. */
  onFind: () => void;
};

/**
 * "BUILD YOUR LOOK" — the Home landing section under Discovery. The user
 * anchors up to three wardrobe items (+ optional Discovery style tags) and
 * "Find the best match" runs the same Discovery search ItemDetail's
 * "Build around this → Find the best match from Discovery" runs, landing on
 * the same result screen. Pure presentation: HomeLandingScreen owns the
 * selection and the search.
 */
export const BuildYourLookSection: React.FC<Props> = ({
  items,
  tags,
  onAddItem,
  onRemoveItem,
  onAddTags,
  onRemoveTag,
  onFind,
}) => {
  const { t } = useTranslation();
  const canAdd = items.length < BUILD_LOOK_MAX_ITEMS;
  const canFind = items.length > 0;
  const spacers = Math.max(0, COLUMNS - items.length - (canAdd ? 1 : 0));

  return (
    <View style={styles.section} testID="home-build-look">
      <SectionHeader
        title={t('homeLanding.build_look_title')}
        testID="home-build-look-header"
      />
      <Text style={styles.buildLookSubtitle}>{t('homeLanding.build_look_subtitle')}</Text>

      <View style={styles.buildLookRow}>
        {items.map((item, index) => {
          const uri = resolveWardrobeItemImage(item);
          const name = item.name ?? item.category ?? t('homeLanding.build_look_item_fallback');
          return (
            <View
              key={item.id}
              style={styles.buildLookCard}
              testID={`home-build-look-item-${index}`}
              accessible
              accessibilityLabel={name}
            >
              {uri ? (
                <Image
                  source={{ uri }}
                  style={styles.buildLookCardImage}
                  resizeMode="contain"
                />
              ) : null}
              <View style={styles.buildLookRemove}>
                <TopIconButton
                  testID={`home-build-look-remove-${index}`}
                  accessibilityLabel={t('homeLanding.build_look_a11y_remove_item', { name })}
                  onPress={() => onRemoveItem(item.id)}
                  icon={
                    <Icons.Trash
                      width={ICON}
                      height={ICON}
                      color={theme.colors.uacTextDangerBase}
                    />
                  }
                />
              </View>
            </View>
          );
        })}
        {canAdd ? (
          <Pressable
            style={styles.buildLookCard}
            onPress={onAddItem}
            testID="home-build-look-add-item"
            accessibilityRole="button"
            accessibilityLabel={t('homeLanding.build_look_a11y_add_item')}
          >
            <TopIconButton
              testID="home-build-look-add-item-icon"
              accessibilityLabel={t('homeLanding.build_look_a11y_add_item')}
              onPress={onAddItem}
              icon={<Icons.Plus width={ICON} height={ICON} color={theme.colors.uacTextBase} />}
            />
            <Text style={styles.buildLookAddLabel}>{t('homeLanding.build_look_add_item')}</Text>
          </Pressable>
        ) : null}
        {Array.from({ length: spacers }).map((_, index) => (
          <View key={`spacer-${index}`} style={styles.buildLookCardSpacer} />
        ))}
      </View>

      <View style={styles.chipRow}>
        {tags.map(tag => (
          <TouchableOpacity
            key={tag}
            style={[styles.chip, styles.buildLookChip, styles.buildLookChipOn]}
            activeOpacity={0.82}
            onPress={() => onRemoveTag(tag)}
            testID={`home-build-look-tag-${tag}`}
            accessibilityRole="button"
            accessibilityLabel={t('homeLanding.build_look_a11y_remove_tag', { tag: tagLabel(tag) })}
          >
            <Icons.CloseThin width={12} height={12} color={theme.colors.white} />
            <Text style={[styles.chipText, styles.buildLookChipTextOn]}>{tagLabel(tag)}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.chip, styles.buildLookChip]}
          activeOpacity={0.82}
          onPress={onAddTags}
          testID="home-build-look-add-tags"
          accessibilityRole="button"
          accessibilityLabel={t('homeLanding.build_look_a11y_add_tags')}
        >
          <Icons.Plus width={14} height={14} color={theme.colors.uacTextBase} />
          <Text style={styles.chipText}>{t('homeLanding.build_look_add_tags')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buildLookFindRow}>
        <TouchableOpacity
          style={[styles.pickAction, styles.pickActionEnd]}
          activeOpacity={0.82}
          disabled={!canFind}
          onPress={onFind}
          testID={canFind ? 'home-build-look-find' : 'home-build-look-find-disabled'}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canFind }}
          accessibilityLabel={t(
            canFind
              ? 'homeLanding.build_look_a11y_find'
              : 'homeLanding.build_look_a11y_find_disabled',
          )}
        >
          <Text style={[styles.pickActionText, !canFind && styles.buildLookFindDisabled]}>
            {t('homeLanding.build_look_find')}
          </Text>
          <Icons.Search
            width={ICON}
            height={ICON}
            color={canFind ? theme.colors.figmaCtaLabel : theme.colors.uacTextSubtle100}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};
