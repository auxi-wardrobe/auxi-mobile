// Pure helpers for the Wardrobe switcher sheet (design revision §9.2). No
// React / RN imports so they're trivially unit-testable. Copy strings live in
// i18n; these helpers only derive the row list + selection state.
import type { Capsule } from '../../services/capsuleService';

/** The active wardrobe context: the full wardrobe or a specific capsule id. */
export type WardrobeContext = 'entire' | string;

export type WardrobeSwitcherRow =
  | { kind: 'entire'; count: number; selected: boolean }
  | {
      kind: 'capsule';
      capsuleId: string;
      name: string;
      count: number;
      selected: boolean;
    };

/**
 * Build the switcher rows: an "Entire Wardrobe" row (count = wardrobe items
 * length) followed by one row per capsule (count = its item_count). Exactly one
 * row is radio-selected, matching `activeContext` ('entire' or a capsule id).
 */
export const buildWardrobeSwitcherRows = (
  wardrobeItemCount: number,
  capsules: Capsule[],
  activeContext: WardrobeContext,
): WardrobeSwitcherRow[] => [
  {
    kind: 'entire',
    count: Math.max(0, wardrobeItemCount),
    selected: activeContext === 'entire',
  },
  ...capsules.map(
    (capsule): WardrobeSwitcherRow => ({
      kind: 'capsule',
      capsuleId: capsule.id,
      name: capsule.name,
      count: capsule.item_count ?? 0,
      selected: activeContext === capsule.id,
    }),
  ),
];
