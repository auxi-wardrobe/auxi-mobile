/**
 * Step-flow types + transcript config for the "See this on me" self-visualization
 * flow (see SeeThisOnMeScreen). Extracted verbatim — no behavior change.
 */
import React from 'react';
import { Icons } from '../../assets/icons';

// Capture steps in transcript order. `promptKey` is the i18n bubble copy;
// `icon` is the outline glyph that sits inside the bubble (Figma 3398:18229 /
// 18246). The screen renders these bubbles + the per-step captured thumbnail
// from state so every step shows the correct accumulation — no hand-picking.
export type CaptureStep = 'selfie' | 'fullBody' | 'bodyShape';

// 'generatingShapes' = AI building the 3 body-shape photos (async, AU-358);
// 'generating' = rendering the outfit onto the chosen body (async).
export type Step = CaptureStep | 'generatingShapes' | 'generating' | 'preview';

export const stepOrder: CaptureStep[] = ['selfie', 'fullBody', 'bodyShape'];

export const captureStepConfig: Record<
  CaptureStep,
  { promptKey: string; icon?: React.ReactNode; testID: string }
> = {
  selfie: {
    promptKey: 'seeThisOnMe.step1.prompt',
    icon: React.createElement(Icons.FaceId, { width: 44, height: 44 }),
    testID: 'stom-step-1-prompt',
  },
  fullBody: {
    promptKey: 'seeThisOnMe.step2.prompt',
    icon: React.createElement(Icons.BodyOutline, { width: 44, height: 44 }),
    testID: 'stom-step-2-prompt',
  },
  bodyShape: {
    promptKey: 'seeThisOnMe.step3.prompt',
    testID: 'stom-step-3-prompt',
  },
};
