import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/layout/Header';
import { MButton, MInput, toast } from '../../components/design-system/lib';
import { MacgieLoader } from '../../components/macgie';
import { trackCapsuleSettingsEdited } from '../../services/analytics';
import type { AppStackParamList } from '../../types/navigation';
import { useCapsule, useUpdateCapsule } from './hooks';
import { isCapsuleNameValid } from './capsule-format';
import { toastCapsuleNetworkError } from './capsule-toast';
import { capsuleStyles as s } from './styles';

type Nav = NativeStackNavigationProp<AppStackParamList, 'CapsuleEdit'>;
type Rt = RouteProp<AppStackParamList, 'CapsuleEdit'>;

/**
 * Edit capsule — the name, and only the name.
 *
 * The 5 numeric requirements (temp range, outfit target, formalness, shoe
 * limit) drove AI generation; with "Let AI build it" still Coming soon there's
 * nothing to regenerate, so editing them would be a promise the app can't keep.
 * Save PATCHes `{ name }` — never a constraint — hence
 * `capsule_settings_edited.changed_constraints` is always false here.
 */
export const CapsuleEditScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { capsuleId } = route.params;

  const { data: capsule, isLoading } = useCapsule(capsuleId);
  const update = useUpdateCapsule(capsuleId);

  const [name, setName] = useState('');
  const [prefilled, setPrefilled] = useState(false);

  // Prefill once the capsule detail loads (or arrives from cache).
  useEffect(() => {
    if (!capsule || prefilled) {
      return;
    }
    setName(capsule.name ?? '');
    setPrefilled(true);
  }, [capsule, prefilled]);

  const handleSave = () => {
    if (!capsule) {
      return;
    }
    const trimmedName = name.trim();

    // Unchanged (or blank) — skip the round-trip, just return.
    if (!isCapsuleNameValid(trimmedName) || trimmedName === capsule.name) {
      navigation.goBack();
      return;
    }

    update.mutate(
      { name: trimmedName },
      {
        onSuccess: () => {
          trackCapsuleSettingsEdited(false);
          toast.success(t('capsule.settings_updated_toast'));
          navigation.goBack();
        },
        onError: () => toastCapsuleNetworkError(t),
      },
    );
  };

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <Header.BackTitle
        title={t('capsule.edit_title')}
        leftTestID="capsule-edit-back"
        leftAccessibilityLabel={t('capsule.a11y_back')}
        onBack={() => navigation.goBack()}
      />

      {isLoading || !capsule ? (
        <View style={s.centerFill}>
          <MacgieLoader testID="capsule-edit-loading" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={s.flex1}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={s.flex1}
            contentContainerStyle={s.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.fieldLabel}>{t('capsule.name_label')}</Text>
            <MInput
              value={name}
              onChangeText={setName}
              placeholder={t('capsule.name_placeholder')}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              testID="capsule-edit-name"
            />
          </ScrollView>
          <View style={s.footerCta}>
            <MButton
              variant="primary"
              onPress={handleSave}
              loading={update.isPending}
              disabled={!isCapsuleNameValid(name)}
              testID="capsule-edit-save"
            >
              {t('capsule.save')}
            </MButton>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};
