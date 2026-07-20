/**
 * Full-screen "step shell" router for the See-this-on-me flow. Owns the
 * non-stepped screens: profile-loading / generatingShapes / generating /
 * preview / reuse-confirm.
 *
 * B1 (see-on-me redesign): the non-errored generatingShapes/generating states
 * render the full-screen `StomLoadingScreen` (staggered rows + 7s CTA gate);
 * their error states keep the plain `GeneratingView` + retry. The other shells
 * are a `SafeAreaView` + `StomHeader` + body via the shared `StepShell`.
 *
 * `renderStomStepScreen` returns the matching shell element, or `null` when
 * the active capture step (selfie / fullBody / bodyShape) should render
 * instead — see `SeeThisOnMeScreen`'s `StomStepLayout` usage.
 */
import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import type { TFunction } from 'i18next';
import { theme } from '../../theme/theme';
import { MacgieLoader } from '../../components/macgie/MacgieLoader';
import { StomHeader, StomDownloadButton } from './components';
import { OutfitPreview } from './OutfitPreview';
import { GeneratingView } from './GeneratingView';
import { StomLoadingScreen } from './StomLoadingScreen';
import { tryOnGenerationStore } from './try-on-generation-store';
import { BodyShapeId } from './body-shapes';
import { Step } from './stom-steps';

// B1 loading-row copy keys — plain per-index `t()` calls (each leaf is a
// string) rather than `returnObjects`, so no i18next typing gymnastics.
const SHAPES_LOADING_ROW_KEYS = [
  'seeThisOnMe.loadingShapes.rows.0',
  'seeThisOnMe.loadingShapes.rows.1',
  'seeThisOnMe.loadingShapes.rows.2',
] as const;
const RESULT_LOADING_ROW_KEYS = [
  'seeThisOnMe.loadingResult.rows.0',
  'seeThisOnMe.loadingResult.rows.1',
  'seeThisOnMe.loadingResult.rows.2',
  'seeThisOnMe.loadingResult.rows.3',
] as const;

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
  restartCapture: () => void;
  // Persisted-result re-entry: the preview is showing a cached AI result, so a
  // Retake affordance replaces the profile-retake row and drives a fresh run.
  isCachedResult: boolean;
  handleCachedRetake: () => void;
  // B3: threaded into OutfitPreview's thumbs-feedback vote.
  outfitHash: string;
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
    restartCapture,
    isCachedResult,
    handleCachedRetake,
    outfitHash,
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
  // B1 (see-on-me redesign): the non-errored state is now its own full-screen
  // `StomLoadingScreen` (staggered rows + the 7s CTA min-wait gate) instead of
  // the old inline skeleton tiles. The error branch keeps `GeneratingView`.
  if (step === 'generatingShapes') {
    if (shapesErrored) {
      // Back during generation = quit-to-background (keeps the job alive +
      // notifies on done); in the errored state it's a plain back.
      return (
        <StepShell title={title} onBack={handleBack}>
          <GeneratingView
            errored
            label={t('seeThisOnMe.generatingShapes')}
            errorText={t('seeThisOnMe.shapesError')}
            onRetry={regenerateShapes}
          />
        </StepShell>
      );
    }
    return (
      <StomLoadingScreen
        testID="stom-loading-shapes"
        title={title}
        headline={t('seeThisOnMe.loadingShapes.title')}
        rows={SHAPES_LOADING_ROW_KEYS.map(key => t(key))}
        footerText={t('seeThisOnMe.loading.footer')}
        quitLabel={t('seeThisOnMe.quit.cta')}
        onBack={handleQuitGeneration}
        onQuit={handleQuitGeneration}
      />
    );
  }

  // ── Generating render (phase 2) / error state ─────────────────────────────
  if (step === 'generating') {
    if (errored) {
      return (
        <StepShell title={title} onBack={handleBack}>
          <GeneratingView
            errored
            onRetry={() => {
              if (renderBodyId) {
                runRender(renderBodyId, renderShape);
              }
            }}
          />
        </StepShell>
      );
    }
    return (
      <StomLoadingScreen
        testID="stom-loading-result"
        title={title}
        headline={t('seeThisOnMe.loadingResult.title')}
        rows={RESULT_LOADING_ROW_KEYS.map(key => t(key))}
        footerText={t('seeThisOnMe.loading.footer')}
        quitLabel={t('seeThisOnMe.quit.cta')}
        onBack={handleQuitGeneration}
        onQuit={handleQuitGeneration}
      />
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
          // Figma 4814:11877 shows a single Retake affordance inside the
          // preview footer on every completion path — cached re-entry uses
          // `handleCachedRetake`; a fresh completion (first-time capture or
          // reuse-confirm render) reuses `restartCapture`, the same handler
          // the reuse path's own retake already drove, so both routes now
          // land back on step 1 with the background job/state reset.
          onRetake={isCachedResult ? handleCachedRetake : restartCapture}
          // B3: thumbs feedback — jobId is null on a cached result with no live
          // job (the hook still updates the UI + analytics, see its contract).
          jobId={isCachedResult ? null : tryOnGenerationStore.getState().jobId}
          outfitHash={outfitHash}
        />
      </StepShell>
    );
  }

  // Reuse-confirm is no longer handled here: the "reuse your saved body?" sheet
  // is owned by the gate screen (SeeThisOnMeConfirm), which presents it over the
  // originating page and then hands off to this flow for capture / render.
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
});
