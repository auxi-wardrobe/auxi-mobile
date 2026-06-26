/**
 * In-app legal document screen — renders Terms of Service or Privacy Policy.
 *
 * Closes App Store blocker B5 (legal docs reachable in-app) and supports B1
 * (Privacy Policy disclosing AI data sharing). Reachable from BOTH the
 * unauthenticated Welcome screen (AuthNavigator) and authenticated Settings
 * (AppNavigator) — the route is registered in both stacks, so the param shape
 * is shared via {@link LegalScreenParams}.
 *
 * Design: Figma node 3177:6809 (Terms frame). Body = Poppins 16/24,
 * text/neutral/base (#1d1f23 → ds.color.ink) on background/primary/neutral_50
 * (#fcfcfd → ds.color.surface). One reusable screen parameterised by
 * `documentType`; legal body text lives in `src/content/legal/` (English-only,
 * single source of truth).
 */
import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import { Header } from '../../components/layout/Header';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { getLegalDocument } from '../../content/legal';
import type { LegalDocumentType } from '../../content/legal';
import { trackLegalDocumentViewed } from '../../services/analytics';
import { LegalSectionView } from './LegalSectionView';

/** Shared route params — identical in the auth + app stacks. */
export type LegalScreenParams = {
  documentType: LegalDocumentType;
  /** Where the screen was opened from — analytics only. */
  source: 'welcome' | 'settings';
};

type LegalRoute = RouteProp<
  { LegalDocument: LegalScreenParams },
  'LegalDocument'
>;

const ANALYTICS_DOCUMENT: Record<
  LegalDocumentType,
  'terms_of_service' | 'privacy_policy'
> = {
  terms: 'terms_of_service',
  privacy: 'privacy_policy',
};

export const LegalDocumentScreen: React.FC = () => {
  const navigation = useNavigation();
  const { params } = useRoute<LegalRoute>();
  const { documentType, source } = params;

  const document = getLegalDocument(documentType);

  // Fire once per mount: a legal doc was opened. source distinguishes the
  // Welcome (unauth) vs Settings (auth) entry points.
  React.useEffect(() => {
    trackLegalDocumentViewed(ANALYTICS_DOCUMENT[documentType], source);
  }, [documentType, source]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header
        title={document.title}
        leftIcon={
          <Icons.ChevronLeft
            width={24}
            height={24}
            color={theme.ds.color.ink}
          />
        }
        leftIconStyle={styles.backButton}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        testID={`legal-${documentType}-scroll`}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        <Text style={styles.title}>{document.title}</Text>
        <Text style={styles.effectiveDate}>
          {`Effective Date: ${document.effectiveDate}`}
        </Text>
        {document.sections.map((section, index) => (
          <LegalSectionView key={`section-${index}`} section={section} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.ds.color.surface,
  },
  // Borderless back chevron (no white chip) so it reads cleanly on the lighter
  // legal-doc surface (#fcfcfd); all other header values stay canonical.
  backButton: {
    backgroundColor: theme.colors.transparent,
  },
  scroll: {
    flex: 1,
    backgroundColor: theme.ds.color.surface,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.l,
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.m,
  },
  title: {
    ...theme.typography.aliases.poppinsBodyBold,
    color: theme.ds.color.ink,
  },
  effectiveDate: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.ds.color.ink,
    letterSpacing: 0.15,
  },
});
