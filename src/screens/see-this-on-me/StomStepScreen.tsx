/**
 * Full-screen "step shell" router for the See-this-on-me flow. Owns the five
 * non-transcript screens (loading / generatingShapes / generating / preview /
 * reuse-confirm), each of which is a `SafeAreaView` + `StomHeader` + body.
 *
 * `renderStomStepScreen` returns the matching shell element, or `null` when the
 * cumulative capture transcript should render instead. Extracted verbatim from
 * SeeThisOnMeScreen's early returns — same conditions, same order, no behavior
 * change; it just dedups the repeated shell markup.
 */
import React from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import type { TFunction } from 'i18next';
import { theme } from '../../theme/theme';
import { MacgieLoader } from '../../components/macgie/MacgieLoader';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { StomHeader, StomDownloadButton } from './components';
import { StepReuseConfirm } from './StepReuseConfirm';
import { OutfitPreview } from './OutfitPreview';
import { GeneratingView } from './GeneratingView';
import { BodyShapeId } from './body-shapes';
import { Step } from './stom-steps';

interface StomStepScreenProps {
  t: TFunction;
  step: Step;
  profileLoading: boolean;
  handleBack: () => void;
  handleQuitGeneration: () => void;
  // Shapes phase (phase 1).
  shapesErrored: boolean;
  regenerateShapes: () => void;
  // Render phase (phase 2).
  errored: boolean;
  renderBodyId: string | null;
  renderShape: BodyShapeId | null;
  runRender: (bodyId: string, shape: BodyShapeId | null) => void;
  // Preview.
  resultUrl: string | null;
  goHome: () => void;
  reuseMode: boolean;
  restartCapture: () => void;
  // Reuse-confirm re-entry (AU-354 pt.3).
  reuseConfirmed: boolean;
  rehydrated: boolean;
  reusePhotoUri: string | null;
  handleReuseConfirm: () => void;
  handleReuseRetake: () => void;
  // Persisted-result re-entry: the preview is showing a cached AI result, so a
  // Retake affordance replaces the profile-retake row and drives a fresh run.
  isCachedResult: boolean;
  handleCachedRetake: () => void;
}

// Shared shell — the SafeAreaView + StomHeader wrapper every step screen used.
const StepShell: React.FC<{
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, onBack, right, children }) => (
  <SafeAreaView style={styles.container}>
    <StomHeader title={title} onBack={onBack} rightAction={right} />
    {children}
  </SafeAreaView>
);

export function renderStomStepScreen(
  props: StomStepScreenProps,
): React.ReactElement | null {
  const {
    t,
    step,
    profileLoading,
    handleBack,
    handleQuitGeneration,
    shapesErrored,
    regenerateShapes,
    errored,
    renderBodyId,
    renderShape,
    runRender,
    resultUrl,
    goHome,
    reuseMode,
    restartCapture,
    reuseConfirmed,
    rehydrated,
    reusePhotoUri,
    handleReuseConfirm,
    handleReuseRetake,
    isCachedResult,
    handleCachedRetake,
  } = props;

  const title = t('seeThisOnMe.title');

  // ── Loading the reusable profile ──────────────────────────────────────────
  // Skip the loader when we already have a result to show (a cached or
  // rehydrated preview) — that view doesn't depend on the active profile, so
  // there's no reason to flash a spinner while the profile query resolves.
  if (profileLoading && !(step === 'preview' && resultUrl)) {
    return (
      <StepShell title={title} onBack={handleBack}>
        <MacgieLoader testID="stom-profile-loading" />
      </StepShell>
    );
  }

  // ── Generating shapes (phase 1) / error state ─────────────────────────────
  // While generating (not errored) this returns nothing here → the transcript
  // renders the 3 skeleton tiles inline. The full-screen shell only takes over
  // on error (retry affordance).
  if (step === 'generatingShapes' && shapesErrored) {
    return (
      // Back during generation = quit-to-background (keeps the job alive +
      // notifies on done); in the errored state it's a plain back.
      <StepShell
        title={title}
        onBack={shapesErrored ? handleBack : handleQuitGeneration}
      >
        <GeneratingView
          errored={shapesErrored}
          label={t('seeThisOnMe.generatingShapes')}
          errorText={t('seeThisOnMe.shapesError')}
          onRetry={regenerateShapes}
          onQuit={shapesErrored ? undefined : handleQuitGeneration}
        />
      </StepShell>
    );
  }

  // ── Generating render (phase 2) / error state ─────────────────────────────
  if (step === 'generating') {
    return (
      <StepShell
        title={title}
        onBack={errored ? handleBack : handleQuitGeneration}
      >
        <GeneratingView
          errored={errored}
          onRetry={() => {
            if (renderBodyId) {
              runRender(renderBodyId, renderShape);
            }
          }}
          onQuit={errored ? undefined : handleQuitGeneration}
        />
      </StepShell>
    );
  }

  // ── Preview state ─────────────────────────────────────────────────────────
  if (step === 'preview' && resultUrl) {
    return (
      <StepShell
        title={title}
        onBack={handleBack}
        right={<StomDownloadButton uri={resultUrl} />}
      >
        <OutfitPreview
          imageUri={resultUrl}
          onBackHome={goHome}
          // Persisted-result re-entry: the in-preview Retake pill starts a fresh
          // run; the profile-retake row below is suppressed to avoid two retakes.
          onRetake={isCachedResult ? handleCachedRetake : undefined}
        />
        {/* Reuse path (live result): let the user discard the saved profile and
            recapture. Hidden on a cached result — Retake above covers it. */}
        {!isCachedResult && reuseMode ? (
          <View style={styles.retakeProfileRow}>
            <PillButton
              testID="stom-retake-profile"
              title={t('seeThisOnMe.retakeProfile')}
              variant="text"
              onPress={restartCapture}
            />
          </View>
        ) : null}
      </StepShell>
    );
  }

  // ── Reuse-confirm re-entry (AU-354 pt.3) ─────────────────────────────────
  if (
    reuseMode &&
    !reuseConfirmed &&
    !rehydrated &&
    reusePhotoUri &&
    step === 'selfie'
  ) {
    return (
      <StepShell title={title} onBack={handleBack}>
        <StepReuseConfirm
          photoUri={reusePhotoUri}
          onConfirm={handleReuseConfirm}
          onRetake={handleReuseRetake}
        />
      </StepShell>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  retakeProfileRow: {
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingBottom: theme.spacing.m,
    alignItems: 'center',
  },
});
