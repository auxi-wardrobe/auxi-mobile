import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CapsuleFull } from '../../../services/capsuleService';
import { gapsInterpolation, hasGaps } from '../capsule-format';
import { capsuleStyles as s } from '../styles';

interface GapsBannerProps {
  capsule: CapsuleFull;
}

/**
 * success_with_gaps banner — "We created {{made}} outfits instead of
 * {{target}}." + the list of missing categories. Renders nothing when the
 * capsule reached its target.
 */
export const GapsBanner: React.FC<GapsBannerProps> = ({ capsule }) => {
  const { t } = useTranslation();
  if (!hasGaps(capsule)) {
    return null;
  }
  const { made, target } = gapsInterpolation(capsule);
  return (
    <View style={s.gapsBanner} testID="capsule-gaps-banner">
      <Text style={s.gapsText}>
        {t('capsule.gaps_summary', { made, target })}
      </Text>
      {capsule.missing_categories.length > 0 && (
        <>
          <Text style={s.gapsText}>{t('capsule.gaps_missing_title')}</Text>
          {capsule.missing_categories.map(cat => (
            <Text key={cat} style={s.gapsItem}>
              • {cat}
            </Text>
          ))}
        </>
      )}
    </View>
  );
};
