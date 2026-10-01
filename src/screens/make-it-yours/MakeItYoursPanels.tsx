import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MacgieLoader } from '../../components/macgie/MacgieLoader';
import type { MakeItYoursItem } from '../../services/makeItYoursService';
import { makeItYoursStyles as styles } from './makeItYoursStyles';
import { TileImage } from './MakeItYoursTileImage';

/** Figma `macgie-animate-1` slot is 65×80 — the mascot height. */
const MASCOT_SIZE = 80;

const LOADING_STEPS = ['loading_step_1', 'loading_step_2', 'loading_step_3'] as const;

/**
 * "Let's make it yours" (Figma 5456:19479) — shown in place of the detail
 * body while the match runs. Mascot motion + reduce-motion fallback come from
 * `MacgieLoader`; the three steps are static copy per the frame.
 */
export const MakeItYoursLoadingPanel: React.FC = () => {
  const { t } = useTranslation();
  return (
    <View
      style={styles.panel}
      testID="make-it-yours-loading"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('makeItYours.a11y_loading')}
      accessibilityState={{ busy: true }}
    >
      <View style={styles.loadingBlock}>
        <MacgieLoader variant="inline" size={MASCOT_SIZE} asLogo />
        <Text style={styles.title}>{t('makeItYours.loading_title')}</Text>
        <View style={styles.steps}>
          {LOADING_STEPS.map(key => (
            <Text key={key} style={styles.step}>
              {`•  ${t(`makeItYours.${key}`)}`}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
};

type MessagePanelProps = {
  title: string;
  body: string;
  testID: string;
  /** Partial state: the closest pieces the user owns (backend `relevant_items`). */
  items?: MakeItYoursItem[];
};

/**
 * Text-only result states — no match (Figma 5456:19860, minus the summary
 * card: match %/counts are out of AU-458 scope), and, by the same layout
 * (user decision 2026-09-26, no dedicated frames), partial / no wardrobe /
 * error. The CTAs live in the action bar. Partial also shows the owned
 * pieces that DID match, so "You own a few pieces" is backed by what's shown.
 */
export const MakeItYoursMessagePanel: React.FC<MessagePanelProps> = ({
  title,
  body,
  testID,
  items,
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.panel} testID={testID}>
      <Text style={styles.title} accessibilityRole="header">
        {t('makeItYours.result_title')}
      </Text>
      <View style={styles.messageBlock}>
        <Text style={styles.messageTitle}>{title}</Text>
        <Text style={styles.messageBody}>{body}</Text>
      </View>
      {items && items.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pager}
          contentContainerStyle={[styles.page, styles.stripContent]}
          testID="make-it-yours-relevant-items"
        >
          {items.map(item => (
            <View
              key={item.id}
              style={[styles.tile, styles.stripTile]}
              accessible
              accessibilityLabel={item.name ?? item.category}
              testID={`make-it-yours-relevant-item-${item.id}`}
            >
              <TileImage item={item} />
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
};
