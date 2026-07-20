/**
 * DesignSystemScreen — in-app Design System reference / style guide.
 *
 * Rebuilt to the NEW claude.ai showcase (GH-364). Poppins-only, motion-aware.
 * Reached from the email-gated sidebar "Design System" row (CEO + designer) and
 * in __DEV__ via Settings → Version. NOT a shipped consumer screen — its
 * section/token labels are static English (no i18n).
 *
 * Source of truth: plans/260624-0030-GH-364-design-system-page/reference/
 *                  auxi-showcase.reference.css. All page styling derives from
 *                  the DS-page-local tokens in components/design-system/m-tokens
 *                  (which intentionally DIVERGE from theme.ts).
 */
import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../types/navigation';
import { IconChevronLeft } from '../assets/icons';
import { ColorSection } from '../components/design-system/ColorSection';
import { TypeSection } from '../components/design-system/TypeSection';
import { SpaceFormSection } from '../components/design-system/SpaceFormSection';
import { ComponentsSection } from '../components/design-system/ComponentsSection';
import { PrinciplesSection } from '../components/design-system/PrinciplesSection';
import { MotionSection } from '../components/design-system/MotionSection';
import { mTokens } from '../components/design-system/m-tokens';

const { color, role, space, type } = mTokens;

type Navigation = NativeStackNavigationProp<AppStackParamList, 'DesignSystem'>;

export const DesignSystemScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topbar}>
        <Pressable
          style={styles.backBtn}
          testID="ds-screen-back"
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
        >
          <IconChevronLeft width={22} height={22} color={role.ink} />
        </Pressable>
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
            warm-neutral interface on Inter. This page mirrors the new
            claude.ai design system; tokens here are page-local and diverge from
            the live theme on purpose.
          </Text>
        </View>

        <ColorSection />
        <TypeSection />
        <SpaceFormSection />
        <ComponentsSection />
        <MotionSection />
        <PrinciplesSection />

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            AUXI · DESIGN SYSTEM — new claude.ai sync. v2.0 · June 2026.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.white },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.s4,
    paddingVertical: space.s2,
    borderBottomWidth: 1,
    borderBottomColor: role.line,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topbarTitle: { ...type.h3, color: role.ink },
  topbarSpacer: { width: 40 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: space.s6, paddingBottom: space.s12 },
  hero: {
    paddingTop: space.s8,
    paddingBottom: space.s6,
    borderBottomWidth: 1,
    borderBottomColor: role.line,
  },
  kicker: { ...type.overline, color: role.ink3, marginBottom: space.s4 },
  heroTitle: { ...type.display, color: role.ink },
  heroLead: { ...type.body, color: role.ink2, marginTop: space.s4 },
  footer: {
    marginTop: space.s12,
    borderTopWidth: 1,
    borderTopColor: role.line,
    paddingTop: space.s6,
  },
  footerText: { ...type.overline, color: role.ink3 },
});
