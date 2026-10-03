import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import {
  CategoryCounts,
  ColorShare,
  ItemTypeGroup,
  OTHER_COLOR_ID,
  formatPercent,
} from './wardrobe-analysis';

// Figma "Analysis" — the three data cards above the skin-tone card.

// ---------------------------------------------------------------------------
// Stat tiles: 45 items · 15 tops · 12 bottoms · 6 shoes · 8 others
// ---------------------------------------------------------------------------

type StatKey = keyof CategoryCounts;
const STAT_KEYS: StatKey[] = ['total', 'tops', 'bottoms', 'shoes', 'others'];

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
      {groups.map((group, index) => (
        <View
          key={group.group}
          style={[styles.typeGroup, index > 0 && styles.typeGroupDivider]}
          testID={`analysis-type-group-${group.group}`}
        >
          <View style={styles.typeRow}>
            <Text style={styles.groupText}>
              {t(`wardrobe.analysis.groups.${group.group}`)}
            </Text>
            <Text style={styles.groupText}>{group.count}</Text>
          </View>
          {group.types.map(type => (
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
          ))}
        </View>
      ))}
    </View>
  );
};

const STAT_TILE_HEIGHT = 136;
const STACKED_BAR_HEIGHT = 20;
const TRACK_HEIGHT = 8;

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
    paddingTop: theme.spacing.l,
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
    ...theme.typography.aliases.playfairDisplaySection,
    color: theme.colors.figmaTextPrimary,
  },
  // Vertical label (Figma reads bottom-to-top): the slot fills the space
  // under the number and the text is rotated inside it.
  statLabelSlot: {
    position: 'absolute',
    top: 64,
    bottom: theme.spacing.s,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextPrimary,
    width: 64,
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
  typeGroup: {
    gap: theme.spacing.xs,
  },
  typeGroupDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.figmaDivider,
    paddingTop: theme.spacing.s,
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
