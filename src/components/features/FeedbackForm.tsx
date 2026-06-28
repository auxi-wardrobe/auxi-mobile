import React, { useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { toast } from '../design-system/lib';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useMutation } from '@tanstack/react-query';
import { PillButton } from '../primitives/FigmaPrimitives';
import { theme } from '../../theme/theme';
import { track } from '../../services/analytics';
import {
  FeedbackCategory,
  FeedbackSubmitRequest,
  feedbackService,
} from '../../services/feedbackService';

const MESSAGE_MAX_LENGTH = 2000;
const RATING_VALUES = [1, 2, 3, 4, 5] as const;
const CATEGORIES: FeedbackCategory[] = ['bug', 'idea', 'general', 'praise'];

// Resolved at render from t() so the labels stay out of module scope (i18n).
const buildCategoryLabel = (t: TFunction, category: FeedbackCategory): string =>
  t(`feedback.category_${category}`);

// Map an axios error to a sanitized snake_case code for analytics + copy
// selection. NEVER surface the raw error message (PII risk + noisy taxonomy).
const resolveErrorCode = (error: unknown): string => {
  const status = (error as { response?: { status?: number } } | undefined)
    ?.response?.status;
  if (status === 429) return 'rate_limited';
  if (status === 422) return 'validation_error';
  if (status === 401) return 'auth_error';
  if (status === undefined) return 'network_error';
  return 'server_error';
};

interface FeedbackFormProps {
  /**
   * Called after a successful submit — lets a host bottom sheet dismiss itself
   * once the feedback lands. The full-screen route omits it (stays open).
   */
  onSubmitted?: () => void;
  /**
   * `true` makes the form fill its parent (full-screen route, submit pinned to
   * the bottom). Omit inside a content-sized bottom sheet so it hugs content.
   */
  fill?: boolean;
}

/**
 * Feedback form body — category + message + optional rating + submit. Owns its
 * own field state, mutation, and toasts so it can be dropped into either the
 * full-screen FeedbackScreen or the FeedbackSheet bottom sheet unchanged.
 */
