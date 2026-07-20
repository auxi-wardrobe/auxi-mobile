import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/layout/Header';
import { MButton, MInput } from '../../components/design-system/lib';
import { trackCapsuleConfigured } from '../../services/analytics';
import type { AppStackParamList } from '../../types/navigation';
import { toNum } from './capsule-format';
import { capsuleStyles as s } from './styles';

type Nav = NativeStackNavigationProp<AppStackParamList, 'CapsuleInfo'>;
type Rt = RouteProp<AppStackParamList, 'CapsuleInfo'>;

/** Create wizard — Step 2: requirements. Create → generating screen. */
export const CapsuleInfoScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { name } = route.params;

  const [tempMin, setTempMin] = useState('');
  const [tempMax, setTempMax] = useState('');
  const [outfitTarget, setOutfitTarget] = useState('');
  const [formalness, setFormalness] = useState('');
  const [shoeLimit, setShoeLimit] = useState('');

  const handleCreate = () => {
    const temp_min = toNum(tempMin);
    const temp_max = toNum(tempMax);
    const formalness_level = toNum(formalness);
    const outfit_target = toNum(outfitTarget);
    const shoe_limit = toNum(shoeLimit);

    trackCapsuleConfigured({
      has_temp_range: temp_min !== null && temp_max !== null,
      ...(formalness_level !== null ? { formalness_level } : {}),
      ...(outfit_target !== null ? { outfit_target } : {}),
      ...(shoe_limit !== null ? { shoe_limit } : {}),
    });

    navigation.navigate('CapsuleGenerating', {
      name,
      temp_min,
      temp_max,
      formalness_level,
      outfit_target,
      shoe_limit,
    });
  };

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <Header.BackTitle
        title={t('capsule.info_title')}
        leftTestID="capsule-info-back"
        leftAccessibilityLabel={t('capsule.a11y_back')}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={s.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={s.flex1}
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.fieldLabel}>{t('capsule.temp_range_label')}</Text>
          <View style={s.rowInputs}>
            <View style={s.flex1}>
              <MInput
                value={tempMin}
                onChangeText={setTempMin}
                placeholder={t('capsule.temp_min_placeholder')}
                keyboardType="number-pad"
                testID="capsule-info-temp-min"
              />
            </View>
            <View style={s.flex1}>
              <MInput
                value={tempMax}
                onChangeText={setTempMax}
                placeholder={t('capsule.temp_max_placeholder')}
                keyboardType="number-pad"
                testID="capsule-info-temp-max"
              />
            </View>
          </View>

          <Text style={s.fieldLabel}>{t('capsule.outfit_count_label')}</Text>
          <MInput
            value={outfitTarget}
            onChangeText={setOutfitTarget}
            keyboardType="number-pad"
            testID="capsule-info-outfit-target"
          />

          <Text style={s.fieldLabel}>{t('capsule.formalness_label')}</Text>
          <MInput
            value={formalness}
            onChangeText={setFormalness}
            keyboardType="number-pad"
            testID="capsule-info-formalness"
          />

          <Text style={s.fieldLabel}>{t('capsule.shoe_limit_label')}</Text>
          <MInput
            value={shoeLimit}
            onChangeText={setShoeLimit}
            keyboardType="number-pad"
            testID="capsule-info-shoe-limit"
          />
        </ScrollView>
        <View style={s.footerCta}>
          <MButton
            variant="primary"
            onPress={handleCreate}
            testID="capsule-info-create"
          >
            {t('capsule.create')}
          </MButton>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
