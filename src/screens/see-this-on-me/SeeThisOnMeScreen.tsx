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
import { tryOnService } from '../../services/tryOnService';
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
import { OutfitPreview } from './OutfitPreview';
import { GeneratingView } from './GeneratingView';
import { BodyShapeId } from './body-shapes';
import { decideEntryMode } from './profile-entry';

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

  const handleBack = useCallback(() => {
    const idx = stepOrder.indexOf(step as CaptureStep);
    if (idx > 0) {
      setStep(stepOrder[idx - 1]);
      return;
    }
    navigation.goBack();
  }, [navigation, step]);

  // Generate the try-on from the already-uploaded body record. Photos were
  // uploaded + validated at pick time, so this never re-uploads — it just calls
  // the high-res render with the stored `body_id` (full-body preferred) and the
  // outfit's item ids + chosen body shape.
  const runGenerate = useCallback(
    async (bodyId: string, shape: BodyShapeId | null) => {
      setStep('generating');
      setErrored(false);
      try {
        track('try_on_started', {
          outfit_hash: outfit.outfitHash,
          item_count: outfit.itemIds.length,
        });
        const res = await tryOnService.generateTryOn({
          body_id: bodyId,
          wardrobe_item_ids: outfit.itemIds,
          gemini_opt_in: true,
          prompt_params: shape ? { body_shape: shape } : undefined,
        });
        const url =
          res.composite_url ??
          (res.composite_png
            ? `data:image/png;base64,${res.composite_png}`
            : null);
        if (!url) {
          throw new Error('no_composite');
        }
        setResultUrl(url);
        track('try_on_completed', {
          outfit_hash: outfit.outfitHash,
          provider: res.provider,
        });
        setStep('preview');
      } catch {
        // Validation already happened at pick time, so any failure here is a
        // generate-side problem (render error / network). Show the generic
        // retry state.
        track('try_on_failed', {
          outfit_hash: outfit.outfitHash,
          error_kind: 'generate',
        });
        setErrored(true);
      }
    },
    [outfit.itemIds, outfit.outfitHash],
  );

  // AU-346 reuse: fetch the user's active reusable profile on mount. While this
  // resolves the screen shows the shared MacgieLoader; once known it either
  // drives the reuse path (profile present) or the capture flow (none).
  const { data: activeProfile, isLoading: profileLoading } = useQuery({
    queryKey: ACTIVE_PROFILE_QUERY_KEY,
    queryFn: () => bodyService.getActiveProfile(),
  });

  // True only when a saved profile exists AND the user hasn't asked to retake.
  const reuseMode =
    !forceCapture && decideEntryMode(activeProfile) === 'reuse';

  // AU-346: with a reusable profile (and no explicit retake), skip capture and
  // render the CURRENT outfit straight away with the stored body + shape. Guard
  // so it fires once per arrival on the reuse path, not on every render.
  const reuseFiredRef = useRef(false);
  useEffect(() => {
    if (reuseMode && activeProfile?.id && !reuseFiredRef.current) {
      reuseFiredRef.current = true;
      runGenerate(activeProfile.id, activeProfile.body_shape ?? null);
    }
  }, [reuseMode, activeProfile, runGenerate]);

  // "Retake photos" on the reuse path: drop reuse and start the normal capture
  // flow from the selfie step. The saved server profile is left intact until a
  // new capture is saved (opt-in at the shape step overwrites it).
  const restartCapture = useCallback(() => {
    reuseFiredRef.current = false;
    setForceCapture(true);
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
  }, [outfit.outfitHash]);

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
        <StomHeader title={t('seeThisOnMe.title')} onBack={handleBack} />
        <GeneratingView
          errored={errored}
          onRetry={() => {
            if (activeGenerationBodyId) {
              runGenerate(activeGenerationBodyId, activeShape);
            }
          }}
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
