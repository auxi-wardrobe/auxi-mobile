import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/layout/Header';
import { MButton, MInput } from '../../components/design-system/lib';
import type { AppStackParamList } from '../../types/navigation';
import { isCapsuleNameValid } from './capsule-format';
import { capsuleStyles as s } from './styles';

type Nav = NativeStackNavigationProp<AppStackParamList, 'CapsuleCreate'>;

/** Create wizard — Step 1: name entry. Continue → CapsuleInfo (requirements). */
export const CapsuleCreateScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const [name, setName] = useState('');

  const canContinue = isCapsuleNameValid(name);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <Header.BackTitle
        title={t('capsule.create_title')}
        leftTestID="capsule-create-back"
        leftAccessibilityLabel={t('capsule.a11y_back')}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={s.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.body}>
          <MInput
            value={name}
            onChangeText={setName}
            label={t('capsule.name_label')}
            placeholder={t('capsule.name_placeholder')}
            testID="capsule-create-name-input"
          />
        </View>
        <View style={s.footerCta}>
          <MButton
            variant="primary"
            onPress={() =>
              navigation.navigate('CapsuleInfo', { name: name.trim() })
            }
            disabled={!canContinue}
            testID="capsule-create-continue"
          >
            {t('capsule.continue')}
          </MButton>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
