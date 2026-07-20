import React from 'react';
import {
  KeyboardAvoidingView,
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
import { MInput } from '../design-system/lib';
import { EditContextSuggestion } from '../../screens/HomeScreen/context-chips';

interface EditContextViewProps {
  // Free-text context the user is composing. Mirrors the refine hook's
  // `customText` so typing here and submitting flows through the same path as
  // the chip row it replaces.
  value: string;
  suggestions: EditContextSuggestion[];
  // Disabled while the trimmed text is empty — there's nothing to apply.
  submitDisabled: boolean;
  onChangeText: (text: string) => void;
  // Back chevron — returns to the refine sheet's chip row (does not close the
  // whole refine flow).
  onBack: () => void;
  // Arrow / keyboard "send" — applies the typed context.
  onSubmit: () => void;
  // Quick-fill: drops the suggestion's label into the text field.
  onSelectSuggestion: (label: string) => void;
}

// Full-screen "Edit context" editor. Deliberately NOT a native <Modal>: it is
// rendered INSIDE ContextChipsModal's Modal (swapped with the chip card via
// the `editView` prop). Presenting it as a sibling Modal raced the chip
// sheet's delayed dismissal on iOS — UIKit tore the editor down together with
// the sheet's view controller, so the edit screen never survived on device.
export const EditContextView: React.FC<EditContextViewProps> = ({
  value,
  suggestions,
  submitDisabled,
  onChangeText,
  onBack,
  onSubmit,
  onSelectSuggestion,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      testID="edit-context-root"
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
          testID="edit-context-back"
          accessibilityRole="button"
          accessibilityLabel={t('contextChips.a11y_back')}
          activeOpacity={0.82}
          style={styles.backButton}
          onPress={onBack}
        >
          <Icons.ChevronLeft width={24} height={24} />
        </TouchableOpacity>

        <View style={styles.inputRow}>
          <View style={styles.inputFill}>
            <MInput
              testID="edit-context-input"
              value={value}
              onChangeText={onChangeText}
              placeholder={t('contextChips.edit_placeholder')}
              accessibilityLabel={t('contextChips.edit_placeholder')}
              autoFocus
              returnKeyType="send"
              onSubmitEditing={submitDisabled ? undefined : onSubmit}
            />
          </View>
          <TouchableOpacity
            testID="edit-context-submit"
            accessibilityRole="button"
            accessibilityLabel={t('contextChips.a11y_submit')}
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

        <Text style={styles.heading}>
          {t('contextChips.suggested_context')}
        </Text>

        <View style={styles.suggestions}>
          {suggestions.map(suggestion => {
            const label = t(suggestion.labelKey, {
              defaultValue: suggestion.label,
            });
            return (
              <Pressable
                key={suggestion.id}
                testID={`edit-context-suggestion-${suggestion.id}`}
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
    // canvas (matches the design's soft drop shadow).
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
  // Square submit button paired to MInput's 54px height + 12px (radius.xl)
  // corners so the field and its action read as one control.
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
    ...theme.typography.aliases.interBodySmTight,
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
