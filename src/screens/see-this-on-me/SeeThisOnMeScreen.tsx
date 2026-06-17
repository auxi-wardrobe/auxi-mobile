/**
 * "See this on me" / Self visualization virtual try-on flow (Workstream 5,
 * Figma node 2852:22266).
 *
 * A conversational 3-step capture flow that renders a saved outfit onto the
 * user's body photo via `POST /api/tryon/highres`:
 *   selfie (required) → fullBody (optional) → bodyShape → generating → preview
 *
 * The transcript accumulates: each completed step leaves its prompt bubble +
 * captured-photo thumbnail on screen while the next step's bubble + actions
 * appear below (matches the cumulative Figma frames).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Asset } from 'react-native-image-picker';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ImageSource, useImagePicker } from '../../hooks/use-image-picker';
import {
  bodyService,
  BodyPhotoNotPersonError,
} from '../../services/bodyService';
import { track } from '../../services/analytics';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { AppStackParamList } from '../../types/navigation';
import { MacgieLoader } from '../../components/macgie/MacgieLoader';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import {
  StomHeader,
  PromptBubble,
  PhotoThumb,
  PrivacyFooter,
  PhotoSourceSheet,
  InlineError,
} from './components';
import { StepSelfie } from './StepSelfie';
import { StepFullBody } from './StepFullBody';
import { StepBodyShape } from './StepBodyShape';
import { StepReuseConfirm } from './StepReuseConfirm';
import { OutfitPreview } from './OutfitPreview';
import { GeneratingView } from './GeneratingView';
import { BodyShapeId } from './body-shapes';
import { decideEntryMode } from './profile-entry';
import { tryOnGenerationStore } from './try-on-generation-store';
import { useTryOnGeneration } from './use-try-on-generation';
import { setTryOnBackgroundCompleteHandler } from './try-on-background-notify';

// TanStack key for the active reusable self-visualization profile (AU-346).
const ACTIVE_PROFILE_QUERY_KEY = ['body', 'active'] as const;

type Navigation = NativeStackNavigationProp<AppStackParamList, 'SeeThisOnMe'>;
type ScreenRoute = RouteProp<AppStackParamList, 'SeeThisOnMe'>;

// Capture steps in transcript order. `promptKey` is the i18n bubble copy;
// `icon` is the outline glyph that sits inside the bubble (Figma 3398:18229 /
// 18246). The screen renders these bubbles + the per-step captured thumbnail
// from state so every step shows the correct accumulation — no hand-picking.
type CaptureStep = 'selfie' | 'fullBody' | 'bodyShape';

type Step = CaptureStep | 'generating' | 'preview';

const stepOrder: CaptureStep[] = ['selfie', 'fullBody', 'bodyShape'];

const captureStepConfig: Record<
  CaptureStep,
  { promptKey: string; icon?: React.ReactNode; testID: string }
> = {
  selfie: {
    promptKey: 'seeThisOnMe.step1.prompt',
    icon: <Icons.FaceId width={44} height={44} />,
    testID: 'stom-step-1-prompt',
  },
  fullBody: {
    promptKey: 'seeThisOnMe.step2.prompt',
    icon: <Icons.BodyOutline width={44} height={44} />,
    testID: 'stom-step-2-prompt',
  },
  bodyShape: {
    promptKey: 'seeThisOnMe.step3.prompt',
    testID: 'stom-step-3-prompt',
  },
};

export const SeeThisOnMeScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const { outfit } = useRoute<ScreenRoute>().params;
  const { pickImage } = useImagePicker();

  const [step, setStep] = useState<Step>('selfie');
  const [selfie, setSelfie] = useState<Asset | null>(null);
  const [fullBody, setFullBody] = useState<Asset | null>(null);
  // Server-side body record ids, created the moment each photo is picked +
  // validated (so generation reuses them and never re-uploads). The selfie is
  // required; the full body is optional.
  const [selfieBodyId, setSelfieBodyId] = useState<string | null>(null);
  const [fullBodyId, setFullBodyId] = useState<string | null>(null);
  // The uploaded full-body record's server image_url, captured at pick time so
  // it can be persisted onto the reusable profile (AU-346) without re-fetching.
  const [fullBodyUrl, setFullBodyUrl] = useState<string | null>(null);
  const [selectedShape, setSelectedShape] = useState<BodyShapeId | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  // AU-346: opt-in to save/keep the reusable profile is ON by default now.
  const [optIn, setOptIn] = useState(true);
  // AU-346: when the user taps "Retake photos" on the reuse path we suppress
  // the saved profile and run the normal capture flow (the saved profile is
  // untouched on the server until a new one is saved).
  const [forceCapture, setForceCapture] = useState(false);
  // AU-354 pt.3: on the reuse path, the user must first CONFIRM the persisted
  // photo (or retake) before we render. False until they tap Confirm — until
  // then the reuse-confirm screen is shown instead of auto-generating.
  const [reuseConfirmed, setReuseConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errored, setErrored] = useState(false);
  // Friendly inline error shown on the active photo step. Set when the backend
  // rejects the chosen photo as not a usable body photo (HTTP 422), or when a
  // generic (network/auth) error blocks validation — distinct copy each. The
  // `errored` flag is the separate generate-failure state.
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [sourceSheetVisible, setSourceSheetVisible] = useState(false);
  // Where the picked asset should land — set when a step's CTA opens the sheet.
  // Returns a promise (the validation upload) so `handleSelectSource` can await
  // it and keep the busy spinner up through the round-trip.
  const pendingDoneRef = useRef<
    ((asset: Asset) => void | Promise<void>) | null
  >(null);

  // The body record used for generation: full-body when provided, else selfie.
  const generationBodyId = fullBodyId ?? selfieBodyId;

  const goHome = useCallback(() => navigation.navigate('Home'), [navigation]);

  // Subscribe to the background-safe generation store (AU-358). The render runs
  // OUTSIDE this component so it survives the user quitting the loading screen;
  // we read its status/result here and mirror it onto local step/result state.
  const generation = useTryOnGeneration();

  const handleBack = useCallback(() => {
    const idx = stepOrder.indexOf(step as CaptureStep);
    if (idx > 0) {
      setStep(stepOrder[idx - 1]);
      return;
    }
    navigation.goBack();
  }, [navigation, step]);

  // Generate the try-on from the already-uploaded body record. Photos were
  // uploaded + validated at pick time, so this never re-uploads — it hands the
  // stored `body_id` (full-body preferred) + outfit + chosen shape to the
  // background store, which runs the high-res render outside React (so it keeps
  // going if the user quits the loading screen — AU-358).
  const runGenerate = useCallback(
    (bodyId: string, shape: BodyShapeId | null) => {
      setStep('generating');
      setErrored(false);
      track('try_on_started', {
        outfit_hash: outfit.outfitHash,
        item_count: outfit.itemIds.length,
      });
      tryOnGenerationStore.start({ outfit, bodyId, shape });
    },
    [outfit],
  );

  // Mirror background-store transitions onto local step/result state + fire the
  // success/failure analytics exactly once per resolution. `generation.outfit`
  // is matched so a stale result from a previous outfit can't leak in. This is
  // the single owner of `try_on_completed` / `try_on_failed` now that the
  // request lives in the store.
  const resolvedHashRef = useRef<string | null>(null);
  useEffect(() => {
    if (generation.outfit?.outfitHash !== outfit.outfitHash) return;
    const key = `${generation.status}:${generation.resultUrl ?? ''}`;
    if (generation.status === 'success' && generation.resultUrl) {
      if (resolvedHashRef.current !== key) {
        resolvedHashRef.current = key;
        track('try_on_completed', {
          outfit_hash: outfit.outfitHash,
          provider: generation.provider ?? undefined,
        });
      }
      setResultUrl(generation.resultUrl);
      setErrored(false);
      setStep('preview');
    } else if (generation.status === 'error') {
      if (resolvedHashRef.current !== key) {
        resolvedHashRef.current = key;
        track('try_on_failed', {
          outfit_hash: outfit.outfitHash,
          error_kind: 'generate',
        });
      }
      setErrored(true);
      setStep('generating');
    }
  }, [
    generation.status,
    generation.resultUrl,
    generation.provider,
    generation.outfit,
    outfit.outfitHash,
  ]);

  // AU-358 mount lifecycle: register the in-app completion notifier (idempotent)
  // and tell the store the loading screen is now mounted (so a completion shows
  // inline, not as a Toast). On unmount we flag it backgrounded — if a render is
  // still in flight, finishing it will fire the in-app completion Toast.
  // If the user returns to a generation that already finished/started in the
  // background (e.g. via the completion Toast), REHYDRATE from the store rather
  // than kicking off a fresh render. `rehydratedRef` blocks the AU-346 reuse
  // auto-fire below from double-generating in that case.
  const rehydratedRef = useRef(false);
  useEffect(() => {
    setTryOnBackgroundCompleteHandler();
    tryOnGenerationStore.setBackgrounded(false);
    const existing = tryOnGenerationStore.getState();
    if (
      existing.outfit?.outfitHash === outfit.outfitHash &&
      existing.status !== 'idle'
    ) {
      rehydratedRef.current = true;
      if (existing.status === 'success' && existing.resultUrl) {
        setResultUrl(existing.resultUrl);
        setStep('preview');
      } else {
        // generating or error → land on the generating screen; the resolution
        // effect mirrors the final state + analytics.
        setErrored(existing.status === 'error');
        setStep('generating');
      }
    }
    return () => {
      tryOnGenerationStore.setBackgrounded(true);
    };
    // Mount-only: outfit is stable for a given screen instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // AU-346 reuse: fetch the user's active reusable profile on mount. While this
  // resolves the screen shows the shared MacgieLoader; once known it either
  // drives the reuse path (profile present) or the capture flow (none).
  const { data: activeProfile, isLoading: profileLoading } = useQuery({
    queryKey: ACTIVE_PROFILE_QUERY_KEY,
    queryFn: () => bodyService.getActiveProfile(),
  });

  // True only when a saved profile exists AND the user hasn't asked to retake.
  const reuseMode = !forceCapture && decideEntryMode(activeProfile) === 'reuse';

  // AU-354 pt.3: the persisted body photo to show on the reuse-confirm screen.
  // Full-body reference is preferred (it's what drives the render), falling back
  // to the selfie/primary image. Null only for a malformed profile with neither.
  const reusePhotoUri =
    activeProfile?.full_body_url ?? activeProfile?.image_url ?? null;

  // AU-354 pt.3: CONFIRM the reused profile — the user has seen their persisted
  // photo and wants to proceed. Only now do we render the current outfit with
  // the stored body + shape (no re-capture, no re-upload). Guarded by
  // `reuseConfirmed` state so it can't double-fire.
  const reuseFiredRef = useRef(false);
  const handleReuseConfirm = useCallback(() => {
    if (!activeProfile?.id || reuseFiredRef.current) return;
    reuseFiredRef.current = true;
    setReuseConfirmed(true);
    track('body_photo_reuse_confirmed', { outfit_hash: outfit.outfitHash });
    runGenerate(activeProfile.id, activeProfile.body_shape ?? null);
  }, [activeProfile, outfit.outfitHash, runGenerate]);

  // "Retake photos" on the reuse path: drop reuse and start the normal capture
  // flow from the selfie step. The saved server profile is left intact until a
  // new capture is saved (opt-in at the shape step overwrites it).
  const restartCapture = useCallback(() => {
    reuseFiredRef.current = false;
    rehydratedRef.current = false;
    // Drop any background render result so re-capture starts clean (AU-358).
    tryOnGenerationStore.reset();
    setForceCapture(true);
    setReuseConfirmed(false);
    setSelfie(null);
    setFullBody(null);
    setSelfieBodyId(null);
    setFullBodyId(null);
    setFullBodyUrl(null);
    setSelectedShape(null);
    setResultUrl(null);
    setErrored(false);
    setPhotoError(null);
    setOptIn(true);
    setStep('selfie');
    track('try_on_profile_retake', { outfit_hash: outfit.outfitHash });
    // §3.5 #42: outcome-screen retake is the user discarding the GENERATED
    // image to redo capture — so it only fires when a result actually exists
    // (preview UI). The reuse-confirm retake (AU-354 pt.3) happens before any
    // render, so `resultUrl` is null there and this is correctly skipped.
    if (resultUrl) {
      track('try_on_outcome_retaken', { outfit_hash: outfit.outfitHash });
    }
  }, [outfit.outfitHash, resultUrl]);

  // AU-354 pt.3: RETAKE from the reuse-confirm screen — the user saw their
  // persisted photo and chose to recapture BEFORE any render. Distinct from the
  // preview-screen retake (`try_on_outcome_retaken`): there's no generated image
  // to discard here, so we fire the reuse-specific event then run the normal
  // capture flow. `restartCapture` resets reuse state + the background store.
  const handleReuseRetake = useCallback(() => {
    track('body_photo_retake_selected', { outfit_hash: outfit.outfitHash });
    restartCapture();
  }, [outfit.outfitHash, restartCapture]);

  // Validate a just-picked photo immediately by uploading it. On success, hand
  // the created `body_id` to `onValid` (which stores it + advances). On a
  // body-photo rejection (any 422), show the friendly inline message telling
  // the user to upload a body photo of themselves, clear the picked asset, and
  // keep them on the same step to re-pick. Other errors (network/401) show a
  // distinct generic retry message. `clearAsset` wipes the just-picked thumb so
  // a rejected photo doesn't linger in the transcript.
  //
  // Note: the busy/spinner flag is owned entirely by `handleSelectSource`,
  // which wraps this call for the whole pick→validate round-trip and resets it
  // in a single `finally`. This function must NOT touch `busy` — double
  // ownership previously let the spinner strand after a rejection.
  const validatePickedPhoto = useCallback(
    async (
      asset: Asset,
      clearAsset: () => void,
      onValid: (body: { id: string; image_url?: string }) => void,
    ) => {
      setPhotoError(null);
      try {
        const body = await bodyService.uploadBody(asset);
        onValid(body);
      } catch (error) {
        clearAsset();
        if (error instanceof BodyPhotoNotPersonError) {
          // Stable analytics kind for any body-photo rejection.
          track('try_on_failed', {
            outfit_hash: outfit.outfitHash,
            error_kind: 'no_person',
          });
          setPhotoError(
            error.backendMessage || t('seeThisOnMe.errors.noPerson'),
          );
        } else {
          track('try_on_failed', {
            outfit_hash: outfit.outfitHash,
            error_kind: 'upload',
          });
          setPhotoError(t('seeThisOnMe.errors.upload'));
        }
      }
    },
    [outfit.outfitHash, t],
  );

  // CTA tap → open the source sheet, remembering where the asset should land.
  // The inline photo error is intentionally NOT cleared here: it stays visible
  // until the user actually re-picks (cleared at the start of
  // `validatePickedPhoto`), so opening then cancelling the sheet doesn't wipe
  // the "pick a body photo of yourself" guidance.
  const capture = useCallback(
    (onDone: (asset: Asset) => void | Promise<void>) => {
      pendingDoneRef.current = onDone;
      setSourceSheetVisible(true);
    },
    [],
  );

  const closeSourceSheet = useCallback(() => {
    setSourceSheetVisible(false);
    pendingDoneRef.current = null;
  }, []);

  // Sheet selection → launch camera or library, then deliver the asset to the
  // pending step handler. `onDone` runs the pick-time validation upload; this
  // function is the SINGLE owner of the `busy` spinner for the whole
  // pick→validate round-trip and resets it in one `finally` so the CTA never
  // strands on a spinner (success, validation reject, cancel, or picker error).
  //
  // The picker launch is deferred to the next tick (matching BodyScreen's
  // proven pattern): presenting the native iOS picker in the same tick as the
  // `Modal` dismiss can swallow the presentation — `launchImageLibrary` then
  // never resolves, leaving the spinner stuck and no upload fired. Closing the
  // sheet first, then launching after the dismiss animation, keeps re-picks
  // (after a rejection) reliable.
  const handleSelectSource = useCallback(
    (source: ImageSource) => {
      const onDone = pendingDoneRef.current;
      pendingDoneRef.current = null;
      setSourceSheetVisible(false);
      setBusy(true);
      // Defer the picker launch until after the Modal dismiss animation.
      setTimeout(async () => {
        try {
          const asset = await pickImage(source);
          // `pickImage` returns null on cancel/empty/error — just drop back to
          // the step with the spinner cleared (no stuck state on cancel).
          if (asset && onDone) {
            await onDone(asset);
          }
        } finally {
          setBusy(false);
        }
      }, 0);
    },
    [pickImage],
  );

  // AU-358 "quit loading": leave the loading screen WITHOUT cancelling the
  // render. The store keeps the request alive (it lives outside React); flagging
  // it backgrounded means the in-app completion Toast fires when it finishes so
  // the user can return + view/pick their result. Only meaningful while still
  // generating — once it's a success/error there's nothing to background.
  const handleQuitGeneration = useCallback(() => {
    tryOnGenerationStore.setBackgrounded(true);
    track('body_shape_generation_backgrounded', {
      outfit_hash: outfit.outfitHash,
    });
    goHome();
  }, [goHome, outfit.outfitHash]);

  // The body record to (re)generate from: the captured one, or — on the reuse
  // path where nothing was captured — the saved profile (AU-346).
  const activeGenerationBodyId =
    generationBodyId ?? (reuseMode ? activeProfile?.id ?? null : null);
  const activeShape = selectedShape ?? activeProfile?.body_shape ?? null;

  // ── Loading the reusable profile ──────────────────────────────────────────
  // Decide reuse-vs-capture only once the active profile is known. The shared
  // MacgieLoader covers the round-trip so the capture flow never flashes first.
  if (profileLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StomHeader title={t('seeThisOnMe.title')} onBack={handleBack} />
        <MacgieLoader testID="stom-profile-loading" />
      </SafeAreaView>
    );
  }

  // ── Generating / error state ──────────────────────────────────────────────
  if (step === 'generating') {
    return (
      <SafeAreaView style={styles.container}>
        {/* AU-358: the header back during generation = quit-to-background, not a
            plain goBack — so leaving keeps the render alive + notifies on done. */}
        <StomHeader
          title={t('seeThisOnMe.title')}
          onBack={errored ? handleBack : handleQuitGeneration}
        />
        <GeneratingView
          errored={errored}
          onRetry={() => {
            if (activeGenerationBodyId) {
              runGenerate(activeGenerationBodyId, activeShape);
            }
          }}
          // While generating (not errored), offer an explicit "leave + we'll
          // tell you when it's ready" affordance (AU-358 quit loading).
          onQuit={errored ? undefined : handleQuitGeneration}
        />
      </SafeAreaView>
    );
  }

  // ── Preview state ─────────────────────────────────────────────────────────
  if (step === 'preview' && resultUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <StomHeader title={t('seeThisOnMe.title')} onBack={handleBack} />
        {/* TODO(AU-346): add the "View visualization" download/share bottom
            sheet for the generated per-outfit image — deferred follow-up;
            reuse-to-generate covers the core profile value for this PR. */}
        <OutfitPreview imageUri={resultUrl} onBackHome={goHome} />
        {/* Reuse path: let the user discard the saved profile and recapture. */}
        {reuseMode ? (
          <View style={styles.retakeProfileRow}>
            <PillButton
              testID="stom-retake-profile"
              title={t('seeThisOnMe.retakeProfile')}
              variant="text"
              onPress={restartCapture}
            />
          </View>
        ) : null}
      </SafeAreaView>
    );
  }

  // ── Reuse-confirm re-entry (AU-354 pt.3) ─────────────────────────────────
  // On the reuse path, before any render, show the user the body photo they
  // previously selected with CONFIRM / RETAKE — instead of redoing capture or
  // silently regenerating (Viet's UAC). Skipped when we rehydrated an in-flight
  // background generation (AU-358), once confirmed, or if the saved profile is
  // malformed with no usable photo (falls through to normal capture).
  if (
    reuseMode &&
    !reuseConfirmed &&
    !rehydratedRef.current &&
    reusePhotoUri &&
    step === 'selfie'
  ) {
    return (
      <SafeAreaView style={styles.container}>
        <StomHeader title={t('seeThisOnMe.title')} onBack={handleBack} />
        <StepReuseConfirm
          photoUri={reusePhotoUri}
          onConfirm={handleReuseConfirm}
          onRetake={handleReuseRetake}
        />
      </SafeAreaView>
    );
  }

  // ── Capture transcript (selfie / fullBody / bodyShape) ────────────────────
  // The captured photo for each completed step (null while pending/skipped).
  // bodyShape never captures a photo of its own — it reuses the prior thumbs.
  const stepThumbUri: Record<CaptureStep, string | null> = {
    selfie: selfie?.uri ?? null,
    fullBody: fullBody?.uri ?? null,
    bodyShape: null,
  };

  // Steps from the start up to and including the active capture step, in order.
  const activeIndex = stepOrder.indexOf(step as CaptureStep);
  const visibleSteps =
    activeIndex >= 0 ? stepOrder.slice(0, activeIndex + 1) : [];

  // The active step's interactive controls (rendered below its bubble/thumb).
  const renderStepControls = (s: CaptureStep) => {
    switch (s) {
      case 'selfie':
        return (
          <StepSelfie
            busy={busy}
            onTakePhoto={() =>
              capture(asset => {
                // Show the thumb immediately, then validate by uploading. On
                // rejection the thumb is cleared and we stay on this step.
                setSelfie(asset);
                return validatePickedPhoto(
                  asset,
                  () => {
                    setSelfie(null);
                    setSelfieBodyId(null);
                  },
                  body => {
                    setSelfieBodyId(body.id);
                    track('try_on_step_completed', { step: 'selfie' });
                    setStep('fullBody');
                  },
                );
              })
            }
          />
        );
      case 'fullBody':
        return (
          <StepFullBody
            busy={busy}
            onTakePhoto={() =>
              capture(asset => {
                setFullBody(asset);
                return validatePickedPhoto(
                  asset,
                  () => {
                    setFullBody(null);
                    setFullBodyId(null);
                    setFullBodyUrl(null);
                  },
                  body => {
                    setFullBodyId(body.id);
                    setFullBodyUrl(body.image_url ?? null);
                    track('try_on_step_completed', { step: 'fullBody' });
                    setStep('bodyShape');
                  },
                );
              })
            }
            onSkip={() => {
              track('try_on_step_completed', {
                step: 'fullBody',
                skipped: true,
              });
              setStep('bodyShape');
            }}
          />
        );
      case 'bodyShape':
        return (
          <StepBodyShape
            selectedShape={selectedShape}
            optIn={optIn}
            onToggleOptIn={() => setOptIn(v => !v)}
            onSelectShape={shape => {
              setSelectedShape(shape);
              track('try_on_step_completed', { step: 'bodyShape' });
              // AU-346: when opted in, save this capture as the user's reusable
              // primary profile (shape + full-body reference) so future outfits
              // skip capture. Best-effort — a save failure must NOT block the
              // render, so it's fire-and-forget with a logged catch.
              if (optIn && selfieBodyId) {
                bodyService
                  .updateBody(selfieBodyId, {
                    body_shape: shape,
                    is_primary: true,
                    ...(fullBodyUrl ? { full_body_url: fullBodyUrl } : {}),
                  })
                  .catch(err =>
                    console.warn('AU-346 profile save failed', err),
                  );
              }
              // Reuse the body record uploaded + validated at pick time — never
              // re-upload. Full-body preferred, else the required selfie.
              if (generationBodyId) {
                runGenerate(generationBodyId, shape);
              }
            }}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StomHeader title={t('seeThisOnMe.title')} onBack={handleBack} />
      <ScrollView contentContainerStyle={styles.transcript}>
        {visibleSteps.map(s => {
          const config = captureStepConfig[s];
          const thumbUri = stepThumbUri[s];
          const isActive = s === step;
          return (
            <React.Fragment key={s}>
              <PromptBubble
                testID={config.testID}
                text={t(config.promptKey)}
                icon={config.icon}
              />
              {/* Captured-photo thumbnail for the step (omitted if the user
                  skipped — e.g. full-body — or hasn't captured yet). */}
              {thumbUri ? (
                <PhotoThumb uri={thumbUri} testID={`${config.testID}-thumb`} />
              ) : null}
              {/* Inline photo-rejection notice on the active step, shown after
                  a rejected/failed upload so the user can immediately re-pick. */}
              {isActive && photoError ? (
                <InlineError testID="stom-photo-error" text={photoError} />
              ) : null}
              {/* The active step's interactive controls sit under its bubble. */}
              {isActive ? renderStepControls(s) : null}
            </React.Fragment>
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        <PrivacyFooter text={t('seeThisOnMe.privacy')} />
      </View>

      <PhotoSourceSheet
        visible={sourceSheetVisible}
        onClose={closeSourceSheet}
        onSelect={handleSelectSource}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  transcript: {
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.l,
  },
  footer: {
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingBottom: theme.spacing.m,
  },
  retakeProfileRow: {
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingBottom: theme.spacing.m,
    alignItems: 'center',
  },
});
