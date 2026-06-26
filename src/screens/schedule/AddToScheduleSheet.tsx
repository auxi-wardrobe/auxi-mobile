import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { Icons } from '../../assets/icons';
import IconMyCreation from '../../assets/images/icon_my_creation.svg';
import { AppBottomSheet } from '../../components/features/AppBottomSheet';

// "Add an outfit" source picker — the Schedule header "+" opens this so the
// user chooses where to add an outfit from, then is routed to that page
// (Favourite / My Creations). Uses the shared AppBottomSheet shell so its
// motion / scrim / card match every other bottom sheet.

interface RowProps {
  Icon: React.FC<{ width?: number; height?: number; color?: string }>;
  title: string;
  description: string;
  onPress: () => void;
  testID: string;
  showDivider?: boolean;
}

const SourceRow: React.FC<RowProps> = ({
  Icon,
  title,
  description,
  onPress,
  testID,
  showDivider,
}) => (
  <TouchableOpacity
    style={[styles.row, showDivider && styles.rowDivider]}
    activeOpacity={0.7}
    onPress={onPress}
    testID={testID}
    accessibilityRole="button"
    accessibilityLabel={title}
  >
    <View style={styles.rowIcon}>
      <Icon width={24} height={24} color={theme.colors.uacTextBase} />
    </View>
    <View style={styles.rowTexts}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowDescription}>{description}</Text>
    </View>
  </TouchableOpacity>
);

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
    <AppBottomSheet visible={visible} onDismiss={onDismiss} testID={testID}>
      <Text style={styles.title}>{t('schedule.add_sheet.title')}</Text>
      <Text style={styles.subtitle}>{t('schedule.add_sheet.subtitle')}</Text>

      <SourceRow
        Icon={Icons.Heart}
        title={t('schedule.add_sheet.favourite_title')}
        description={t('schedule.add_sheet.favourite_desc')}
        onPress={onSelectFavourite}
        testID={`${testID}-favourite`}
      />
      <SourceRow
        Icon={IconMyCreation}
        title={t('schedule.add_sheet.creations_title')}
        description={t('schedule.add_sheet.creations_desc')}
        onPress={onSelectCreations}
        testID={`${testID}-creations`}
        showDivider
      />
    </AppBottomSheet>
  );
};

const styles = StyleSheet.create({
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    lineHeight: 24,
    color: theme.colors.figmaTextPrimary,
  },
  subtitle: {
    ...theme.typography.aliases.interBodyMd,
    color: theme.colors.figmaTextSecondary,
    marginTop: 4,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  // Divider sits ABOVE the second row (between the two rows), matching the
  // design's single hairline separator.
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.figmaDivider,
  },
  rowIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTexts: {
    flex: 1,
  },
  rowTitle: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.figmaTextPrimary,
  },
  rowDescription: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    marginTop: 2,
  },
});
