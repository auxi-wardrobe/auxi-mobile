import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import IconGrid from '../../assets/images/icon_grid.svg';
import IconGridAlt from '../../assets/images/icon_grid_alt.svg';

// Home | Grid View — bottom view-toggle bar (Figma footer 2464:17348, 414×98).
// A translucent bar with a rounded active-tab pill behind two tabs:
//  - Tab 1 (grid, active): the current grid view.
//  - Tab 2 (alt view): toggles to an alternate layout.
//
// TODO(AU-253 / Q3): the second (alternate) view is NOT defined in the Figma
// section — the footer toggles between two views but only the grid view
// exists. Tab 2 is rendered faithfully but is a no-op until the alternate
// view ships. Confirm target view with CEO/tech-lead before wiring.
//
// NOTE(Q5): Figma uses backdrop blur (3.25px). `@react-native-community/blur`
// is NOT installed, so we approximate with a translucent white surface
// (opacity 0.85) per the extraction artifact's documented fallback.

// Fixed bar height (Figma footer 2464:17348 = 414×98). Exported so the
// HomeScreen snap-paging math can reserve this space when computing sheet
// height — the footer is a sibling rendered below the outfit ScrollView, so
// the available viewport must subtract it or the bottom "Wear this" CTA is
// clipped behind the footer line.
export const HOME_VIEW_TOGGLE_FOOTER_HEIGHT = 98;

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
          <IconGrid width={24} height={24} color={theme.colors.figmaTextDark} />
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
          <IconGridAlt
            width={24}
            height={24}
            color={theme.colors.figmaTextDark}
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
  translucentSurface: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.figmaSurface,
    opacity: 0.85,
  },
  tabCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.m,
    height: 56,
    width: 149,
  },
  // Static cream capsule behind both tabs — Figma 2464:17314 (158×56, radius 14).
  // Centered in the bar (same centre as the 149w cluster); does not move.
  activeCapsule: {
    position: 'absolute',
    width: 158,
    height: 56,
    borderRadius: 14,
    backgroundColor: theme.colors.figmaFooterActivePill,
  },
  tab: {
    width: 66,
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // White inner cell over the active tab — Figma 2464:17303 (66×48, radius 13).
  activeCell: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 13,
    backgroundColor: theme.colors.figmaSurface,
  },
});
