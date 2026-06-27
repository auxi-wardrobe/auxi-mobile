import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { Icons } from '../../assets/icons';
import IconMyCreation from '../../assets/images/icon_my_creation.svg';
import { MBottomSheet, MSheetOption } from '../../components/design-system/lib';

// "Add an outfit" source picker — the Schedule header "+" opens this so the
// user chooses where to add an outfit from, then is routed to that page
// (Favourite / My Creations). Built on the DS MBottomSheet shell + MSheetOption
// rows, so motion / scrim / reduce-motion / safe-area all come from the design
// system instead of a bespoke sheet stack.

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
    <MBottomSheet visible={visible} onDismiss={onDismiss} testID={testID}>
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
    </MBottomSheet>
  );
};

const styles = StyleSheet.create({
  title: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.figmaTextPrimary,
  },
  subtitle: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    marginTop: 4,
    marginBottom: 4,
  },
});
