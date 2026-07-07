import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/layout/Header';
import { FeedbackForm } from '../components/features/FeedbackForm';
import { useSidebar } from '../context/SidebarContext';
import { theme } from '../theme/theme';

export const FeedbackScreen: React.FC = () => {
  const { t } = useTranslation();
  const { open: openSidebar } = useSidebar();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Canonical header — hamburger-left + centred title (no right action). */}
      <Header.MenuTitle
        title={t('feedback.title')}
        leftTestID="feedback-menu-button"
        leftAccessibilityLabel={t('feedback.a11y_open_menu')}
        onBack={openSidebar}
      />

      <FeedbackForm fill />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
});
