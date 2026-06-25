import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  BottomSheetSurface,
  TopIconButton,
} from '../components/primitives/FigmaPrimitives';
import { FeedbackForm } from '../components/features/FeedbackForm';
import { Icons } from '../assets/icons';
import { useSidebar } from '../context/SidebarContext';
import { theme } from '../theme/theme';

export const FeedbackScreen: React.FC = () => {
  const { t } = useTranslation();
  const { open: openSidebar } = useSidebar();

  return (
    <SafeAreaView style={styles.container}>
      <BottomSheetSurface style={styles.sheet}>
        {/* Header — hamburger-left + centered title (mirrors SettingsScreen). */}
        <View style={styles.header}>
          <TopIconButton
            testID="feedback-menu-button"
            accessibilityLabel={t('feedback.a11y_open_menu')}
            icon={<Icons.Menu width={24} height={24} />}
            onPress={openSidebar}
          />
          <View pointerEvents="none" style={styles.titleWrap}>
            <Text style={styles.title}>{t('feedback.title')}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <FeedbackForm fill />
      </BottomSheetSurface>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaSurface,
  },
  sheet: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.l,
    paddingHorizontal: theme.spacing.uacButtonPaddingX,
    paddingBottom: theme.spacing.s,
  },
  titleWrap: {
    position: 'absolute',
    left: 84,
    right: 84,
    top: theme.spacing.l,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.figmaTextDark,
  },
  headerSpacer: {
    width: 45,
    height: 45,
  },
});
