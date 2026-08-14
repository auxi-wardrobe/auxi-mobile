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
import { role, space } from '../design-system/m-tokens';
import { MacgieFace } from '../macgie';
import { theme } from '../../theme/theme';
import type { UsageLimitFeature } from '../../hooks/useUsageLimitGate';

// Body copy may carry ONE `**bold**`-marked span (Figma inline emphasis on
// the feature name, e.g. see_on_me's "You've used all your free **See on
// Me** tries..."). No existing i18n interpolation/Trans precedent exists in
// this codebase (checked), so this is a minimal local marker parser — plain
// strings with no markers pass through as a single span, unaffected.
const renderBodyWithEmphasis = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  if (parts.length === 1) {
    return text;
  }
  return parts.map((part, i) => {
    const match = part.match(/^\*\*([^*]+)\*\*$/);
    return match ? (
      <Text key={i} style={styles.bodyEmphasis}>
        {match[1]}
      </Text>
    ) : (
      part
    );
  });
};

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
        <Text style={styles.body}>
          {renderBodyWithEmphasis(t(`usageLimit.${feature}_body`))}
        </Text>
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
    // Figma: Text-sm(l-20)/Semibold, 14px (node 5078:13668 headline) — NOT
    // the 20px h3 this used to render. `interSemiboldXsSm` is the shipped
    // 14/20 Semibold alias (see ContextChipsModal.tsx title for precedent).
    ...theme.typography.aliases.interSemiboldXsSm,
    color: role.ink,
    textAlign: 'center',
  },
  body: {
    // Figma: body/sm, 14px/20 regular (node 5078:13668 supporting text) —
    // NOT the 16px `type.body`. `interBodySm` is the shipped 14/20 Regular
    // alias (see ContextChipsModal.tsx subtitle for precedent).
    ...theme.typography.aliases.interBodySm,
    color: role.ink2,
    textAlign: 'center',
  },
  // Inline emphasis span for `renderBodyWithEmphasis` — same size/leading as
  // `body`, Semibold weight (Figma's bold "See on Me" run).
  bodyEmphasis: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: role.ink2,
  },
  actions: {
    marginTop: space.s2,
    alignSelf: 'stretch',
    alignItems: 'center',
    // Figma "button group" gap is 12px, not the 8px `space.s2` this used to
    // render.
    gap: space.s3,
  },
});
