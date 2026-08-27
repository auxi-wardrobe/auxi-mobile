/**
 * DefaultItemsUnlockedSheet — the "congratulations, you can now remove
 * Macgie's default items" milestone sheet.
 *
 * Macgie seeds every new wardrobe with default (starter catalog) items so the
 * suggestion engine has signal on day one. Once the user has uploaded
 * `threshold` items of their own, those defaults become removable — this sheet
 * is how they find out. Shown once per user (see
 * `services/defaultItemsMilestone.ts`), fire-and-forget after a successful
 * upload.
 *
 * Shell: the shared `ContextualBottomSheet` — the app's ONE full-width
 * bottom-sheet shell (edge-to-edge panel, top-corners-only radius, scrim,
 * reveal motion, swipe-to-dismiss, reduce-motion, safe-area). This file
 * supplies only the content; nothing here may narrow the panel (see
 * docs/bottom-sheets.md).
 *
 * Content mirrors `UsageLimitSheet` — mascot + title + body over a primary CTA
 * ("Manage my wardrobe", `onManageWardrobe`) and a secondary text CTA ("Got
 * it", `onDismiss`) — so the two milestone/limit moments read as one family.
 *
 *   const gate = useDefaultItemsUnlockedGate();
 *   ...
 *   <DefaultItemsUnlockedSheet
 *     {...gate.sheetProps}
 *     onManageWardrobe={() => gate.dismissThenNavigate(goToWardrobe)}
 *   />
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MButton } from '../design-system/lib';
import { role, space } from '../design-system/m-tokens';
import { ContextualBottomSheet } from './ContextualBottomSheet';
import { MacgieFace } from '../macgie';
import { theme } from '../../theme/theme';

export interface DefaultItemsUnlockedSheetProps {
  visible: boolean;
  onDismiss: () => void;
  /** Items the user has uploaded — interpolated into the body copy. */
  ownItemCount: number;
  /** The threshold they just crossed — interpolated into the body copy. */
  threshold: number;
  /**
   * Primary CTA. Optional: when omitted the sheet renders the dismiss CTA
   * alone, so a surface with nowhere useful to send the user (the wardrobe
   * itself) doesn't have to invent a destination.
   */
  onManageWardrobe?: () => void;
  /** Root testID (default `default-items-unlocked-sheet`). */
  testID?: string;
}

export const DefaultItemsUnlockedSheet: React.FC<
  DefaultItemsUnlockedSheetProps
> = ({
  visible,
  onDismiss,
  ownItemCount,
  threshold,
  onManageWardrobe,
  testID = 'default-items-unlocked-sheet',
}) => {
  const { t } = useTranslation();

  return (
    <ContextualBottomSheet
      visible={visible}
      onDismiss={onDismiss}
      testID={testID}
    >
      <View style={styles.content}>
        <MacgieFace size={64} />
        <Text style={styles.title} testID={`${testID}-title`}>
          {t('defaultItemsUnlocked.title')}
        </Text>
        <Text style={styles.body} testID={`${testID}-body`}>
          {t('defaultItemsUnlocked.body', {
            itemCount: ownItemCount,
            threshold,
          })}
        </Text>
        <View style={styles.actions}>
          {onManageWardrobe ? (
            <MButton
              variant="primary"
              onPress={onManageWardrobe}
              testID={`${testID}-manage`}
              accessibilityLabel={t('defaultItemsUnlocked.manage_cta')}
            >
              {t('defaultItemsUnlocked.manage_cta')}
            </MButton>
          ) : null}
          <MButton
            variant="text"
            onPress={onDismiss}
            testID={`${testID}-dismiss`}
            accessibilityLabel={t('defaultItemsUnlocked.got_it')}
          >
            {t('defaultItemsUnlocked.got_it')}
          </MButton>
        </View>
      </View>
    </ContextualBottomSheet>
  );
};

const styles = StyleSheet.create({
  // Centred column. Horizontal padding + top padding + home-indicator inset
  // all come from the ContextualBottomSheet shell — adding any here (or a
  // width / margin / maxWidth) would inset the content twice.
  content: {
    alignItems: 'center',
    gap: space.s2,
  },
  title: {
    // 14/20 Semibold — same tier as UsageLimitSheet's title so the two
    // milestone sheets read as one family.
    ...theme.typography.aliases.interSemiboldXsSm,
    color: role.ink,
    textAlign: 'center',
  },
  body: {
    ...theme.typography.aliases.interBodySm,
    color: role.ink2,
    textAlign: 'center',
  },
  // Full-bleed stacked CTAs — same treatment as every other sheet.
  actions: {
    marginTop: space.s2,
    alignSelf: 'stretch',
    gap: space.s3,
  },
});
