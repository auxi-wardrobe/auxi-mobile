import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import IconGrid from '../../assets/images/icon_grid.svg';
import IconGridAlt from '../../assets/images/icon_grid_alt.svg';

// Home | Grid View — bottom view-toggle bar (Figma footer 2464:17348, 414×84).
// A translucent bar with a rounded active-tab pill behind two tabs:
//  - Tab 1 (grid, active): the current grid view.
//  - Tab 2 (alt view): toggles to an alternate layout.
//
// TODO(AU-253 / Q3): the second (alternate) view is NOT defined in the Figma
// section — the footer toggles between two views but only the grid view
// exists. Tab 2 is rendered faithfully but is a no-op until the alternate
// view ships. Confirm target view with CEO/tech-lead before wiring.
//
// Backdrop blur — current Home frame 3230:35149 → footer 3910:14047 specifies
// `backdrop-blur-[4px]` on background/neutral/subtlest @ 80%. Implemented via
// `@react-native-community/blur`'s native UIVisualEffectView on iOS /
// RenderEffect on Android, so `blurAmount={4}`. The white@80% tint is layered
// as a sibling fill (BlurView itself has transparent bg). `reducedTransparency`
// fallback uses the existing opacity-only token so accessibility users still
// see a legible bar.

// Fixed bar height (Figma footer 2464:17348 = 414×84). Exported so the
// HomeScreen snap-paging math can reserve this space when computing sheet
// height — the footer is a sibling rendered below the outfit ScrollView, so
// the available viewport must subtract it or the bottom "Wear this" CTA is
// clipped behind the footer line.
export const HOME_VIEW_TOGGLE_FOOTER_HEIGHT = 84;

export type HomeView = 'grid' | 'collage';

type Props = {
  activeView?: HomeView;
  onSelectView?: (view: HomeView) => void;
  testID?: string;
};

export const HomeViewToggleFooter: React.FC<Props> = ({
  activeView = 'grid',
  onSelectView,
  testID,
}) => {
  const { t } = useTranslation();
  return (
    <View testID={testID} style={styles.bar}>
      {/* Decorative layers MUST NOT capture touches — without pointerEvents
          "none" the absolute-fill surface intercepts taps before they reach
          the tab TouchableOpacity, making the toggle a silent no-op. */}
      <BlurView
        style={styles.blurSlab}
        blurType="light"
        blurAmount={4}
        reducedTransparencyFallbackColor={theme.colors.figmaItemDetailHeaderBg}
        pointerEvents="none"
      />
      <View style={styles.translucentSurface} pointerEvents="none" />
      {/* Static cream capsule (Figma 2464:17314) sits behind BOTH tabs —
          158w × 56h, radius 14. It does NOT slide; only the white inner cell
          (below) moves to the active tab. */}
      <View style={styles.activeCapsule} pointerEvents="none" />
      <View style={styles.tabCluster}>
        <TouchableOpacity
          testID={
            activeView === 'grid'
              ? 'home-footer-tab-grid-active'
              : 'home-footer-tab-grid'
          }
          accessibilityRole="button"
          accessibilityLabel={t('outfitActions.a11y_grid_view')}
          accessibilityState={{ selected: activeView === 'grid' }}
          activeOpacity={0.82}
          onPress={() => onSelectView?.('grid')}
          style={styles.tab}
        >
          {/* White active cell (Figma 2464:17303) over the selected tab. */}
          {activeView === 'grid' && <View style={styles.activeCell} />}
          {/* Active tab icon = ink (#070707); inactive icon dims to the muted
              tan token (icon/primary/subtle_300, #c6bcb1) per Figma 3914:24540. */}
          <IconGrid
            width={24}
            height={24}
            color={
              activeView === 'grid'
                ? theme.colors.figmaTextDark
                : theme.ds.color.tanStroke
            }
          />
        </TouchableOpacity>
        <TouchableOpacity
          testID={
            activeView === 'collage'
              ? 'home-footer-tab-collage-active'
              : 'home-footer-tab-collage'
          }
          accessibilityRole="button"
          accessibilityLabel={t('outfitActions.a11y_collage_view')}
          accessibilityState={{ selected: activeView === 'collage' }}
          activeOpacity={0.82}
          onPress={() => onSelectView?.('collage')}
          style={styles.tab}
        >
          {activeView === 'collage' && <View style={styles.activeCell} />}
          {/* Active tab icon = ink (#070707); inactive icon dims to the muted
              tan token (icon/primary/subtle_300, #c6bcb1) per Figma 3914:24540. */}
          <IconGridAlt
            width={24}
            height={24}
            color={
              activeView === 'collage'
                ? theme.colors.figmaTextDark
                : theme.ds.color.tanStroke
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    height: HOME_VIEW_TOGGLE_FOOTER_HEIGHT,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  // Oversized backdrop-blur slab (Figma 3227:13480: 430×100, centred). Bar
  // wrapper clips overflow:hidden so the extra width/height keeps the blur
  // sharp at the bar edges without bleeding outside.
  blurSlab: {
    position: 'absolute',
    width: 430,
    height: 100,
    top: -8,
    left: '50%',
    marginLeft: -215,
  },
  // White@80% tint over the blur (Figma slab fill = #ffffff at opacity 0.80).
  translucentSurface: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.figmaBlurTintWhite80,
  },
  tabCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.uacDimension12,
    height: 56,
    width: 108,
  },
  // Static cream capsule behind both tabs — Figma 2464:17314 (116×56, radius 14).
  // Centered in the bar (same centre as the 108w cluster); does not move.
  activeCapsule: {
    position: 'absolute',
    width: 116,
    height: 56,
    borderRadius: 14,
    backgroundColor: theme.colors.figmaInsightPillBg,
  },
  tab: {
    width: 48,
    height: 48,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // White inner cell over the active tab — Figma 2464:17303 (48×48, radius 11),
  // with the nav-button drop shadow (0 1 1 rgba(0,0,0,0.15)).
  activeCell: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 11,
    backgroundColor: theme.colors.figmaSurface,
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 1,
    elevation: 1,
  },
});
