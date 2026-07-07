import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '../../theme/theme';
import { BottomSheetSurface } from '../primitives/FigmaPrimitives';
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
 * Shared chrome for every Settings screen — SafeArea + bottom-sheet surface +
 * canonical header + a scrollable, consistently-padded content column. The main
 * screen passes the menu (sidebar) header; the sub-screens pass the back
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
    <SafeAreaView style={styles.container}>
      <BottomSheetSurface style={styles.sheet}>
        <HeaderPreset
          title={title}
          background="transparent"
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
