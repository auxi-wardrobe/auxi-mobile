/**
 * Pose vocabulary for the self-visualization render.
 *
 * The generated full-body image was always rendered in the same flat, front-on
 * standing pose, which read as "bad AI output". To make repeated renders of the
 * same outfit feel fresh, we pick ONE pose per generation and pass it to the
 * backend in `prompt_params.pose`; the backend Gemini prompt turns it into the
 * rendered stance.
 *
 * Two registers — relaxed everyday "natural" stances and editorial "fashion"
 * stances — so the model is always standing, but never the same way twice.
 *
 * BACKEND DEPENDENCY: randomising here keeps each generate request explicit and
 * reproducible from logs, but it only changes the output if the backend reads
 * `prompt_params.pose`. Until the backend honours it, this is a no-op on the
 * rendered image.
 */
export type PoseRegister = 'natural' | 'fashion';

export interface Pose {
  register: PoseRegister;
  /** Free-text stance instruction handed to the backend Gemini prompt. */
  prompt: string;
}

// Every pose is a STANDING pose (per the spec); the variety is in the stance.
export const POSES: Pose[] = [
  {
    register: 'natural',
    prompt:
      'standing naturally with weight on one leg, arms relaxed at the sides, looking at the camera',
  },
  {
    register: 'natural',
    prompt: 'standing relaxed with hands in pockets and a slight smile',
  },
  {
    register: 'natural',
    prompt:
      'standing casually with one hand on the hip, shoulders relaxed, candid expression',
  },
  {
    register: 'natural',
    prompt:
      'standing with arms loosely crossed, weight shifted to one side, easy posture',
  },
  {
    register: 'fashion',
    prompt:
      'editorial fashion stance, chin up, confident posture, gaze off-camera',
  },
  {
    register: 'fashion',
    prompt: 'runway model pose, one leg crossed in front, hand resting on the hip',
  },
  {
    register: 'fashion',
    prompt:
      'high-fashion three-quarter turn, shoulders angled to the camera, strong upright posture',
  },
  {
    register: 'fashion',
    prompt: 'lookbook pose, arms crossed, direct confident gaze, clean stance',
  },
];

/** Pick a random pose for a single generation run. */
export const pickRandomPose = (): Pose =>
  POSES[Math.floor(Math.random() * POSES.length)];
