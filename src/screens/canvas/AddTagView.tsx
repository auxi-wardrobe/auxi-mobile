/**
 * Full-screen "Add tag" editor for the Outfit Canvas — a back chevron, a
 * free-text field paired with an arrow submit, and a "Suggested tags" chip
 * list. Deliberately mirrors the refine "Edit context" editor
 * (components/features/EditContextView) so the two read as the same control:
 * same input row, same square submit button, same suggestion chips.
 *
 * Presented as its own slide-up <Modal> (the canvas has no host sheet to swap
 * it into, unlike EditContextView which lives inside ContextChipsModal).
 */
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { MInput } from '../../components/design-system/lib';
import { TagSuggestion } from './tag-suggestions';

interface AddTagViewProps {
  visible: boolean;
  // Free-text tag the user is composing (owned by the canvas screen so the
  // suggestion chips can quick-fill it).
  value: string;
  suggestions: TagSuggestion[];
  // Disabled while the trimmed text is empty — there's nothing to add.
  submitDisabled: boolean;
  onChangeText: (text: string) => void;
  // Back chevron / hardware back — closes without adding.
  onClose: () => void;
  // Arrow / keyboard "done" — adds the typed tag.
  onSubmit: () => void;
  // Quick-fill: drops the suggestion's label into the text field.
  onSelectSuggestion: (label: string) => void;
}

export const AddTagView: React.FC<AddTagViewProps> = ({
  visible,
  value,
  suggestions,
  submitDisabled,
  onChangeText,
  onClose,
  onSubmit,
  onSelectSuggestion,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <KeyboardAvoidingView
        testID="canvas-add-tag-root"
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + theme.spacing.s },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            testID="canvas-add-tag-back"
            accessibilityRole="button"
            accessibilityLabel={t('common.a11y_go_back')}
            activeOpacity={0.82}
            style={styles.backButton}
            onPress={onClose}
          >
            <Icons.ChevronLeft width={24} height={24} />
          </TouchableOpacity>

          <View style={styles.inputRow}>
            <View style={styles.inputFill}>
              <MInput
                testID="canvas-tag-input"
                value={value}
                onChangeText={onChangeText}
                placeholder={t('outfitCanvas.tag_input_placeholder')}
                accessibilityLabel={t('outfitCanvas.a11y_tag_input')}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={submitDisabled ? undefined : onSubmit}
              />
            </View>
            <TouchableOpacity
              testID="canvas-tag-submit"
              accessibilityRole="button"
              accessibilityLabel={t('outfitCanvas.a11y_submit_tag')}
              activeOpacity={0.85}
              style={[
                styles.submitButton,
                submitDisabled && styles.submitButtonDisabled,
              ]}
              disabled={submitDisabled}
              onPress={onSubmit}
            >
              <Icons.ArrowRight
                width={24}
                height={24}
                color={theme.colors.figmaPrimaryButtonText}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.heading}>{t('outfitCanvas.suggested_tags')}</Text>

          <View style={styles.suggestions}>
            {suggestions.map(suggestion => {
              const label = t(suggestion.labelKey, {
                defaultValue: suggestion.label,
              });
              return (
                <Pressable
                  key={suggestion.id}
                  testID={`canvas-tag-suggestion-${suggestion.id}`}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.suggestionChip,
                    pressed && styles.suggestionChipPressed,
                  ]}
                  onPress={() => onSelectSuggestion(label)}
                >
                  <Text style={styles.suggestionText}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.m,
    paddingBottom: theme.spacing.xl,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.colors.figmaSurface,
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle lift so the chevron reads as a floating control on the white
    // canvas (matches the refine editor's soft drop shadow).
    shadowColor: theme.ds.color.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    marginTop: theme.spacing.xl,
  },
  inputFill: {
    flex: 1,
  },
  // Square submit button paired to MInput's 54px height + 12px corners so the
  // field and its action read as one control (matches the refine editor).
  submitButton: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: theme.colors.figmaPrimaryButtonBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  heading: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextPrimary,
    marginTop: theme.spacing.l,
  },
  suggestions: {
    marginTop: theme.spacing.m,
    alignItems: 'flex-start',
    gap: theme.spacing.m,
  },
  suggestionChip: {
    minHeight: 44,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.figmaInsightPillBg,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionChipPressed: {
    opacity: 0.82,
  },
  suggestionText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaText,
  },
});
