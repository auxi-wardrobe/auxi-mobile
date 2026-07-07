import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PillButton } from '../../../components/primitives/FigmaPrimitives';
import { DotsLoader } from '../../../components/atoms/DotsLoader';
import IconHomeHeartOutline from '../../../assets/images/icon_home_heart_outline.svg';
import IconChevronRight from '../../../assets/images/icon_chevron_right.svg';
import { theme } from '../../../theme/theme';
import type { PinOutfitStatus } from '../../../hooks/usePinReducer';
import type { OutfitSheetWithGrid, SaveState } from '../types';
import { styles } from '../styles';

type WearThisFooterProps = {
  /** Rendered only when there is at least one outfit in the deck. */
  visible: boolean;
  activeSaveState: SaveState;
  pinOutfit: PinOutfitStatus;
  activeOutfit: OutfitSheetWithGrid | undefined;
  onOpenFavourites: () => void;
  onWearThis: (outfit: OutfitSheetWithGrid) => void;
};

/**
 * The sticky Home footer cluster: the "Wear this" CTA (which flips to a
 * "See in favourites" row once saved) and the save-error hint, gated on
 * `optionSets.length > 0`. The floating feedback affordance moved to the
 * shared `FeedbackFab` (also mounted on Wardrobe) so the bottom bar reads
 * identically across the footer nav toggle.
 */
export const WearThisFooter = ({
  visible,
  activeSaveState,
  pinOutfit,
  activeOutfit,
  onOpenFavourites,
  onWearThis,
}: WearThisFooterProps) => {
  const { t } = useTranslation();

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.wearThisFooter}>
      {activeSaveState === 'saved' ? (
        <TouchableOpacity
          testID="home-wear-this-saved-favourites"
          accessibilityRole="button"
          accessibilityLabel={t('home.saved_open_favourites')}
          activeOpacity={0.7}
          style={styles.savedFavouritesCta}
          onPress={onOpenFavourites}
        >
          <Text style={styles.savedFavouritesCtaText} numberOfLines={2}>
            {t('home.saved_open_favourites')}
          </Text>
          <IconChevronRight width={20} height={20} />
        </TouchableOpacity>
      ) : (
        <PillButton
          testID="home-wear-this"
          title={
            pinOutfit === 'generating'
              ? t('pin.generating_header')
              : t('home.wear_this')
          }
          variant="outline"
          onPress={() => activeOutfit && onWearThis(activeOutfit)}
          disabled={!activeOutfit || pinOutfit === 'generating'}
          loading={activeSaveState === 'saving'}
          trailing={
            pinOutfit === 'generating' ? (
              <DotsLoader
                color={theme.colors.figmaAction}
                testID="home-wear-this-generating-spinner"
              />
            ) : (
              <IconHomeHeartOutline width={24} height={24} />
            )
          }
          style={styles.primaryActionFull}
          textStyle={styles.primaryActionLabel}
        />
      )}
      {activeSaveState === 'error' ? (
        <Text style={styles.saveErrorText}>{t('home.save_failed_retry')}</Text>
      ) : null}
    </View>
  );
};
