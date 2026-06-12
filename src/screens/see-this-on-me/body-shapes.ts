/**
 * Body-shape options for the Step 3 picker.
 *
 * ASSET GAP: the Figma design (node 3395:9248 / 3398:17745) renders the shapes
 * as full-body *photo* instances, not reusable SVG silhouettes — so there are no
 * vector assets to export. Per the Workstream-5 task instruction ("if no SVG
 * assets exist, use a simple labeled option set … note the asset gap"), we ship
 * a labeled shape vocabulary. The `id` is what rides in
 * `prompt_params.body_shape` to `/tryon/highres`.
 */
export type BodyShapeId = 'pear' | 'hourglass' | 'rectangle';

export interface BodyShapeOption {
  id: BodyShapeId;
  /** i18n key suffix under `seeThisOnMe.shapes.*` for the label. */
  labelKey: string;
}

// Figma step-3 (3395:9248) / detail (3398:17745) render exactly 3 body shapes.
// The picker row, expanded carousel pages, and pagination dots all derive their
// count from this array — keep it at 3 to match the design.
export const BODY_SHAPE_OPTIONS: BodyShapeOption[] = [
  { id: 'pear', labelKey: 'pear' },
  { id: 'hourglass', labelKey: 'hourglass' },
  { id: 'rectangle', labelKey: 'rectangle' },
];
