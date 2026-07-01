/**
 * Per-step CTA controls for the See-this-on-me capture transcript. Renders the
 * active capture step's control component (selfie / fullBody / bodyShape) with
 * its capture + validate wiring. Extracted verbatim from SeeThisOnMeScreen's
 * `renderStepControls` — same closures, same `track()` calls, no behavior change.
 */
import React from 'react';
import { Asset } from 'react-native-image-picker';
import { track } from '../../services/analytics';
import { StepSelfie } from './StepSelfie';
import { StepFullBody } from './StepFullBody';
import { StepBodyShape } from './StepBodyShape';
import { BodyShapeId, GeneratedShape } from './body-shapes';
import { CaptureStep, Step } from './stom-steps';

export interface StomStepControlsProps {
  busy: boolean;
  capture: (onDone: (asset: Asset) => void | Promise<void>) => void;
  validatePickedPhoto: (
    asset: Asset,
    clearAsset: () => void,
    onValid: (body: { id: string; image_url?: string }) => void,
  ) => Promise<void>;
  setSelfie: React.Dispatch<React.SetStateAction<Asset | null>>;
  setSelfieBodyId: React.Dispatch<React.SetStateAction<string | null>>;
  setStep: React.Dispatch<React.SetStateAction<Step>>;
  setFullBody: React.Dispatch<React.SetStateAction<Asset | null>>;
  setFullBodyId: React.Dispatch<React.SetStateAction<string | null>>;
  startShapeGeneration: (
    selfieId: string,
    capturedFullBodyId: string | null,
  ) => void;
  selfieBodyId: string | null;
  shapes: GeneratedShape[] | null;
  shapesPartial: boolean;
  selectedShape: BodyShapeId | null;
  optIn: boolean;
  setOptIn: React.Dispatch<React.SetStateAction<boolean>>;
  regenerateShapes: () => void;
  handleSelectShape: (shape: BodyShapeId) => void | Promise<void>;
}

export function renderStomStepControls(
  step: CaptureStep,
  props: StomStepControlsProps,
): React.ReactElement | null {
  const {
    busy,
    capture,
    validatePickedPhoto,
    setSelfie,
    setSelfieBodyId,
    setStep,
    setFullBody,
    setFullBodyId,
    startShapeGeneration,
    selfieBodyId,
    shapes,
    shapesPartial,
    selectedShape,
    optIn,
    setOptIn,
    regenerateShapes,
    handleSelectShape,
  } = props;

  switch (step) {
    case 'selfie':
      return (
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
    case 'bodyShape':
      return (
        <StepBodyShape
          shapes={shapes ?? []}
          partial={shapesPartial}
          selectedShape={selectedShape}
          optIn={optIn}
          onToggleOptIn={() => setOptIn(v => !v)}
          onRegenerate={regenerateShapes}
          onSelectShape={handleSelectShape}
        />
      );
    default:
      return null;
  }
}
