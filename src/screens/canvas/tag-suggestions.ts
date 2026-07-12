// Quick-fill prompts shown on the full-screen "Add tag" editor (reached by
// tapping the "+" on the canvas tag row). Tapping one drops its label into the
// free-text field so the user can submit it as-is or tweak it first — mirrors
// the refine "Edit context" editor's suggestion chips (EDIT_CONTEXT_SUGGESTIONS).
export interface TagSuggestion {
  id: string;
  // English fallback; resolved through i18n via `labelKey` at render time.
  label: string;
  labelKey: string;
}

export const TAG_SUGGESTIONS: TagSuggestion[] = [
  {
    id: 'elevate',
    label: 'Elevate',
    labelKey: 'outfitCanvas.tag_suggestion_elevate',
  },
  { id: 'dating', label: 'Dating', labelKey: 'outfitCanvas.tag_suggestion_dating' },
  {
    id: 'confident',
    label: 'Confident',
    labelKey: 'outfitCanvas.tag_suggestion_confident',
  },
  {
    id: 'interview',
    label: 'Interview',
    labelKey: 'outfitCanvas.tag_suggestion_interview',
  },
];
