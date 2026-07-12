import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import IconHomeHeartOutline from '../../../assets/images/icon_home_heart_outline.svg';
import { OutfitActionRow } from '../../../components/features/OutfitActionRow';
import { ShimmerSlot } from '../../../components/features/ShimmerSlot';
import { GeneratingDots } from '../../../components/features/GeneratingDots';
import { styles } from '../styles';

export const HomeLoadingState = () => {
  const { t } = useTranslation();
  return (
    <View style={[styles.optionSheet, styles.optionSheetLoading]}>
      <View style={styles.loadingPillRow}>
        <View style={styles.loadingPill} testID="home-loading-generating-pill">
          <Text style={styles.loadingPillText}>{t('home.generating')}</Text>
          <GeneratingDots size={24} />
        </View>
      </View>

      <View style={styles.loadingCards}>
        {[0, 1].map(row => (
          <View key={`loading-row-${row}`} style={styles.cardRow}>
            {[0, 1].map(column => (
              <View
                key={`loading-card-${row}-${column}`}
                style={[styles.cardShellFixed, styles.loadingSlotShell]}
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

      <View
        style={styles.loadingFooterChrome}
        pointerEvents="none"
        testID="home-loading-footer"
      >
        <OutfitActionRow testID="home-loading-remix-row" />
        <View style={[styles.primaryActionFull, styles.loadingWearThis]}>
          <Text style={styles.loadingWearThisText}>{t('home.wear_this')}</Text>
          <IconHomeHeartOutline width={24} height={24} />
        </View>
      </View>
    </View>
  );
};
