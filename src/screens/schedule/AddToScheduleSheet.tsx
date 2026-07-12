import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { Icons } from '../../assets/icons';
import IconMyCreation from '../../assets/images/icon_my_creation.svg';
import { MSheetOption } from '../../components/design-system/lib';
import { ContextualBottomSheet } from '../../components/features/ContextualBottomSheet';

// "Add an outfit" source picker — the Schedule header "+" opens this so the
// user chooses where to add an outfit from, then is routed to that page
// (Favourite / My Creations). Rides the shared ContextualBottomSheet shell
// (full-width, "Refine suggestions" reveal motion) + MSheetOption rows, so the
// look / motion / scrim / reduce-motion / safe-area match the app's other
// contextual sheets instead of a bespoke sheet stack.

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSelectFavourite: () => void;
  onSelectCreations: () => void;
  testID?: string;
}

export const AddToScheduleSheet: React.FC<Props> = ({
  visible,
  onDismiss,
  onSelectFavourite,
  onSelectCreations,
  testID = 'schedule-add-source-sheet',
}) => {
  const { t } = useTranslation();

  return (
    <ContextualBottomSheet visible={visible} onDismiss={onDismiss} testID={testID}>
      <Text style={styles.title}>{t('schedule.add_sheet.title')}</Text>
      <Text style={styles.subtitle}>{t('schedule.add_sheet.subtitle')}</Text>

      <MSheetOption
        icon={Icons.Heart}
        label={t('schedule.add_sheet.favourite_title')}
        onPress={onSelectFavourite}
        testID={`${testID}-favourite`}
      />
      <MSheetOption
        icon={IconMyCreation}
        label={t('schedule.add_sheet.creations_title')}
        onPress={onSelectCreations}
        testID={`${testID}-creations`}
      />
    </ContextualBottomSheet>
  );
};

const styles = StyleSheet.create({
  title: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.uacTextBase,
  },
  subtitle: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.uacTextBase,
    marginTop: theme.spacing.s,
    marginBottom: theme.spacing.m,
  },
});
