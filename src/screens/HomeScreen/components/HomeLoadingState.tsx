import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import IconHomeHeartOutline from '../../../assets/images/icon_home_heart_outline.svg';
import { OutfitActionRow } from '../../../components/features/OutfitActionRow';
import { ShimmerSlot } from '../../../components/features/ShimmerSlot';
import { GeneratingDots } from '../../../components/features/GeneratingDots';
import { styles } from '../styles';

/**
 * Home loading skeleton. Rendered through the SAME container path as a loaded
 * outfit — `deckWrap` → `optionSheet` (caption slot + flex `gridScroll`) with
 * the action row and wear-this footer as siblings — so the shimmer grid resolves
 * to the identical card geometry/position a real 4-item outfit (`twoByTwo`)
 * would, and the load→loaded swap never reflows. The chrome (action row +
 * wear-this) is dimmed while generating.
 */
export const HomeLoadingState = () => {
  const { t } = useTranslation();
  return (
    <>
      <View style={styles.deckWrap}>
        <View style={styles.optionSheet}>
          {/* Caption slot — the "Generating" pill sits where OutfitCardCaption
              would, at the same 40px footprint, so the grid starts at the same
              y as a loaded sheet. */}
          <View style={styles.loadingCaptionSlot}>
            <View
              style={styles.loadingPill}
              testID="home-loading-generating-pill"
            >
              <Text style={styles.loadingPillText}>{t('home.generating')}</Text>
              <GeneratingDots size={24} />
            </View>
          </View>

          {/* Grid — identical nesting to OptionSheet's `twoByTwo` (4-item)
              layout, so the four shimmer cards land at the exact positions and
              size of a real 4-outfit grid. */}
          <View style={styles.gridScroll}>
            <View style={styles.gridScrollContent}>
              <View style={styles.gridFill}>
                <View
                  style={[styles.gridWrap, styles.gridWrapStart, styles.gridFill]}
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
                            style={styles.loadingSlotCard}
                          />
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Action row — same slot as the loaded deck's fixed action row. */}
        <View
          style={[styles.deckActionRow, styles.loadingChromeDim]}
          pointerEvents="none"
        >
          <OutfitActionRow testID="home-loading-remix-row" />
        </View>
      </View>

      {/* Wear-this footer — matches WearThisFooter's footprint so the deck flex
          area (and therefore the grid) is the same height as when loaded. */}
      <View
        style={[styles.wearThisFooter, styles.loadingChromeDim]}
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
