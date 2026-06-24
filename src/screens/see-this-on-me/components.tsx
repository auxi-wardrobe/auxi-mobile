/**
 * Shared building blocks for the "See this on me" / Self visualization flow
 * (Figma node 2852:22266). Kept here so each step file stays small and the
 * conversational layout (prompt bubble + user photo thumbnail) is DRY.
 */
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MBottomSheet, MSheetOption } from '../../components/design-system/lib';
import { TopIconButton } from '../../components/primitives/FigmaPrimitives';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { ImageSource } from '../../hooks/use-image-picker';

interface StomHeaderProps {
  title: string;
  onBack: () => void;
}

/**
 * Centered-title header (Figma `header` 3395:8500) — back chevron + title +
 * opacity-0 trailing spacer to keep the title optically centered. Mirrors the
 * FavouriteScreen header treatment (interMediumSm 14/20, blurred white bg).
 */
export const StomHeader: React.FC<StomHeaderProps> = ({ title, onBack }) => (
  <View style={styles.header}>
    <TopIconButton
      testID="stom-back"
      accessibilityLabel="Go back"
      onPress={onBack}
      style={styles.headerBack}
      icon={<Icons.ChevronLeft width={20} height={20} />}
    />
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={styles.headerSpacer} />
  </View>
);

interface PromptBubbleProps {
  text: string;
  icon?: React.ReactNode;
  testID?: string;
}

/**
 * Left-aligned "assistant" prompt bubble — greige pill + copy + optional
 * outline icon (Figma `Frame 2159` / `Frame 2161`).
 */
export const PromptBubble: React.FC<PromptBubbleProps> = ({
  text,
  icon,
  testID,
}) => (
  <View style={styles.promptBubble} testID={testID}>
    <Text style={styles.promptText}>{text}</Text>
    {icon ? <View style={styles.promptIcon}>{icon}</View> : null}
  </View>
);

interface PhotoThumbProps {
  uri: string;
  testID?: string;
}

/** Right-aligned user photo thumbnail (96×127 3:4, Figma `Image 3:4`). */
export const PhotoThumb: React.FC<PhotoThumbProps> = ({ uri, testID }) => (
  <View style={styles.thumbRow}>
    <Image
      source={{ uri }}
      style={styles.thumb}
      resizeMode="cover"
      testID={testID}
    />
  </View>
);

/** Centered "Your photos are always kept private" footer caption. */
export const PrivacyFooter: React.FC<{ text: string }> = ({ text }) => (
  <Text style={styles.privacyFooter}>{text}</Text>
);

interface InlineErrorProps {
  text: string;
  testID?: string;
}

/**
 * Left-aligned inline error notice shown on a photo step when the backend
 * rejects the chosen photo (e.g. "not a person"). Distinct from the generic
 * generating-failure copy — this lives in the capture transcript so the user
 * can immediately re-pick.
 */
export const InlineError: React.FC<InlineErrorProps> = ({ text, testID }) => (
  <View style={styles.inlineError} testID={testID}>
    <Text style={styles.inlineErrorText}>{text}</Text>
  </View>
);

interface PhotoSourceSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (source: ImageSource) => void;
}

/**
 * Bottom action sheet to choose a photo source — "Take photo" (camera) or
 * "Choose from library" (gallery). Mirrors the BodyScreen add-photo modal so
 * the simulator (no camera) and real users can both proceed. Used by both the
 * selfie (Step 1) and full-body (Step 2) capture CTAs.
 */
export const PhotoSourceSheet: React.FC<PhotoSourceSheetProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const { t } = useTranslation();

  return (
    <MBottomSheet
      visible={visible}
      onDismiss={onClose}
      testID="stom-photo-source-sheet"
    >
      <Text style={styles.sheetTitle}>
        {t('seeThisOnMe.choosePhotoSource')}
      </Text>
      <MSheetOption
        testID="stom-photo-source-camera"
        label={t('seeThisOnMe.takePhoto')}
        onPress={() => onSelect('camera')}
      />
      <MSheetOption
        testID="stom-photo-source-gallery"
        label={t('seeThisOnMe.chooseFromLibrary')}
        onPress={() => onSelect('gallery')}
      />
      <MSheetOption
        testID="stom-photo-source-cancel"
        label={t('seeThisOnMe.cancel')}
        onPress={onClose}
      />
    </MBottomSheet>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingVertical: theme.spacing.uacDimension12,
    backgroundColor: theme.colors.figmaItemDetailHeaderBg,
  },
  headerBack: {
    backgroundColor: theme.colors.figmaSurface,
    borderRadius: 16,
  },
  headerTitle: {
    ...theme.typography.aliases.interMediumSm,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 45,
    height: 45,
  },
  promptBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    maxWidth: '92%',
    gap: theme.spacing.uacDimension12,
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingVertical: theme.spacing.uacDimension12,
    borderRadius: theme.borderRadius.m, // chat bubble — 8px (border-radius/md)
    backgroundColor: theme.colors.figmaCaptionPillBg,
  },
  promptText: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.uacTextBase,
    flexShrink: 1,
  },
  promptIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbRow: {
    alignSelf: 'flex-end',
  },
  thumb: {
    width: 96,
    height: 127,
    borderRadius: theme.borderRadius.figmaTile,
    backgroundColor: theme.colors.figmaCardSurface,
  },
  privacyFooter: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaOnboardingStepLabel,
    textAlign: 'center',
  },
  inlineError: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingVertical: theme.spacing.s,
    borderRadius: theme.borderRadius.m, // chat bubble — 8px (border-radius/md)
    backgroundColor: theme.colors.figmaCaptionPillBg,
  },
  inlineErrorText: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaRed,
  },
  // Title row for the MBottomSheet photo-source picker (camera/gallery/cancel).
  sheetTitle: {
    ...theme.typography.aliases.interMediumSm,
    textAlign: 'center',
    color: theme.colors.figmaAction,
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingBottom: theme.spacing.s,
  },
});
