import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import IconHomeHeartOutline from '../../../assets/images/icon_home_heart_outline.svg';
import { OutfitActionRow } from '../../../components/features/OutfitActionRow';
import { ShimmerSlot } from '../../../components/features/ShimmerSlot';
import { GeneratingDots } from '../../../components/features/GeneratingDots';
import { styles } from '../styles';

/**
 * Home-loading skeleton. Mirrors the *loaded* Home chrome 1:1 so the
 * load→loaded swap is shift-free: a flex `deckWrap` holds the sheet (grid
 * stretches to fill, same `gridWrap`/`cardRowFill`/`cardShellFixed` rules as
 * the loaded `twoByTwo`) with the action row at its foot, and the "Wear this"
 * footer is pinned just above the view-toggle footer — exactly where the real
 * controls render. The "Generating" pill takes the caption's slot; the footer
 * chrome is previewed dimmed (Figma skeleton-first, node 2850-11205).
 */
export const HomeLoadingState = () => {
  const { t } = useTranslation();
  return (
    <>
      <View style={styles.deckWrap}>
        <View style={styles.optionSheet}>
          <View style={styles.loadingPillRow}>
            <View style={styles.loadingPill} testID="home-loading-generating-pill">
              <Text style={styles.loadingPillText}>{t('home.generating')}</Text>
              <GeneratingDots size={24} />
            </View>
          </View>

          <View
            style={[
              styles.gridWrap,
              styles.gridWrapStart,
              styles.gridFill,
              styles.loadingGrid,
            ]}
          >
            {[0, 1].map(row => (
              <View
                key={`loading-row-${row}`}
                style={[styles.cardRow, styles.cardRowFill]}
              >
                {[0, 1].map(column => (
                  <View
                    key={`loading-card-${row}-${column}`}
                    style={styles.cardShellFixed}
                  >
                    <ShimmerSlot
                      testID={`home-loading-slot-${row}-${column}`}
                      showPin={row === 1}
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.deckActionRow, styles.loadingDim]} pointerEvents="none">
          <OutfitActionRow testID="home-loading-remix-row" />
        </View>
      </View>

      <View
        style={[styles.wearThisFooter, styles.loadingDim]}
        pointerEvents="none"
        testID="home-loading-footer"
      >
        <View style={[styles.primaryActionFull, styles.loadingWearThis]}>
          <Text style={styles.loadingWearThisText}>{t('home.wear_this')}</Text>
          <IconHomeHeartOutline width={24} height={24} />
        </View>
      </View>
    </>
  );
};
