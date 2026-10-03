import React, { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { Icons } from '../../assets/icons';
import {
  configureCollapseNext,
  configureExpandNext,
  motion,
  useReducedMotion,
} from '../../theme/motion';
import {
  CategoryCounts,
  ColorShare,
  ItemTypeGroup,
  OTHER_COLOR_ID,
  formatPercent,
} from './wardrobe-analysis';

// Figma "Analysis" — the three data cards above the skin-tone card.

// ---------------------------------------------------------------------------
// Stat tiles: 45 items · 15 tops · 12 bottoms · 6 shoes · 8 accessories
// ---------------------------------------------------------------------------

type StatKey = keyof CategoryCounts;
const STAT_KEYS: StatKey[] = [
  'total',
  'tops',
  'bottoms',
  'shoes',
  'accessories',
];

export const AnalysisStatTiles = ({ counts }: { counts: CategoryCounts }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.statRow}>
      {STAT_KEYS.map(key => {
        const value = counts[key];
        const isTotal = key === 'total';
        // The fill rises from the bottom in proportion to the share of the
        // wardrobe; the "items" tile is the whole, so it is always full.
        const fill = isTotal ? 1 : counts.total > 0 ? value / counts.total : 0;
        const label = t(`wardrobe.analysis.stats.${key}`);
        return (
          <View
            key={key}
            style={[styles.statTile, isTotal && styles.statTileTotal]}
            testID={`analysis-stat-${key}`}
            accessible
            accessibilityLabel={t('wardrobe.analysis.stats.a11y', {
              count: value,
              label,
            })}
          >
            {isTotal ? null : (
              <View style={[styles.statFill, { height: `${fill * 100}%` }]} />
            )}
            <Text style={styles.statValue}>{value}</Text>
            <View style={styles.statLabelSlot} pointerEvents="none">
              <Text style={styles.statLabel} numberOfLines={1}>
                {label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Color distribution: stacked bar + one row per colour family
// ---------------------------------------------------------------------------

export const ColorDistributionCard = ({ shares }: { shares: ColorShare[] }) => {
  const { t, i18n } = useTranslation();
  const colorName = (id: string) =>
    id === OTHER_COLOR_ID
      ? t('wardrobe.analysis.colors.other')
      : t(`wardrobe.analysis.colors.${id}`);

  return (
    <View style={styles.card} testID="analysis-color-card">
      <Text style={styles.cardTitle}>{t('wardrobe.analysis.color_title')}</Text>
      {shares.length === 0 ? (
        <Text style={styles.emptyText}>
          {t('wardrobe.analysis.color_empty')}
        </Text>
      ) : (
        <>
          <View style={styles.stackedBar}>
            {shares.map(share => (
              <View
                key={share.id}
                style={[
                  styles.stackedSegment,
                  { flex: share.count, backgroundColor: share.hex },
                ]}
              />
            ))}
          </View>
          {shares.map(share => (
            <View
              key={share.id}
              style={styles.colorRow}
              testID={`analysis-color-row-${share.id}`}
            >
              <View
                style={[styles.colorChip, { backgroundColor: share.hex }]}
              />
              <View style={styles.colorBody}>
                <View style={styles.colorHeader}>
                  <Text style={styles.rowText}>{colorName(share.id)}</Text>
                  <Text style={styles.rowText}>
                    {t('wardrobe.analysis.color_share', {
                      count: share.count,
                      value: formatPercent(share.percent, i18n.language),
                    })}
                  </Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.trackFill,
                      {
                        width: `${share.percent}%`,
                        backgroundColor: share.hex,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Item types: grouped by category with subtype counts
// ---------------------------------------------------------------------------

export const ItemTypesCard = ({ groups }: { groups: ItemTypeGroup[] }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.card} testID="analysis-item-types-card">
      <Text style={styles.cardTitle}>{t('wardrobe.analysis.types_title')}</Text>
      <View>
        {groups.map((group, index) => (
          <ItemTypeGroupRow
            key={group.group}
            group={group}
            showDivider={index > 0}
          />
        ))}
      </View>
    </View>
  );
};

/**
 * One collapsible category (Figma "Item Types" dropdown): chevron + name +
 * count; tapping reveals its subtypes (Shoes 2 → Loafers 1, Sneakers 1).
 * Collapsed by default. The chevron turns to point up while open.
 */
const ItemTypeGroupRow = ({
  group,
  showDivider,
}: {
  group: ItemTypeGroup;
  showDivider: boolean;
}) => {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const label = t(`wardrobe.analysis.groups.${group.group}`);

  const toggle = () => {
    const next = !expanded;
    if (next) {
      configureExpandNext(reduced);
    } else {
      configureCollapseNext(reduced);
    }
    setExpanded(next);
    if (reduced) {
      rotation.setValue(next ? 1 : 0);
      return;
    }
    Animated.timing(rotation, {
      toValue: next ? 1 : 0,
      duration: next ? motion.duration.medium : motion.duration.normal,
      easing: next ? motion.easing.enter : motion.easing.exit,
      useNativeDriver: true,
    }).start();
  };

  const chevronStyle = {
    transform: [
      {
        rotate: rotation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '180deg'],
        }),
      },
    ],
  };

  return (
    <View
      style={[
        showDivider && styles.typeGroupDivider,
        expanded && styles.typeGroupExpanded,
      ]}
      testID={`analysis-type-group-${group.group}`}
    >
      <Pressable
        onPress={toggle}
        style={styles.groupHeader}
        testID={`analysis-type-group-toggle-${group.group}${
          expanded ? '-expanded' : ''
        }`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={t('wardrobe.analysis.a11y_type_group', {
          label,
          count: group.count,
        })}
      >
        <Animated.View style={chevronStyle}>
          <Icons.ChevronDown
            width={CHEVRON_SIZE}
            height={CHEVRON_SIZE}
            color={theme.colors.figmaTextPrimary}
          />
        </Animated.View>
        <Text style={[styles.groupText, styles.groupLabel]}>{label}</Text>
        <Text style={styles.groupText}>{group.count}</Text>
      </Pressable>
      {expanded
        ? group.types.map(type => (
            <View
              key={type.typeId ?? `raw:${type.label}`}
              style={styles.typeRow}
              testID={`analysis-type-${group.group}-${type.typeId ?? 'raw'}`}
            >
              <Text style={styles.rowText}>
                {type.typeId
                  ? t(`wardrobe.analysis.types.${type.typeId}`)
                  : type.label}
              </Text>
              <Text style={styles.rowText}>{type.count}</Text>
            </View>
          ))
        : null}
    </View>
  );
};

const STAT_TILE_HEIGHT = 148;
// Label run starts just under the 32/40 number (paddingTop 16 + 40).
const STAT_LABEL_TOP = 58;
const STAT_LABEL_BOX = 110;
const STACKED_BAR_HEIGHT = 20;
const TRACK_HEIGHT = 8;
const CHEVRON_SIZE = 16;

export const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.figmaDividerSubtle,
    borderRadius: theme.ds.radius.sm,
    padding: theme.spacing.uacDimension12,
    gap: theme.spacing.s,
  },
  cardTitle: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextPrimary,
  },
});

const styles = StyleSheet.create({
  ...cardStyles,
  statRow: {
    flexDirection: 'row',
    gap: theme.spacing.s,
  },
  statTile: {
    flex: 1,
    height: STAT_TILE_HEIGHT,
    borderRadius: theme.ds.radius.sm,
    backgroundColor: theme.ds.color.cream,
    overflow: 'hidden',
    alignItems: 'center',
    // 16 + the 40pt line of the 32px number ends at 56, just above the
    // vertical label run (STAT_LABEL_TOP).
    paddingTop: theme.spacing.m,
  },
  statTileTotal: {
    backgroundColor: theme.colors.figmaItemDetailOptionDotBorder,
  },
  statFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.figmaItemDetailOptionDotBorder,
  },
  statValue: {
    ...theme.typography.aliases.interDisplayRegular,
    color: theme.colors.figmaTextPrimary,
  },
  // Vertical label (Figma reads bottom-to-top): the slot fills the space
  // under the number and the text is rotated inside it.
  statLabelSlot: {
    position: 'absolute',
    top: STAT_LABEL_TOP,
    bottom: theme.spacing.xs,
    // Wider than the tile so the (pre-rotation) text box isn't squeezed to
    // the tile width; once rotated the text sits inside the tile.
    left: -STAT_LABEL_BOX,
    right: -STAT_LABEL_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Vertical label under the number; the tile is tall enough for the
  // longest one ("accessories" / "accessoires") at 14px.
  statLabel: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextPrimary,
    // Longer than the vertical run on purpose: it's centred in the slot, the
    // text itself (~76pt for "accessories") still fits, and a box sized to
    // the run would ellipsize it.
    width: STAT_LABEL_BOX,
    textAlign: 'center',
    transform: [{ rotate: '-90deg' }],
  },
  emptyText: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
  },
  stackedBar: {
    flexDirection: 'row',
    height: STACKED_BAR_HEIGHT,
    gap: 2,
    marginBottom: theme.spacing.xs,
  },
  stackedSegment: {
    borderRadius: theme.ds.radius.xs,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.spacing.uacDimension12,
  },
  colorChip: {
    width: 8,
    borderRadius: theme.ds.radius.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.ds.line,
  },
  colorBody: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  colorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: theme.ds.radius.full,
    backgroundColor: theme.colors.figmaToggleOffTrack,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: theme.ds.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.ds.line,
  },
  typeGroupExpanded: {
    paddingBottom: theme.spacing.s,
  },
  typeGroupDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.figmaDivider,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    // 44pt touch target, no extra padding (Figma row rhythm).
    minHeight: 44,
  },
  groupLabel: {
    flex: 1,
  },
  // Subtype rows sit under the group label (indented past the chevron).
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: CHEVRON_SIZE + theme.spacing.s,
    paddingVertical: 2,
  },
  groupText: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.figmaTextPrimary,
  },
  rowText: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextPrimary,
  },
});
