import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';
import type { LegalSection } from '../../content/legal';

/**
 * Renders one {@link LegalSection}: optional heading (bold) + paragraphs +
 * bullet list. Pure presentation, token-only styling. Extracted so
 * LegalDocumentScreen stays small.
 *
 * Typography mirrors Figma node 3177:6642 — Poppins 16/24 body
 * (theme `poppinsBody`), bold for the document title/headings, text colour
 * `text/neutral/base` (`ds.color.ink`).
 */
interface LegalSectionViewProps {
  section: LegalSection;
}

export const LegalSectionView: React.FC<LegalSectionViewProps> = ({
  section,
}) => {
  const { heading, paragraphs, bullets } = section;
  return (
    <View style={styles.section}>
      {heading ? <Text style={styles.heading}>{heading}</Text> : null}
      {paragraphs?.map((paragraph, index) => (
        <Text key={`p-${index}`} style={styles.paragraph}>
          {paragraph}
        </Text>
      ))}
      {bullets?.map((bullet, index) => (
        <View key={`b-${index}`} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>{'•'}</Text>
          <Text style={styles.bulletText}>{bullet}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing.xs,
  },
  heading: {
    ...theme.typography.aliases.poppinsBodyBold,
    color: theme.ds.color.ink,
  },
  paragraph: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.ds.color.ink,
    letterSpacing: 0.15,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: theme.spacing.s,
    paddingLeft: theme.spacing.s,
  },
  bulletDot: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.ds.color.ink,
  },
  bulletText: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.ds.color.ink,
    letterSpacing: 0.15,
    flex: 1,
  },
});
