/**
 * UsageLimitSheet — the soft-paywall "you've reached the free limit" sheet
 * (AU-442). Feature-parameterised: one component, three copy variants keyed
 * by `feature` (`see_on_me` / `wardrobe_items` / `enhance_photo`), matching
 * Figma nodes `5078:13668` / `5078:13983` / `5078:14024`.
 *
 * Presentational bottom-sheet on the design-system `MBottomSheet` primitive
 * (scrim + motion + swipe-to-dismiss + tokens on-system), mirroring
 * `AiLimitSheet`'s shape but with TWO CTAs — primary "Upgrade to Macgie+"
 * (`onUpgrade`) and secondary text/pill "Maybe later" (`onDismiss`).
 *
 * Mascot: reuses the existing `MacgieFace` mascot as the illustration
 * (locked decision, AU-442 extraction §Locked decisions #1) — no new "sad
 * cat" asset was exported for this MVP pass.
 *
 *   const gate = useUsageLimitGate();
 *   ...
 *   <UsageLimitSheet
 *     {...gate.sheetProps}
 *     onUpgrade={() => navigation.navigate('NotifyMe', { feature: gate.sheetProps.feature })}
 *   />
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MBottomSheet, MButton } from '../design-system/lib';
import { role, space, type } from '../design-system/m-tokens';
import { MacgieFace } from '../macgie';
import type { UsageLimitFeature } from '../../hooks/useUsageLimitGate';

export interface UsageLimitSheetProps {
  visible: boolean;
  onDismiss: () => void;
  /** Fires when the primary CTA is tapped. Navigation is the caller's concern. */
  onUpgrade: () => void;
  feature: UsageLimitFeature;
  /** Root testID (default `usage-limit-sheet`); CTAs get `-upgrade` / `-dismiss`. */
  testID?: string;
}

export const UsageLimitSheet: React.FC<UsageLimitSheetProps> = ({
  visible,
  onDismiss,
  onUpgrade,
  feature,
  testID = 'usage-limit-sheet',
}) => {
  const { t } = useTranslation();

  return (
    <MBottomSheet visible={visible} onDismiss={onDismiss} testID={testID}>
      <View style={styles.content}>
        <MacgieFace size={64} />
        <Text style={styles.title}>{t(`usageLimit.${feature}_title`)}</Text>
        <Text style={styles.body}>{t(`usageLimit.${feature}_body`)}</Text>
        <View style={styles.actions}>
          <MButton
            variant="primary"
            onPress={onUpgrade}
            testID={`${testID}-upgrade`}
            accessibilityLabel={t('usageLimit.upgrade_cta')}
          >
            {t('usageLimit.upgrade_cta')}
          </MButton>
          <MButton
            variant="text"
            onPress={onDismiss}
            testID={`${testID}-dismiss`}
            accessibilityLabel={t('usageLimit.maybe_later')}
          >
            {t('usageLimit.maybe_later')}
          </MButton>
        </View>
      </View>
    </MBottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingHorizontal: space.s2,
    paddingTop: space.s2,
    paddingBottom: space.s3,
    gap: space.s2,
  },
  title: {
    ...type.h3,
    color: role.ink,
    textAlign: 'center',
  },
  body: {
    ...type.body,
    color: role.ink2,
    textAlign: 'center',
  },
  actions: {
    marginTop: space.s2,
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: space.s2,
  },
});
