import {
  ContextChipId,
  ContextChipOption,
} from '../../components/features/ContextChipsModal';

export const CONTEXT_CHIP_SETS: ContextChipOption[][] = [
  [
    { id: 'more_relaxed', label: 'More relaxed' },
    { id: 'different_vibe', label: 'Different vibe' },
  ],
  [
    { id: 'more_polished', label: 'More polished' },
    { id: 'more_casual', label: 'More casual' },
  ],
  [
    { id: 'bolder_choice', label: 'Bolder choice' },
    { id: 'simpler_look', label: 'Simpler look' },
  ],
];

export const CONTEXT_CHIP_LABEL_KEYS: Record<ContextChipId, string> = {
  more_relaxed: 'home.chip_more_relaxed',
  different_vibe: 'home.chip_different_vibe',
  more_polished: 'home.chip_more_polished',
  more_casual: 'home.chip_more_casual',
  bolder_choice: 'home.chip_bolder',
  simpler_look: 'home.chip_simpler',
};
