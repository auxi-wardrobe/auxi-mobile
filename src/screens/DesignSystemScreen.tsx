/**
 * DesignSystemScreen — in-app Design System reference / style guide.
 *
 * A single scrollable catalog of tokens + components, faithfully recreating
 * `Auxi Design System.html`. __DEV__-gated reference screen (reached from the
 * Settings "Version" row in dev builds) — NOT a shipped consumer screen, so
 * its section/token labels are static English (no i18n).
 *
 * Source of truth: auxi-ds.css. All styling derives from `theme.ds` /
 * `theme.typography.aliases` — no hex/font literals (token-lint clean).
 * Section files live under src/components/design-system/.
 */
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../theme/theme';
import { AppStackParamList } from '../types/navigation';
import { TopIconButton } from '../components/primitives/FigmaPrimitives';
import { IconChevronLeft } from '../assets/icons';
import { ColorSection } from '../components/design-system/ColorSection';
import { TypeSection } from '../components/design-system/TypeSection';
import { SpaceFormSection } from '../components/design-system/SpaceFormSection';
import { ComponentsSection } from '../components/design-system/ComponentsSection';
import { PrinciplesSection } from '../components/design-system/PrinciplesSection';
import { MONO_FAMILY } from '../components/design-system/dsShared';

const ds = theme.ds;

type Navigation = NativeStackNavigationProp<AppStackParamList, 'DesignSystem'>;

export const DesignSystemScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topbar}>
        <TopIconButton
          testID="ds-screen-back"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          icon={<IconChevronLeft width={22} height={22} color={ds.color.ink} />}
        />
        <Text style={styles.topbarTitle}>Design System</Text>
        <View style={styles.topbarSpacer} />
      </View>

      <ScrollView
        testID="ds-screen-scroll"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <View style={styles.hero}>
          <Text style={styles.kicker}>AUXI — YOUR EVERYDAY STYLIST</Text>
          <Text style={styles.heroTitle}>The Auxi{'\n'}Design System</Text>
          <Text style={styles.heroLead}>
            The living reference for Auxi's wardrobe & styling app — a calm,
            warm-neutral interface built on a customised Material foundation.
            Tokens and components below are documented as they ship today.
          </Text>
        </View>

        <ColorSection />
        <TypeSection />
        <SpaceFormSection />
        <ComponentsSection />
        <PrinciplesSection />

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            AUXI · DESIGN SYSTEM — documented as-built. v1.0 · June 2026.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: ds.color.white,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: ds.line,
  },
  topbarTitle: {
    ...theme.typography.aliases.interMediumSm,
    color: ds.color.ink,
  },
  topbarSpacer: { width: 40 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: theme.spacing.l,
    paddingBottom: theme.spacing.xxl,
  },
  hero: {
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: ds.line,
  },
  kicker: {
    fontFamily: MONO_FAMILY,
    fontSize: 11,
    letterSpacing: 1.5,
    color: ds.color.warm500,
    marginBottom: theme.spacing.m,
  },
  heroTitle: {
    ...theme.typography.aliases.uacH1Bold,
    color: ds.color.ink,
  },
  heroLead: {
    ...theme.typography.aliases.interBodyMd,
    color: ds.color.onVariant,
    marginTop: theme.spacing.m,
  },
  footer: {
    marginTop: theme.spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: ds.line,
    paddingTop: theme.spacing.l,
  },
  footerText: {
    fontFamily: MONO_FAMILY,
    fontSize: 11,
    letterSpacing: 0.2,
    color: ds.color.warm500,
  },
});
