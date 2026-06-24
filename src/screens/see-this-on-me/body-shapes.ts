/**
 * Body-shape options for the Step 3 picker.
 *
 * The user picks the build that best matches them; the chosen `id` rides in
 * `prompt_params.body_shape` to `/tryon/highres`, where the backend Gemini
 * prompt uses it to shape the generated full-body render. The vocabulary is a
 * plain build descriptor (chubby / normal / thin) rather than a silhouette
 * archetype so it maps directly onto how the AI should render the body.
 *
 * ASSET GAP: the Figma design (node 3395:9248 / 3398:17745) renders the shapes
 * as full-body *photo* instances, not reusable SVG silhouettes — so there are no
 * vector assets to export. Per the Workstream-5 task instruction ("if no SVG
 * assets exist, use a simple labeled option set … note the asset gap"), we ship
 * a labeled shape vocabulary.
 *
 * BACKEND DEPENDENCY: showing the user's *own selfie* re-rendered into each of
 * the three builds (so they pick from real previews instead of labels) needs a
 * backend endpoint that does not exist yet — `/tryon/highres` only renders ONE
 * composite from body + outfit + shape. Until that ships, this stays a labeled
 * picker.
 */
export type BodyShapeId = 'chubby' | 'normal' | 'thin';

export interface BodyShapeOption {
  id: BodyShapeId;
  /** i18n key suffix under `seeThisOnMe.shapes.*` for the label. */
  labelKey: string;
}

// Figma step-3 (3395:9248) / detail (3398:17745) render exactly 3 body shapes.
// The picker row, expanded carousel pages, and pagination dots all derive their
// count from this array — keep it at 3 to match the design.
export const BODY_SHAPE_OPTIONS: BodyShapeOption[] = [
  { id: 'chubby', labelKey: 'chubby' },
  { id: 'normal', labelKey: 'normal' },
  { id: 'thin', labelKey: 'thin' },
];
