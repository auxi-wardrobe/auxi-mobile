/**
 * Remove-from-favourite confirmation — bottom sheet (Figma node 3539:23335 →
 * sheet 3539:23380).
 *
 * Structure (CEO 2026-06-19): a bottom-anchored sheet, NOT a centred modal.
 * GH-364: presents through the design-system MBottomSheet primitive — the
 * primitive owns the surface, top radius, grab handle, dim scrim, slide-up/down
 * motion (open/close asymmetry) and reduce-motion fallback. This file owns only
 * the content:
 *   - Panel — header copy block.
 *   - Button group — a SEPARATE bottom block with a `backdrop-blur-4`
 *     (BlurView, same treatment as HomeViewToggleFooter) + a home-indicator
 *     safe-area inset (`pb-36`).
 *   - Destructive action on the LEFT (diverges from the shared SettingsDialog):
 *       "Yes 🗑"  → red-text ghost button + trash icon (no border/fill)
 *       "Cancel"  → outlined secondary button (1.5px neutral border)
 *
 * Red comes from the `figmaItemDetailDanger` token (icon/danger/base #c0392b),
 * never a literal. testIDs match the prior wiring so Maestro flows keep working
 * (favourite-remove-confirm / favourite-remove-cancel).
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { Icons } from '../../assets/icons';
import { MBottomSheet } from '../../components/design-system/lib';

type Props = {
  visible: boolean;
  isBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const RemoveFavouriteDialog: React.FC<Props> = ({
  visible,
  isBusy,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <MBottomSheet visible={visible} onDismiss={onCancel}>
      {/* MBottomSheet owns surface, top radius, grab handle, scrim + motion. */}
      <View testID="favourite-remove-dialog">
        {/* Panel — header copy. */}
        <View style={styles.panel}>
          <Text style={styles.title}>{t('favourite.remove_title')}</Text>
          <Text style={styles.body}>{t('favourite.remove_body')}</Text>
        </View>

        {/* Button block — separate bottom slab: backdrop blur + home-indicator
            safe-area inset, pinned to the screen bottom. */}
        <View
          style={[
            styles.buttonBlock,
            { paddingBottom: insets.bottom + theme.spacing.l },
          ]}
        >
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={4}
            reducedTransparencyFallbackColor={theme.colors.white}
            pointerEvents="none"
          />
          <View style={styles.buttonTint} pointerEvents="none" />

          <View style={styles.actions}>
            {/* Destructive "Yes" on the LEFT — red-text ghost + trash icon. */}
            <TouchableOpacity
              testID="favourite-remove-confirm"
              accessibilityRole="button"
              accessibilityLabel={t('favourite.remove_confirm')}
              activeOpacity={0.82}
              disabled={isBusy}
              style={[
                styles.action,
                styles.ghostAction,
                isBusy && styles.disabledAction,
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.dangerLabel}>
                {t('favourite.remove_confirm')}
              </Text>
              <Icons.Trash
                width={24}
                height={24}
                color={theme.colors.figmaItemDetailDanger}
              />
            </TouchableOpacity>

            {/* "Cancel" on the RIGHT — outlined secondary. */}
            <TouchableOpacity
              testID="favourite-remove-cancel"
              accessibilityRole="button"
              accessibilityLabel={t('favourite.remove_cancel')}
              activeOpacity={0.82}
              disabled={isBusy}
              style={[
                styles.action,
                styles.outlinedAction,
                isBusy && styles.disabledAction,
              ]}
              onPress={onCancel}
            >
              <Text style={styles.cancelLabel}>
                {t('favourite.remove_cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </MBottomSheet>
  );
};

const styles = StyleSheet.create({
  // Panel — header copy block (MBottomSheet owns the surface, top radius, grab
  // handle, scrim and slide motion).
  panel: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.l,
  },
  // Sheet header — Inter SemiBold 14/20 (body/sm Semibold).
  title: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.uacTextBase,
  },
  // Body — Inter Regular 14/20 (body/sm Regular); gap-8 below the title.
  body: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.uacTextBase,
    marginTop: theme.spacing.s,
  },
  // Separate bottom button slab — backdrop-blur-4 over a white tint.
  buttonBlock: {
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.m,
    overflow: 'hidden',
  },
  // White@90% tint over the blur (matches the header/footer treatment).
  buttonTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.figmaItemDetailHeaderBg,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.uacDimension12,
  },
  action: {
    flex: 1,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
  },
  // "Yes" ghost: no border/fill, container invisible until interacted (Figma
  // Text-button spec) — rounded so the press ripple/highlight stays pill-shaped.
  ghostAction: {
    borderRadius: theme.borderRadius.round,
  },
  // "Cancel" outlined secondary: 1.5px neutral border, 16 radius.
  outlinedAction: {
    borderWidth: 1.5,
    borderColor: theme.colors.uacTextBase,
    borderRadius: theme.borderRadius.uacButtonCta,
  },
  dangerLabel: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.figmaItemDetailDanger,
  },
  cancelLabel: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.uacTextBase,
  },
  disabledAction: {
    opacity: 0.55,
  },
});
