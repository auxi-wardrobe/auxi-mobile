/**
 * See-on-me redesign (B1) — the two full-screen loading states ("Loading step
 * 3" Figma 4814:11737, 3 rows; "loading to see result" Figma 4814:13137, 4
 * rows). Both share this shell: headline, rows that reveal one every 2s (a
 * revealed row shows a check; the most-recently-revealed row still spins
 * while more remain), a footer note, and the "Leave — notify me when ready"
 * CTA gated to a 7s floor via `useStaggeredReveal` (see that hook for the
 * exact contract — this is a UX timer only, it never gates the real job).
 *
 * Used for the NON-errored branches of the shapes/render loading steps; the
 * error branches keep `GeneratingView` (error copy + retry), unchanged.
 */
import React from 'react';
import {
  Animated,
  Easing,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useStaggeredReveal } from '../../hooks/useStaggeredReveal';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { MacgieLoader } from '../../components/macgie';
import { StomHeader } from './components';

interface StomLoadingScreenProps {
  /** See-on-me top app-bar title (e.g. t('seeThisOnMe.title')). */
  title: string;
  headline: string;
  rows: string[];
  /**
   * Single 2-line caption (Figma 4814:11737 / 4814:13137): "This can take
   * longer than expected." / "You can leave – we'll let you know the second
   * it's ready." Bug fix: this used to be duplicated with a second,
   * near-identical `quitHint` caption below the quit CTA — removed.
   */
  footerText: string;
  quitLabel: string;
  onBack: () => void;
  onQuit: () => void;
  testID?: string;
}

const SpinnerIcon: React.FC = () => {
  const spin = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Icons.Loading
        width={24}
        height={24}
        color={theme.colors.uacTextSubtle200}
      />
    </Animated.View>
  );
};

export const StomLoadingScreen: React.FC<StomLoadingScreenProps> = ({
  title,
  headline,
  rows,
  footerText,
  quitLabel,
  onBack,
  onQuit,
  testID = 'stom-loading',
}) => {
  const { visibleCount, ctaEnabled } = useStaggeredReveal(rows.length);

  return (
    <SafeAreaView style={styles.container} testID={testID}>
      <StomHeader title={title} onBack={onBack} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <MacgieLoader testID={`${testID}-mascot`} style={styles.mascot} />
        <Text style={styles.headline}>{headline}</Text>

        <View style={styles.rows} testID={`${testID}-rows`}>
          {rows.map((row, index) => {
            const revealed = index < visibleCount;
            if (!revealed) return null;
            // The most-recently-revealed row still spins while more rows are
            // pending; every earlier row (and the final row once all have
            // revealed) shows the completed check.
            const isCurrent = index === visibleCount - 1;
            const stillPending = isCurrent && visibleCount < rows.length;
            return (
              <View
                key={row}
                style={styles.row}
                testID={`${testID}-row-${index}`}
              >
                {stillPending ? (
                  <SpinnerIcon />
                ) : (
                  <Icons.CheckCircle
                    width={24}
                    height={24}
                    color={theme.colors.figmaToggleOn}
                  />
                )}
                <Text style={styles.rowText}>{row}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.footer}>{footerText}</Text>
      </ScrollView>

      <View style={styles.quitBlock}>
        <PillButton
          testID="stom-quit-generating"
          accessibilityLabel={quitLabel}
          title={quitLabel}
          variant="text"
          disabled={!ctaEnabled}
          onPress={onQuit}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.m,
  },
  // MacgieLoader's default `fullScreen` variant sets `flex: 1` (it's meant to
  // fill its parent when used alone, as in GeneratingView) — override to `flex:
  // 0` here since it's one item among several in this screen's content column.
  // `alignItems: 'center'` (kept from fullScreen) still centers it horizontally
  // in the column layout.
  mascot: {
    flex: 0,
    paddingHorizontal: 0,
  },
  headline: {
    ...theme.typography.aliases.poppinsTimeLg,
    color: theme.colors.uacTextBase,
  },
  rows: {
    gap: theme.spacing.m,
    marginTop: theme.spacing.l,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
  },
  rowText: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
    flexShrink: 1,
  },
  footer: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaOnboardingStepLabel,
    marginTop: theme.spacing.l,
  },
  quitBlock: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.l,
    paddingBottom: theme.spacing.xl,
  },
});
