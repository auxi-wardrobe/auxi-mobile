/**
 * Outfit-naming step for the Creation Studio save flow (Figma: full-screen white
 * sheet with a floating back chip, a single text field + a dark "continue"
 * arrow, keyboard auto-raised). Tapping Save on the canvas opens this; entering
 * a name + the arrow persists the creation WITH that name.
 *
 * Deliberately a self-contained overlay (Modal) rather than a routed screen: the
 * canvas owns the items, dirty-state, persist + error handling, so keeping the
 * naming step in-place avoids threading that state through navigation. The back
 * chip just closes it (canvas + items intact).
 *
 *   Field : placeholder "eg: Weekend Coffee"
 *   Arrow : disabled until a non-empty name; shows a spinner while saving.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import IconChevronLeft from '../../assets/images/icon_chevron_left.svg';
import IconChevronRight from '../../assets/images/icon_chevron_right.svg';

// Keep names short enough to render on a creation card without truncation games.
const MAX_NAME_LENGTH = 40;

type Props = {
  visible: boolean;
  /** True while the save is in flight — drives the arrow's spinner + locks input. */
  isBusy?: boolean;
  /** Back chip / hardware back — close without saving (canvas + items intact). */
  onBack: () => void;
  /** Continue arrow — persist the creation with the trimmed name. */
  onSubmit: (name: string) => void;
};

export const NameCreationSheet: React.FC<Props> = ({
  visible,
  isBusy = false,
  onBack,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const [name, setName] = useState('');

  // Reset the field and raise the keyboard each time the sheet opens. The focus
  // is deferred a tick so it lands after the Modal's slide-in (focusing mid-
  // animation is unreliable on iOS).
  useEffect(() => {
    if (!visible) {
      return;
    }
    setName('');
    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [visible]);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && !isBusy;

  const submit = () => {
    if (!canSubmit) {
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onBack}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity
            testID="creation-name-back"
            accessibilityRole="button"
            accessibilityLabel={t('outfitCanvas.a11y_name_back')}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.backButton}
            onPress={onBack}
          >
            <IconChevronLeft
              width={24}
              height={24}
              color={theme.colors.figmaText}
            />
          </TouchableOpacity>

          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              testID="creation-name-input"
              accessibilityLabel={t('outfitCanvas.a11y_name_input')}
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('outfitCanvas.name_placeholder')}
              placeholderTextColor={theme.colors.figmaTextSecondary}
              maxLength={MAX_NAME_LENGTH}
              returnKeyType="go"
              onSubmitEditing={submit}
              editable={!isBusy}
            />
            <TouchableOpacity
              testID="creation-name-submit"
              accessibilityRole="button"
              accessibilityLabel={t('outfitCanvas.a11y_name_submit')}
              accessibilityState={{ disabled: !canSubmit }}
              activeOpacity={0.85}
              style={[
                styles.submitButton,
                !canSubmit && styles.submitButtonDisabled,
              ]}
              onPress={submit}
              disabled={!canSubmit}
            >
              {isBusy ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.figmaPrimaryButtonIcon}
                />
              ) : (
                <IconChevronRight
                  width={24}
                  height={24}
                  color={theme.colors.figmaPrimaryButtonIcon}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.l, // 24
    paddingTop: theme.spacing.m,
    gap: theme.spacing.l,
  },
  // Floating white "back" chip with a soft shadow (top-left in the design).
  backButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.figmaTile, // 12
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.uacDimension12, // 12
  },
  input: {
    flex: 1,
    height: theme.spacing.uacButtonHeight, // 56
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.figmaTile, // 12
    paddingHorizontal: theme.spacing.m,
    fontSize: 16,
    color: theme.colors.figmaText,
    backgroundColor: theme.colors.white,
  },
  submitButton: {
    width: theme.spacing.uacButtonHeight, // 56
    height: theme.spacing.uacButtonHeight,
    borderRadius: theme.borderRadius.l, // 16
    backgroundColor: theme.colors.figmaPrimaryButtonBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
});
