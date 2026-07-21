/**
 * "See this on me" / Self visualization virtual try-on flow (Workstream 5,
 * Figma node 2852:22266) — AU-358 3-shape generation + async render; redesigned
 * (see `plans/260714-0516-see-on-me-redesign/spec.md`) to a full-screen
 * STEPPED flow (one step fills the screen at a time — `StomStepLayout` +
 * `StepProgressHeader`'s "Step n/3" + segments) replacing the old
 * accumulating-transcript layout.
 *
 * Capture flow: selfie (required) → fullBody (optional) → generatingShapes
 * (AI builds 3 body-shape photos, full-screen `StomLoadingScreen`) →
 * bodyShape (user picks one; B2 Next-button gating — selecting only records
 * the choice, the bottom Next button fires the actual submit + render) →
 * generating (render the outfit onto the chosen body, `StomLoadingScreen`) →
 * preview (B3 thumbs up/down feedback).
 *
 * Both async steps run OUTSIDE React in `tryOnGenerationStore` (submit → poll),
 * so they survive the user quitting the loading screen and notify on completion.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { bodyShapeService } from '../../services/bodyShapeService';
import { track } from '../../services/analytics';
import { useAiConsentGate } from '../../hooks/useAiConsentGate';
import { useAiLimitGate } from '../../hooks/useAiLimitGate';
import { AiConsentDialog } from '../../components/features/AiConsentDialog';
import { AiLimitSheet } from '../../components/features/AiLimitSheet';
import { AppStackParamList } from '../../types/navigation';
import { PhotoSourceSheet } from './components';
import { renderStomStepScreen } from './StomStepScreen';
import { StomStepLayout } from './StomStepLayout';
import { StepSelfie } from './StepSelfie';
import { StepFullBody } from './StepFullBody';
import { StepBodyShape } from './StepBodyShape';
import { BodyShapeId, GeneratedShape } from './body-shapes';
import { Step, CaptureStep, stepOrder, captureStepConfig } from './stom-steps';
import { decideEntryMode } from './profile-entry';
import { tryOnGenerationStore } from './try-on-generation-store';
import { getTryOnResult } from '../../services/tryOnResultStore';
import { useTryOnGeneration } from './use-try-on-generation';
import { setTryOnBackgroundCompleteHandler } from './try-on-background-notify';

// try_on_step_viewed step-name mapping (spec §Analytics) — the local
// CaptureStep union uses camelCase; the analytics prop is snake_case.
const STEP_VIEWED_NAME: Record<CaptureStep, string> = {
  selfie: 'selfie',
  fullBody: 'full_body',
  bodyShape: 'body_fit',
};

// TanStack key for the active reusable self-visualization profile (AU-346).
const ACTIVE_PROFILE_QUERY_KEY = ['body', 'active'] as const;

type Navigation = NativeStackNavigationProp<AppStackParamList, 'SeeThisOnMe'>;
type ScreenRoute = RouteProp<AppStackParamList, 'SeeThisOnMe'>;

export const SeeThisOnMeScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  // `reuseAction` is set by the reuse-confirm gate (SeeThisOnMeConfirm), which
  // already owns the "reuse your saved body?" sheet — so this screen skips that
  // sheet and jumps straight to render ('render', with the confirmed
  // `reuseBodyId`/`reuseShape`) or capture ('capture'). Undefined for resume
  // entries (e.g. the completion-notice popTo), which rehydrate from the store.
  const { outfit, reuseAction, reuseBodyId, reuseShape } =
    useRoute<ScreenRoute>().params;
  const { pickImage } = useImagePicker();
  // B1: gate the AI photo upload behind explicit, persisted consent.
  const aiConsentGate = useAiConsentGate();
  // Daily-limit gate: on a `ai_daily_limit_reached` 429 (either phase) show the
  // "out for today" sheet with NO retry, instead of the generic error view.
  const aiLimitGate = useAiLimitGate();

  // On a gated 'render' entry we go straight to the render loading screen (no
  // capture steps) — initialise there so the selfie step never flashes before
  // the mount effect kicks off the render.
  const [step, setStep] = useState<Step>(() =>
    reuseAction === 'render' ? 'generating' : 'selfie',
  );
  // B2 redesign: the stepped layout no longer shows a persistent selfie/
  // full-body thumbnail once the user has advanced past that step, so only
  // the setters are read here (the captured Asset itself isn't displayed).
  const [, setSelfie] = useState<Asset | null>(null);
  const [, setFullBody] = useState<Asset | null>(null);
  // Server-side body record ids, created the moment each photo is picked +
  // validated (so generation reuses them and never re-uploads). The selfie is
  // required; the full body is optional.
  const [selfieBodyId, setSelfieBodyId] = useState<string | null>(null);
  const [fullBodyId, setFullBodyId] = useState<string | null>(null);
  // AU-358: the 3 AI-generated body-shape photos + the chosen one's profile id.
  const [shapes, setShapes] = useState<GeneratedShape[] | null>(null);
  const [shapesPartial, setShapesPartial] = useState(false);
  const [selectedShape, setSelectedShape] = useState<BodyShapeId | null>(null);
  // The primary BodyProfile created by `select` (its id is the render body_id).
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null,
  );
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  // Persisted-result re-entry: true when the preview is showing the last
  // successful AI result loaded from the on-device cache (not a fresh render),
  // so the preview offers a Retake affordance that starts a new run.
  const [showCachedResult, setShowCachedResult] = useState(false);
  // AU-346: opt-in to keep the reusable profile is ON by default. AU-358 note:
  // `select` always creates the primary profile server-side (the render needs a
  // durable body_id through the async job), so this checkbox is informational —
  // it no longer drives a separate save call.
  const [optIn, setOptIn] = useState(true);
  // AU-346: when the user taps "Retake photos" on the reuse path we suppress
  // the saved profile and run the normal capture flow (the saved profile is
  // untouched on the server until a new one is saved).
  const [forceCapture, setForceCapture] = useState(
    reuseAction === 'capture',
  );
  const [busy, setBusy] = useState(false);
  // Render-phase failure flag (drives the 'generating' error view).
  const [errored, setErrored] = useState(false);
  // Shapes-phase failure flag (drives the 'generatingShapes' error view).
  const [shapesErrored, setShapesErrored] = useState(false);
  // Friendly inline error shown on the active photo step. Set when the backend
  // rejects the chosen photo as not a usable body photo (HTTP 422), or when a
  // generic (network/auth) error blocks validation — distinct copy each.
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [sourceSheetVisible, setSourceSheetVisible] = useState(false);
  // Where the picked asset should land — set when a step's CTA opens the sheet.
  const pendingDoneRef = useRef<
    ((asset: Asset) => void | Promise<void>) | null
  >(null);

  // popTo (not navigate): reuse the existing Home instance so the current
  // outfit suggestions + swipe position survive the round-trip. navigate() can
  // push a duplicate Home under RN7 (see HomeWardrobeNavFooter), remounting it
  // and resetting the deck. popTo falls back to pushing a fresh Home if none is
  // in the stack.
  const goHome = useCallback(() => navigation.popTo('Home'), [navigation]);

  // Subscribe to the background-safe generation store (AU-358). Both async
  // steps (shapes gen + render) run OUTSIDE this component so they survive the
  // user quitting the loading screen; we read status/result here and mirror it
  // onto local step/result state.
  const generation = useTryOnGeneration();

  const handleBack = useCallback(() => {
    const idx = stepOrder.indexOf(step as CaptureStep);
    if (idx > 0) {
      setStep(stepOrder[idx - 1]);
      return;
    }
    navigation.goBack();
  }, [navigation, step]);

  // `try_on_step_viewed` — fires when a stepped capture screen becomes the
  // active one (selfie / full_body / body_fit). Loading/generating/preview
  // steps are covered by their own existing events.
  useEffect(() => {
    if (step === 'selfie' || step === 'fullBody' || step === 'bodyShape') {
      track('try_on_step_viewed', { step: STEP_VIEWED_NAME[step] });
    }
  }, [step]);

  // Phase 2 render: render the outfit onto the chosen body. Hands the resolved
  // profile `bodyId` + outfit + shape to the background store, which submits +
  // polls outside React (so it keeps going if the user quits — AU-358).
  // B1: ensure AI data-sharing consent (already granted at the shapes step on
  // the capture path, so this is a no-op there; the reuse path prompts here).
  const runRender = useCallback(
    (bodyId: string, shape: BodyShapeId | null) => {
      aiConsentGate.run(() => {
        setStep('generating');
        setErrored(false);
        track('try_on_started', {
          outfit_hash: outfit.outfitHash,
          item_count: outfit.itemIds.length,
        });
        tryOnGenerationStore.startRender({ outfit, bodyId, shape });
      });
    },
    [aiConsentGate, outfit],
  );

  // Gated 'render' entry (reuse-confirm gate already confirmed the saved body):
  // kick off the render straight onto that body. `step` is initialised to
  // 'generating' above so the loading screen is showing while this fires.
  const reuseRenderFiredRef = useRef(false);
  useEffect(() => {
    if (reuseAction === 'render' && reuseBodyId && !reuseRenderFiredRef.current) {
      reuseRenderFiredRef.current = true;
      runRender(reuseBodyId, reuseShape ?? null);
    }
    // Mount-only: the gate passes stable params for a given screen instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase 1 shapes: kick off the 3 body-shape photo generation. The backend
  // requires two body ids; full-body is optional in capture, so we fall back to
  // the selfie id (same fallback the render uses). Consent-gated — the body
  // photos are sent to our AI provider here.
  const startShapeGeneration = useCallback(
    (selfieId: string, capturedFullBodyId: string | null) => {
      const fullId = capturedFullBodyId ?? selfieId;
      aiConsentGate.run(() => {
        setShapes(null);
        setShapesPartial(false);
        setSelectedShape(null);
        setSelectedProfileId(null);
        setShapesErrored(false);
        track('body_shape_generation_started', {
          outfit_hash: outfit.outfitHash,
        });
        setStep('generatingShapes');
        tryOnGenerationStore.startShapes({
          outfit,
          selfieId,
          fullBodyId: fullId,
        });
      });
    },
    [aiConsentGate, outfit],
  );

  // Re-run the 3-shape generation (offered on partial / from the error retry).
  const regenerateShapes = useCallback(() => {
    if (selfieBodyId) {
      startShapeGeneration(selfieBodyId, fullBodyId);
    }
  }, [selfieBodyId, fullBodyId, startShapeGeneration]);

  // Mirror background-store transitions onto local step/result state + fire the
  // resolution analytics exactly once per phase resolution. `generation.outfit`
  // is matched so a stale result from a previous outfit can't leak in.
  const resolvedHashRef = useRef<string | null>(null);
  useEffect(() => {
    if (generation.outfit?.outfitHash !== outfit.outfitHash) return;

    // ── Phase 1: shapes generation ──────────────────────────────────────────
    if (generation.phase === 'shapes') {
      const key = `shapes:${generation.status}`;
      if (generation.status === 'success' && generation.shapes) {
        if (resolvedHashRef.current !== key) {
          resolvedHashRef.current = key;
          track('body_shape_generation_completed', {
            outfit_hash: outfit.outfitHash,
            partial: generation.partial,
          });
        }
        setShapes(generation.shapes);
        setShapesPartial(generation.partial);
        setShapesErrored(false);
        setStep('bodyShape');
      } else if (generation.status === 'error') {
        // Daily-limit 429 → dedicated "out for today" sheet, NO retry. Fires the
        // gate analytics once (deduped by the same resolvedHashRef key) and
        // skips the generic error view.
        if (aiLimitGate.check(generation.errorCode)) {
          if (resolvedHashRef.current !== key) {
            resolvedHashRef.current = key;
            track('ai_limit_gate_shown', {
              feature: 'try_on',
              phase: 'shapes',
            });
          }
          return;
        }
        if (resolvedHashRef.current !== key) {
          resolvedHashRef.current = key;
          track('body_shape_generation_failed', {
            outfit_hash: outfit.outfitHash,
            error_kind: generation.errorKind ?? 'generate',
            // Omit entirely when absent — never ship null/empty (analytics rule).
            ...(generation.errorCode
              ? { error_code: generation.errorCode }
              : {}),
          });
        }
        setShapesErrored(true);
        setStep('generatingShapes');
      }
      return;
    }

    // ── Phase 2: outfit render ──────────────────────────────────────────────
    const key = `render:${generation.status}:${generation.resultUrl ?? ''}`;
    if (generation.status === 'success' && generation.resultUrl) {
      if (resolvedHashRef.current !== key) {
        resolvedHashRef.current = key;
        track('try_on_completed', { outfit_hash: outfit.outfitHash });
      }
      setResultUrl(generation.resultUrl);
      setErrored(false);
      setStep('preview');
    } else if (generation.status === 'error') {
      // Daily-limit 429 → dedicated "out for today" sheet, NO retry. Fires the
      // gate analytics once (deduped by the same resolvedHashRef key) and skips
      // the generic error view (which would render the retry-storm "Try again").
      if (aiLimitGate.check(generation.errorCode)) {
        if (resolvedHashRef.current !== key) {
          resolvedHashRef.current = key;
          track('ai_limit_gate_shown', {
            feature: 'try_on',
            phase: 'render',
          });
        }
        return;
      }
      if (resolvedHashRef.current !== key) {
        resolvedHashRef.current = key;
        track('try_on_failed', {
          outfit_hash: outfit.outfitHash,
          error_kind: generation.errorKind ?? 'generate',
          // Omit entirely when absent — never ship null/empty (analytics rule).
          ...(generation.errorCode ? { error_code: generation.errorCode } : {}),
        });
      }
      setErrored(true);
      setStep('generating');
    }
  }, [
    generation.phase,
    generation.status,
    generation.resultUrl,
    generation.shapes,
    generation.partial,
    generation.outfit,
    generation.errorKind,
    generation.errorCode,
    outfit.outfitHash,
    aiLimitGate,
  ]);

  // AU-358 mount lifecycle: register the in-app completion notifier (idempotent)
  // and tell the store the loading screen is now mounted. On unmount we flag it
  // backgrounded — a still-in-flight job finishing then fires the completion
  // Toast. If the user returns to a job that already finished/started in the
  // background, REHYDRATE from the store (per phase) rather than re-kicking it.
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
      if (existing.phase === 'shapes') {
        if (existing.status === 'success' && existing.shapes) {
          setShapes(existing.shapes);
          setShapesPartial(existing.partial);
          setStep('bodyShape');
        } else {
          setShapesErrored(existing.status === 'error');
          setStep('generatingShapes');
        }
      } else if (existing.status === 'success' && existing.resultUrl) {
        setResultUrl(existing.resultUrl);
        setStep('preview');
      } else {
        setErrored(existing.status === 'error');
        setStep('generating');
      }
    } else {
      // No in-flight/finished job for this outfit — if this outfit already
      // produced a successful AI photo in a prior session, show that cached
      // result immediately (with a Retake affordance) instead of re-running
      // the capture/reuse flow.
      const cached = getTryOnResult(outfit.outfitHash);
      if (cached) {
        setResultUrl(cached);
        setShowCachedResult(true);
        setStep('preview');
        track('try_on_cached_result_shown', {
          outfit_hash: outfit.outfitHash,
        });
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
  // Still needed as the render-retry body fallback (see `renderBodyId`); the
  // reuse-confirm SHEET itself is now owned by the gate (SeeThisOnMeConfirm).
  const reuseMode = !forceCapture && decideEntryMode(activeProfile) === 'reuse';

  // "Retake photos": drop reuse and start the normal capture flow from the
  // selfie step. The saved server profile is left intact. Reused by the preview
  // Retake affordance on a freshly-rendered result.
  const restartCapture = useCallback(() => {
    rehydratedRef.current = false;
    resolvedHashRef.current = null;
    // Drop any background job result so re-capture starts clean (AU-358).
    tryOnGenerationStore.reset();
    setForceCapture(true);
    setSelfie(null);
    setFullBody(null);
    setSelfieBodyId(null);
    setFullBodyId(null);
    setShapes(null);
    setShapesPartial(false);
    setSelectedShape(null);
    setSelectedProfileId(null);
    setResultUrl(null);
    setErrored(false);
    setShapesErrored(false);
    setPhotoError(null);
    setOptIn(true);
    setStep('selfie');
    track('try_on_profile_retake', { outfit_hash: outfit.outfitHash });
    // §3.5 #42: outcome-screen retake fires only when a result actually exists
    // (preview UI).
    if (resultUrl) {
      track('try_on_outcome_retaken', { outfit_hash: outfit.outfitHash });
    }
  }, [outfit.outfitHash, resultUrl]);

  // Retake from a persisted-result preview: drop the cached photo view and fall
  // into the capture flow so the user generates a fresh result (same as the
  // fresh-result Retake — the reuse-confirm sheet is an entry-only affordance
  // owned by the gate). The cached result is LEFT on disk until a new render
  // succeeds, so backing out of the retake keeps the previous photo available.
  const handleCachedRetake = useCallback(() => {
    setShowCachedResult(false);
    setResultUrl(null);
    resolvedHashRef.current = null;
    setForceCapture(true);
    setStep('selfie');
    track('try_on_outcome_retaken', { outfit_hash: outfit.outfitHash });
  }, [outfit.outfitHash]);

  // Validate a just-picked photo immediately by uploading it. On success, hand
  // the created `body_id` to `onValid` (which stores it + advances). On a
  // body-photo rejection (any 422), show the friendly inline message, clear the
  // picked asset, and keep them on the same step to re-pick. Other errors show
  // a distinct generic retry message.
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
  // pending step handler. SINGLE owner of the `busy` spinner for the whole
  // pick→validate round-trip. The picker launch is deferred to the next tick
  // (matching BodyScreen's proven pattern) so the Modal dismiss doesn't swallow
  // the native picker presentation.
  const handleSelectSource = useCallback(
    (source: ImageSource) => {
      const onDone = pendingDoneRef.current;
      pendingDoneRef.current = null;
      setSourceSheetVisible(false);
      setBusy(true);
      setTimeout(async () => {
        try {
          const asset = await pickImage(source);
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

  // AU-358 "quit loading": leave the loading screen WITHOUT cancelling the job.
  // The store keeps it alive; flagging it backgrounded means the in-app
  // completion Toast fires when it finishes so the user can return.
  //
  // Quitting returns to whichever screen launched the flow (My Creations /
  // Favourite / Schedule) via goBack() — the user tapped *quit*, so they expect
  // the previous page, not Home. The whole capture flow is a single stack
  // screen (the steps are local state), so goBack() pops just this screen.
  const handleQuitGeneration = useCallback(() => {
    tryOnGenerationStore.setBackgrounded(true);
    track('body_shape_generation_backgrounded', {
      outfit_hash: outfit.outfitHash,
    });
    navigation.goBack();
  }, [navigation, outfit.outfitHash]);

  // AU-346: pick a shape → persist it as the primary profile server-side
  // (`select` creates/flips it and returns it), then render the outfit on that
  // profile's body id. Never re-uploads photos.
  const handleSelectShape = useCallback(
    async (shape: BodyShapeId) => {
      const jobId = tryOnGenerationStore.getState().jobId;
      if (!jobId) return;
      setSelectedShape(shape);
      track('try_on_step_completed', { step: 'bodyShape' });
      try {
        const profile = await bodyShapeService.selectBodyShape({
          job_id: jobId,
          shape,
        });
        track('body_shape_selected', { shape });
        setSelectedProfileId(profile.id);
        runRender(profile.id, shape);
      } catch (err) {
        // Selection failed (network/expired job) — keep the user on the picker
        // so they can re-tap; record a sanitized failure kind.
        console.warn('AU-358 selectBodyShape failed', err);
        track('try_on_failed', {
          outfit_hash: outfit.outfitHash,
          error_kind: 'select',
        });
      }
    },
    [outfit.outfitHash, runRender],
  );

  // The body record + shape to render with on a retry: the selected profile on
  // the capture path, or the saved profile on the reuse path.
  const renderBodyId =
    selectedProfileId ?? (reuseMode ? activeProfile?.id ?? null : null);
  const renderShape = selectedShape ?? activeProfile?.body_shape ?? null;

  // Daily-limit sheet dismiss: hide the sheet + leave (nothing to retry today).
  // Rendered above BOTH return branches (step-screen shell + capture transcript)
  // so it overlays whichever view is showing when the 429 resolves.
  const handleAiLimitDismiss = useCallback(() => {
    aiLimitGate.sheetProps.onDismiss();
    navigation.goBack();
  }, [aiLimitGate, navigation]);
  const aiLimitSheet = (
    <AiLimitSheet
      visible={aiLimitGate.sheetProps.visible}
      onDismiss={handleAiLimitDismiss}
    />
  );

  // Non-stepped screens (loading / generating / preview / reuse-confirm).
  // Returns the matching shell, or null → render the active capture step below.
  const stepScreen = renderStomStepScreen({
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
    isCachedResult: showCachedResult,
    handleCachedRetake,
    outfitHash: outfit.outfitHash,
  });
  if (stepScreen) {
    return (
      <>
        {stepScreen}
        {aiLimitSheet}
      </>
    );
  }

  // ── Active capture step (full-screen stepped flow, B2 Next-gating) ────────
  const captureStep = step as CaptureStep;
  const stepIndex = stepOrder.indexOf(captureStep);
  const stepNumber = (stepIndex + 1) as 1 | 2 | 3;
  const config = captureStepConfig[captureStep];
  const stepLabel = t('seeThisOnMe.stepLabel', { step: stepNumber });

  let controls: React.ReactNode = null;
  switch (captureStep) {
    case 'selfie':
      controls = (
        <StepSelfie
          busy={busy}
          onTakePhoto={() =>
            capture(asset => {
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
      break;
    case 'fullBody':
      controls = (
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
                },
                body => {
                  setFullBodyId(body.id);
                  track('try_on_step_completed', { step: 'fullBody' });
                  // AU-358: leave full-body → kick off the 3-shape generation.
                  if (selfieBodyId) {
                    startShapeGeneration(selfieBodyId, body.id);
                  }
                },
              );
            })
          }
          onSkip={() => {
            track('try_on_step_completed', {
              step: 'fullBody',
              skipped: true,
            });
            // AU-358: skipping full-body → still generate shapes (the backend
            // needs a full_body_id, so the selfie id is used as the fallback).
            if (selfieBodyId) {
              startShapeGeneration(selfieBodyId, null);
            }
          }}
        />
      );
      break;
    case 'bodyShape':
      controls = (
        <StepBodyShape
          shapes={shapes ?? []}
          partial={shapesPartial}
          selectedShape={selectedShape}
          optIn={optIn}
          onToggleOptIn={() => setOptIn(v => !v)}
          onRegenerate={regenerateShapes}
          // B2: tile/sheet "Use this photo" only RECORDS the selection now.
          onSelectShape={setSelectedShape}
          // B2: the bottom "Next" button fires the actual submit + render.
          onConfirm={() => {
            if (selectedShape) {
              handleSelectShape(selectedShape);
            }
          }}
        />
      );
      break;
    default:
      controls = null;
  }

  return (
    <>
      <StomStepLayout
        testID={`stom-step-screen-${captureStep}`}
        title={t('seeThisOnMe.title')}
        step={stepNumber}
        stepLabel={stepLabel}
        onBack={handleBack}
        promptText={config.promptKey ? t(config.promptKey) : undefined}
        photoError={photoError}
        photoErrorTestID="stom-photo-error"
        privacyText={t('seeThisOnMe.privacyShort')}
      >
        {controls}
      </StomStepLayout>

      <PhotoSourceSheet
        visible={sourceSheetVisible}
        onClose={closeSourceSheet}
        onSelect={handleSelectSource}
      />

      {/* B1: AI data-sharing consent prompt — gates the AI uploads. */}
      <AiConsentDialog {...aiConsentGate.dialogProps} />

      {/* Daily-limit gate — "out of AI for today", no retry. */}
      {aiLimitSheet}
    </>
  );
};
