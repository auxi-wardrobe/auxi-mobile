import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme/theme';
import { Header } from '../layout/Header';

type SettingsScreenScaffoldProps = {
  title: string;
  /** 'menu' → hamburger opens the sidebar (root). 'back' → chevron pops. */
  headerVariant: 'menu' | 'back';
  onLeftPress: () => void;
  leftTestID: string;
  leftAccessibilityLabel?: string;
  children: React.ReactNode;
};

/**
 * Shared chrome for every Settings screen — SafeArea + canonical header + a
 * scrollable, consistently-padded content column, on the same flat app
 * background as Wardrobe/Database (no sheet surface, so no top shadow). The
 * main screen passes the menu (sidebar) header; the sub-screens pass the back
 * (chevron) header. Centralising this keeps all four screens visually identical
 * and makes adding a new sub-screen a one-liner.
 */
export const SettingsScreenScaffold: React.FC<SettingsScreenScaffoldProps> = ({
  title,
  headerVariant,
  onLeftPress,
  leftTestID,
  leftAccessibilityLabel,
  children,
}) => {
  const HeaderPreset =
    headerVariant === 'menu' ? Header.MenuTitle : Header.BackTitle;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderPreset
        title={title}
        leftTestID={leftTestID}
        leftAccessibilityLabel={leftAccessibilityLabel}
        onBack={onLeftPress}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 8,
    paddingHorizontal: 27,
    paddingBottom: 24,
  },
  inner: {
    paddingTop: 8,
  },
});
