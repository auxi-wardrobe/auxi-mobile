import { useCallback, useMemo, useState } from 'react';
import { Keyboard } from 'react-native';
import { useTranslation } from 'react-i18next';
import { track } from '../../../services/analytics';
import {
  ContextChipId,
  ContextChipOption,
} from '../../../components/features/ContextChipsModal';
import { CONTEXT_CHIP_LABEL_KEYS, pickContextChips } from '../context-chips';

type UseContextRefineModalParams = {
  // `isChip` is true when the payload is a fixed chip label (safe for
  // analytics); false when it's custom free-text (must not be shipped).
  onSubmitFeedback: (payload: string, isChip: boolean) => void;
  // Invoked when the user defers the progressive-refinement gate ("Skip for
  // now"). The parent resumes generation + records the skip; the hook only
  // closes the sheet.
  onSkipRefinement?: () => void;
};

export const useContextRefineModal = ({
  onSubmitFeedback,
  onSkipRefinement,
}: UseContextRefineModalParams) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  // The 3–5 chip subset currently on screen. Re-rolled on every open and on
  // each shuffle so the sheet shows a fresh random slice of the pool.
  const [activeChipOptions, setActiveChipOptions] = useState<
    ContextChipOption[]
  >(() => pickContextChips());
  const [selectedChipId, setSelectedChipId] = useState<ContextChipId | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [customText, setCustomText] = useState('');

  const trimmedCustomText = customText.trim();
  const confirmDisabled = !selectedChipId && trimmedCustomText.length === 0;

  const displayChipOptions = useMemo<ContextChipOption[]>(
    () =>
      activeChipOptions.map(option => ({
        ...option,
        label: t(CONTEXT_CHIP_LABEL_KEYS[option.id], {
          defaultValue: option.label,
        }),
      })),
    [activeChipOptions, t],
  );

  const resetDraft = useCallback(() => {
    // Re-roll the visible chips so the next open starts from a fresh subset.
    setActiveChipOptions(pickContextChips());
    setSelectedChipId(null);
    setIsEditing(false);
    setCustomText('');
  }, []);

  // The draft (incl. `isEditing`) is deliberately NOT reset here — the sheet
  // needs `isEditing` intact while it unmounts to know whether to skip the
  // card slide-out. `open()` resets the draft before the next presentation.
  const close = useCallback(() => {
    Keyboard.dismiss();
    setIsOpen(false);
  }, []);

  const open = useCallback(
    (source: string) => {
      Keyboard.dismiss();
      // Fresh draft + a fresh random chip subset each time the sheet opens.
      resetDraft();
      setIsOpen(true);
      track('refine_modal_opened', { source });
    },
    [resetDraft],
  );

  const onShuffle = useCallback(() => {
    Keyboard.dismiss();
    // Swap in a new random subset, deprioritising the chips just shown so the
    // shuffle visibly reveals other options.
    setActiveChipOptions(current =>
      pickContextChips(current.map(chip => chip.id)),
    );
    setSelectedChipId(null);
    setIsEditing(false);
    setCustomText('');
    track('refine_chips_shuffled');
  }, []);

  const onSelectChip = useCallback((chipId: ContextChipId) => {
    Keyboard.dismiss();
    setSelectedChipId(currentChipId =>
      currentChipId === chipId ? null : chipId,
    );
    setIsEditing(false);
    setCustomText('');
  }, []);

  const onEdit = useCallback(() => {
    setSelectedChipId(null);
    setIsEditing(true);
  }, []);

  const onChangeText = useCallback((text: string) => {
    setSelectedChipId(null);
    setIsEditing(true);
    setCustomText(text);
  }, []);

  // Back out of the full-screen edit view to the chip row without closing the
  // whole refine flow. Clears the in-progress draft so the chips reads fresh.
  const onCancelEdit = useCallback(() => {
    Keyboard.dismiss();
    setIsEditing(false);
    setCustomText('');
    setSelectedChipId(null);
  }, []);

  const onCancel = useCallback(() => {
    track('refine_cancelled', {
      had_selection: !!selectedChipId || trimmedCustomText.length > 0,
    });
    close();
  }, [selectedChipId, trimmedCustomText, close]);

  const onSkip = useCallback(() => {
    // Skip analytics fire once from the parent's onSkipRefinement (with the
    // session skip count) to avoid double-counting a single user action.
    close();
    onSkipRefinement?.();
  }, [close, onSkipRefinement]);

  const onConfirm = useCallback(() => {
    const chipLabel = selectedChipId
      ? activeChipOptions.find(c => c.id === selectedChipId)?.label
      : null;
    const payload = chipLabel ?? (trimmedCustomText || null);

    if (!payload) {
      close();
      return;
    }

    track('refine_submitted', {
      mode: chipLabel ? 'chip' : 'custom',
      ...(chipLabel ? { value: payload } : {}),
    });

    close();
    onSubmitFeedback(payload, !!chipLabel);
  }, [
    selectedChipId,
    activeChipOptions,
    trimmedCustomText,
    close,
    onSubmitFeedback,
  ]);

  return {
    isOpen,
    open,
    selectedChipId,
    isEditing,
    customText,
    confirmDisabled,
    displayChipOptions,
    onSelectChip,
    onShuffle,
    onEdit,
    onChangeText,
    onCancelEdit,
    onCancel,
    onConfirm,
    onSkip,
  };
};
