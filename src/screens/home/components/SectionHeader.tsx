import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { styles } from '../styles';

type Props = {
  title: string;
  /** Omit to render the title alone (no "see more" affordance). */
  onSeeMore?: () => void;
  testID: string;
  seeMoreAccessibilityLabel?: string;
};

/** "TODAY'S PICKS ················ see more" — the landing page's section rule. */
export const SectionHeader: React.FC<Props> = ({
  title,
  onSeeMore,
  testID,
  seeMoreAccessibilityLabel,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeMore ? (
        <TouchableOpacity
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={seeMoreAccessibilityLabel ?? title}
          activeOpacity={0.82}
          onPress={onSeeMore}
        >
          <Text style={styles.sectionAction}>
            {t('homeLanding.see_more')}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};
