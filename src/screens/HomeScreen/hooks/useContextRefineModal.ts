import { useCallback, useMemo, useState } from 'react';
import { Keyboard } from 'react-native';
import { useTranslation } from 'react-i18next';
import { track } from '../../../services/analytics';
import {
  ContextChipId,
  ContextChipOption,
} from '../../../components/features/ContextChipsModal';
import { CONTEXT_CHIP_LABEL_KEYS, CONTEXT_CHIP_SETS } from '../context-chips';

type UseContextRefineModalParams = {
  onSubmitFeedback: (payload: string) => void;
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
  const [suggestionSetIndex, setSuggestionSetIndex] = useState(0);
  const [selectedChipId, setSelectedChipId] = useState<ContextChipId | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [customText, setCustomText] = useState('');

  const activeChipOptions =
    CONTEXT_CHIP_SETS[suggestionSetIndex] ?? CONTEXT_CHIP_SETS[0];
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
    setSuggestionSetIndex(0);
    setSelectedChipId(null);
    setIsEditing(false);
    setCustomText('');
  }, []);

  const close = useCallback(() => {
    Keyboard.dismiss();
    setIsOpen(false);
    resetDraft();
  }, [resetDraft]);

  const open = useCallback((source: string) => {
    Keyboard.dismiss();
    setIsOpen(true);
    track('refine_modal_opened', { source });
  }, []);

  const onShuffle = useCallback(() => {
    Keyboard.dismiss();
    setSuggestionSetIndex(
      currentIndex => (currentIndex + 1) % CONTEXT_CHIP_SETS.length,
    );
    setSelectedChipId(null);
    setIsEditing(false);
    setCustomText('');
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

  const onCancel = useCallback(() => {
    track('refine_cancelled', {
      had_selection: !!selectedChipId || trimmedCustomText.length > 0,
    });
    close();
  }, [selectedChipId, trimmedCustomText, close]);

  const onSkip = useCallback(() => {
    track('refine_skipped', {
      had_selection: !!selectedChipId || trimmedCustomText.length > 0,
    });
    close();
    onSkipRefinement?.();
  }, [selectedChipId, trimmedCustomText, close, onSkipRefinement]);

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
    onSubmitFeedback(payload);
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
    onCancel,
    onConfirm,
    onSkip,
  };
};