export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  onSubmitted,
  fill = false,
}) => {
  const { t } = useTranslation();

  const [category, setCategory] = useState<FeedbackCategory>('general');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | null>(null);

  const trimmedMessage = message.trim();
  const canSubmit = trimmedMessage.length > 0;

  const resetForm = () => {
    setCategory('general');
    setMessage('');
    setRating(null);
  };

  const submitMutation = useMutation({
    mutationFn: () => {
      const payload: FeedbackSubmitRequest = {
        category,
        message: trimmedMessage,
        platform: Platform.OS === 'android' ? 'android' : 'ios',
        // `rating` and `app_version` intentionally omitted when unknown — the
        // backend treats absent as "not provided" (never send null).
        ...(rating ? { rating } : {}),
      };
      return feedbackService.submitFeedback(payload);
    },
    onSuccess: () => {
      // PII rule: only category + rating leave the device, never the message.
      track('feedback_submitted', {
        category,
        ...(rating ? { rating } : {}),
      });
      toast.show({
        type: 'success',
        text1: t('feedback.success'),
        position: 'bottom',
        visibilityTime: 3000,
      });
      resetForm();
      onSubmitted?.();
    },
    onError: (error: unknown) => {
      const errorCode = resolveErrorCode(error);
      track('feedback_submit_failed', { error_code: errorCode });
      toast.show({
        type: 'error',
        text1:
          errorCode === 'rate_limited'
            ? t('feedback.error_rate_limit')
            : t('feedback.error_generic'),
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  const handleSubmit = () => {
    if (!canSubmit || submitMutation.isPending) return;
    Keyboard.dismiss();
    submitMutation.mutate();
  };

  const categoryOptions = useMemo(
    () =>
      CATEGORIES.map(value => ({
        value,
        label: buildCategoryLabel(t, value),
      })),
    [t],
  );

  return (
    <KeyboardAvoidingView
      style={fill ? styles.fillRoot : styles.shrinkRoot}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        testID="feedback-scroll"
        style={fill ? styles.fillRoot : styles.shrinkRoot}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>{t('feedback.subtitle')}</Text>

        {/* Category pills */}
        <View style={styles.categoryRow}>
          {categoryOptions.map(option => {
            const selected = option.value === category;
            return (
              <TouchableOpacity
                key={option.value}
                testID={`feedback-category-${option.value}`}
                accessibilityLabel={option.label}
                activeOpacity={0.82}
                style={[
                  styles.categoryPill,
                  selected && styles.categoryPillActive,
                ]}
                onPress={() => setCategory(option.value)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    selected && styles.categoryPillTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Message */}
        <Text style={styles.fieldLabel}>{t('feedback.message_label')}</Text>
        <TextInput
          testID="feedback-message-input"
          style={styles.messageInput}
          value={message}
          onChangeText={setMessage}
          placeholder={t('feedback.message_placeholder')}
          placeholderTextColor={theme.colors.figmaTextSecondary}
          multiline
          maxLength={MESSAGE_MAX_LENGTH}
          textAlignVertical="top"
        />
        <Text style={styles.counter} testID="feedback-message-counter">
          {message.length}/{MESSAGE_MAX_LENGTH}
        </Text>

        {/* Rating (optional) */}
        <Text style={styles.fieldLabel}>{t('feedback.rating_label')}</Text>
        <View style={styles.ratingRow}>
          {RATING_VALUES.map(value => {
            const filled = rating !== null && value <= rating;
            return (
              <TouchableOpacity
                key={value}
                testID={`feedback-rating-${value}`}
                accessibilityLabel={t('feedback.a11y_rate_stars', {
                  count: value,
                })}
                activeOpacity={0.7}
                style={styles.starButton}
                // Tapping the active star clears the rating (optional field).
                onPress={() =>
                  setRating(prev => (prev === value ? null : value))
                }
              >
                <Text
                  style={[styles.star, filled && styles.starFilled]}
                  allowFontScaling={false}
                >
                  {filled ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <PillButton
          testID="feedback-submit"
          accessibilityLabel={t('feedback.submit')}
          title={t('feedback.submit')}
          variant="filled"
          disabled={!canSubmit}
          loading={submitMutation.isPending}
          onPress={handleSubmit}
          style={styles.submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  fillRoot: {
    flex: 1,
  },
  shrinkRoot: {
    flexShrink: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.l,
    paddingTop: theme.spacing.s,
    paddingBottom: theme.spacing.xl,
  },
  subtitle: {
    ...theme.typography.aliases.uacBodyMdRegular,
    color: theme.colors.figmaTextSecondary,
    marginBottom: theme.spacing.l,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s,
    marginBottom: theme.spacing.l,
  },
  categoryPill: {
    paddingVertical: theme.spacing.s,
    paddingHorizontal: theme.spacing.m,
    borderRadius: theme.borderRadius.uacRadioPill,
    borderWidth: 1,
    borderColor: theme.colors.figmaListDivider,
    backgroundColor: theme.colors.figmaSurface,
  },
  categoryPillActive: {
    backgroundColor: theme.colors.uacBackgroundBase,
    borderColor: theme.colors.uacBackgroundBase,
  },
  categoryPillText: {
    ...theme.typography.aliases.uacBodyXsMedium,
    color: theme.colors.uacTextBase,
  },
  categoryPillTextActive: {
    color: theme.colors.uacTextPrimaryBase,
  },
  fieldLabel: {
    ...theme.typography.aliases.interMediumSm,
    color: theme.colors.uacTextBase,
    marginBottom: theme.spacing.s,
  },
  messageInput: {
    ...theme.typography.aliases.uacBodyMdRegular,
    color: theme.colors.uacTextBase,
    minHeight: 140,
    borderWidth: 1,
    borderColor: theme.colors.figmaListDivider,
    borderRadius: theme.borderRadius.uacTextField,
    padding: theme.spacing.m,
    backgroundColor: theme.colors.figmaSurface,
  },
  counter: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaTextSecondary,
    alignSelf: 'flex-end',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.l,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: theme.spacing.s,
  },
  starButton: {
    padding: theme.spacing.xs,
  },
  star: {
    fontSize: 32,
    lineHeight: 38,
    color: theme.colors.figmaListDivider,
  },
  starFilled: {
    color: theme.colors.uacBackgroundBase,
  },
  submit: {
    marginTop: theme.spacing.l,
  },
});
