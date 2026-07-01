import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PillButton } from '../../../components/primitives/FigmaPrimitives';
import { DotsLoader } from '../../../components/atoms/DotsLoader';
import IconHomeHeartOutline from '../../../assets/images/icon_home_heart_outline.svg';
import IconChevronRight from '../../../assets/images/icon_chevron_right.svg';
import IconFeedback from '../../../assets/images/feedback.svg';
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
  onOpenFeedback: () => void;
};

/**
 * The sticky Home footer cluster: the "Wear this" CTA (which flips to a
 * "See in favourites" row once saved), the save-error hint, and the floating
 * feedback affordance. All share the `optionSets.length > 0` visibility gate.
 */
export const WearThisFooter = ({
  visible,
  activeSaveState,
  pinOutfit,
  activeOutfit,
  onOpenFavourites,
  onWearThis,
  onOpenFeedback,
}: WearThisFooterProps) => {
  const { t } = useTranslation();

  if (!visible) {
    return null;
  }

  return (
    <>
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
          <Text style={styles.saveErrorText}>
            {t('home.save_failed_retry')}
          </Text>
        ) : null}
      </View>

      {/* Feedback affordance — 44px floating button, bottom-left of the
          footer, Home only. Opens the in-app Feedback bottom sheet. AI-result
          feedback now lives on the try-on result (see OutfitPreview). */}
      <TouchableOpacity
        testID="home-feedback-fab"
        accessibilityRole="button"
        accessibilityLabel={t('feedback.title')}
        activeOpacity={0.85}
        onPress={onOpenFeedback}
        style={styles.aiFeedbackFab}
      >
        <IconFeedback width={24} height={24} color={theme.colors.uacTextBase} />
      </TouchableOpacity>
    </>
  );
};
