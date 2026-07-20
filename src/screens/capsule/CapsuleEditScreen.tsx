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
import type {
  CapsuleRequirements,
  UpdateCapsuleInput,
} from '../../services/capsuleService';
import type { AppStackParamList } from '../../types/navigation';
import { useCapsule, useUpdateCapsule } from './hooks';
import { numToStr, toNum } from './capsule-format';
import { toastCapsuleNetworkError } from './capsule-toast';
import { capsuleStyles as s } from './styles';

type Nav = NativeStackNavigationProp<AppStackParamList, 'CapsuleEdit'>;
type Rt = RouteProp<AppStackParamList, 'CapsuleEdit'>;

/** The 5 numeric constraint keys shared by requirements + the PATCH body. */
const CONSTRAINT_KEYS = [
  'temp_min',
  'temp_max',
  'formalness_level',
  'outfit_target',
  'shoe_limit',
] as const;

/**
 * Edit capsule — prefilled name + the 5 requirement fields (reuses the
 * CapsuleInfo field layout). Save PATCHes only changed fields; the backend
 * regenerates outfits when any constraint changed (design revision §9.2).
 */
export const CapsuleEditScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { capsuleId } = route.params;

  const { data: capsule, isLoading } = useCapsule(capsuleId);
  const update = useUpdateCapsule(capsuleId);

  const [name, setName] = useState('');
  const [tempMin, setTempMin] = useState('');
  const [tempMax, setTempMax] = useState('');
  const [outfitTarget, setOutfitTarget] = useState('');
  const [formalness, setFormalness] = useState('');
  const [shoeLimit, setShoeLimit] = useState('');
  const [prefilled, setPrefilled] = useState(false);

  // Prefill once the capsule detail loads (or arrives from cache).
  useEffect(() => {
    if (!capsule || prefilled) {
      return;
    }
    const r = capsule.requirements;
    setName(capsule.name ?? '');
    setTempMin(numToStr(r?.temp_min));
    setTempMax(numToStr(r?.temp_max));
    setFormalness(numToStr(r?.formalness_level));
    setOutfitTarget(numToStr(r?.outfit_target));
    setShoeLimit(numToStr(r?.shoe_limit));
    setPrefilled(true);
  }, [capsule, prefilled]);

  const handleSave = () => {
    if (!capsule) {
      return;
    }
    const r: CapsuleRequirements = capsule.requirements;
    const next: Record<(typeof CONSTRAINT_KEYS)[number], number | null> = {
      temp_min: toNum(tempMin),
      temp_max: toNum(tempMax),
      formalness_level: toNum(formalness),
      outfit_target: toNum(outfitTarget),
      shoe_limit: toNum(shoeLimit),
    };

    const patch: UpdateCapsuleInput = {};
    let changedConstraints = false;

    const trimmedName = name.trim();
    if (trimmedName && trimmedName !== capsule.name) {
      patch.name = trimmedName;
    }
    CONSTRAINT_KEYS.forEach(key => {
      if (next[key] !== (r?.[key] ?? null)) {
        patch[key] = next[key];
        changedConstraints = true;
      }
    });

    // Nothing changed — skip the round-trip, just return.
    if (Object.keys(patch).length === 0) {
      navigation.goBack();
      return;
    }

    update.mutate(patch, {
      onSuccess: () => {
        trackCapsuleSettingsEdited(changedConstraints);
        toast.success(t('capsule.settings_updated_toast'));
        navigation.goBack();
      },
      onError: () => toastCapsuleNetworkError(t),
    });
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
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.fieldLabel}>{t('capsule.name_label')}</Text>
            <MInput
              value={name}
              onChangeText={setName}
              placeholder={t('capsule.name_placeholder')}
              testID="capsule-edit-name"
            />

            <Text style={s.fieldLabel}>{t('capsule.temp_range_label')}</Text>
            <View style={s.rowInputs}>
              <View style={s.flex1}>
                <MInput
                  value={tempMin}
                  onChangeText={setTempMin}
                  placeholder={t('capsule.temp_min_placeholder')}
                  keyboardType="number-pad"
                  testID="capsule-edit-temp-min"
                />
              </View>
              <View style={s.flex1}>
                <MInput
                  value={tempMax}
                  onChangeText={setTempMax}
                  placeholder={t('capsule.temp_max_placeholder')}
                  keyboardType="number-pad"
                  testID="capsule-edit-temp-max"
                />
              </View>
            </View>

            <Text style={s.fieldLabel}>{t('capsule.outfit_count_label')}</Text>
            <MInput
              value={outfitTarget}
              onChangeText={setOutfitTarget}
              keyboardType="number-pad"
              testID="capsule-edit-outfit-target"
            />

            <Text style={s.fieldLabel}>{t('capsule.formalness_label')}</Text>
            <MInput
              value={formalness}
              onChangeText={setFormalness}
              keyboardType="number-pad"
              testID="capsule-edit-formalness"
            />

            <Text style={s.fieldLabel}>{t('capsule.shoe_limit_label')}</Text>
            <MInput
              value={shoeLimit}
              onChangeText={setShoeLimit}
              keyboardType="number-pad"
              testID="capsule-edit-shoe-limit"
            />
          </ScrollView>
          <View style={s.footerCta}>
            <MButton
              variant="primary"
              onPress={handleSave}
              loading={update.isPending}
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
