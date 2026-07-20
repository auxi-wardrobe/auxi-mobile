/**
 * Step-flow types + transcript config for the "See this on me" self-visualization
 * flow (see SeeThisOnMeScreen).
 *
 * Step 1 (selfie) and step 2 (full body) no longer use a generic prompt-bubble
 * + single icon — they own a richer headline + bullet-tips content block
 * (`CaptureStepIntro`, see StepSelfie.tsx / StepFullBody.tsx), so this config
 * only carries the step-3 (body shape) prompt, which still uses the plain
 * `StomStepLayout` promptText/promptIcon slot.
 */
export type CaptureStep = 'selfie' | 'fullBody' | 'bodyShape';

// 'generatingShapes' = AI building the 3 body-shape photos (async, AU-358);
// 'generating' = rendering the outfit onto the chosen body (async).
export type Step = CaptureStep | 'generatingShapes' | 'generating' | 'preview';

export const stepOrder: CaptureStep[] = ['selfie', 'fullBody', 'bodyShape'];

export const captureStepConfig: Record<
  CaptureStep,
  { promptKey?: string; testID: string }
> = {
  selfie: {
    testID: 'stom-step-1-prompt',
  },
  fullBody: {
    testID: 'stom-step-2-prompt',
  },
  bodyShape: {
    promptKey: 'seeThisOnMe.step3.prompt',
    testID: 'stom-step-3-prompt',
  },
};
