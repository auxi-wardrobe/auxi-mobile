import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../../assets/icons';
import { theme } from '../../../theme/theme';
import { trackCapsuleSummaryExpanded } from '../../../services/analytics';
import type { CapsuleFull } from '../../../services/capsuleService';
import { weatherRangeLabel } from '../capsule-format';
import { capsuleStyles as s } from '../styles';

interface CapsuleSummaryPanelProps {
  capsule: CapsuleFull;
}

/**
 * Expandable summary block: outer/top/bottom/shoe/accessory counts + weather
 * range + formalness score. Fires `capsule_summary_expanded` the first time it
 * opens per mount.
 */
export const CapsuleSummaryPanel: React.FC<CapsuleSummaryPanelProps> = ({
  capsule,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const summary = capsule.summary;

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      trackCapsuleSummaryExpanded();
    }
  };

  const rows: Array<{ label: string; value: string | number }> = [
    { label: t('capsule.cat_outer'), value: summary?.outer_count ?? 0 },
    { label: t('capsule.cat_top'), value: summary?.top_count ?? 0 },
    { label: t('capsule.cat_bottom'), value: summary?.bottom_count ?? 0 },
    { label: t('capsule.cat_footwear'), value: summary?.shoe_count ?? 0 },
    { label: t('capsule.cat_accessory'), value: summary?.accessory_count ?? 0 },
    { label: t('capsule.summary_weather'), value: weatherRangeLabel(capsule) },
    {
      label: t('capsule.summary_formalness'),
      value: summary?.formalness_score ?? 0,
    },
  ];

  return (
    <View style={s.summaryPanel}>
      <Pressable
        style={s.summaryToggle}
        onPress={toggle}
        testID={expanded ? 'capsule-summary-toggle-open' : 'capsule-summary-toggle'}
        accessibilityRole="button"
        accessibilityLabel={
          expanded ? t('capsule.summary_hide') : t('capsule.summary_show')
        }
      >
        <Text style={s.summaryToggleText}>{t('capsule.summary_title')}</Text>
        <Icons.ChevronDown
          width={20}
          height={20}
          color={theme.colors.figmaTextDark}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      {expanded &&
        rows.map(row => (
          <View key={row.label} style={s.summaryRow}>
            <Text style={s.summaryLabel}>{row.label}</Text>
            <Text style={s.summaryValue}>{String(row.value)}</Text>
          </View>
        ))}
    </View>
  );
};
