import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from '../../components/layout/Header';
import { MButton, toast } from '../../components/design-system/lib';
import { MacgieLoader } from '../../components/macgie';
import {
  capsuleKeys,
  capsuleService,
  type CapsuleFull,
  type CreateCapsuleInput,
} from '../../services/capsuleService';
import { notifyCapsuleReady } from '../../services/capsuleNotifications';
import {
  trackCapsuleGenerated,
  trackCapsuleGenerationBackgrounded,
  trackCapsuleGenerationFailed,
  trackCapsuleGenerationStarted,
} from '../../services/analytics';
import type { AppStackParamList } from '../../types/navigation';
import { classifyCapsuleError } from './capsule-error';
import { capsuleStyles as s } from './styles';

type Nav = NativeStackNavigationProp<AppStackParamList, 'CapsuleGenerating'>;
type Rt = RouteProp<AppStackParamList, 'CapsuleGenerating'>;

const STEP_KEYS = [
  'capsule.step_weather',
  'capsule.step_formalness',
  'capsule.step_items',
] as const;

export const CapsuleGeneratingScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const queryClient = useQueryClient();
  const params = route.params;

  // `left` flips true when the user backgrounds the flow (or the screen
  // unmounts); it decides whether a resolving generation navigates the user or
  // just fires the ready toast + local-notification seam.
  const leftRef = useRef(false);
  const [activeStep, setActiveStep] = useState(0);
  const [failed, setFailed] = useState(false);

  // Cycle the visual progress steps while the (synchronous, fast) backend
  // generation runs. Purely cosmetic — the real signal is the promise.
  useEffect(() => {
    const id = setInterval(
      () => setActiveStep(prev => (prev + 1) % STEP_KEYS.length),
      900,
    );
    return () => clearInterval(id);
  }, []);

  const runGeneration = () => {
    setFailed(false);
    const input: CreateCapsuleInput = {
      name: params.name,
      temp_min: params.temp_min,
      temp_max: params.temp_max,
      formalness_level: params.formalness_level,
      outfit_target: params.outfit_target,
      shoe_limit: params.shoe_limit,
      ...(params.item_ids ? { item_ids: params.item_ids } : {}),
    };
    trackCapsuleGenerationStarted(params.outfit_target ?? undefined);

    // Drive the create imperatively so the promise resolves even after the
    // screen unmounts (background continuation). Cache updates are idempotent.
    capsuleService
      .createCapsule(input)
      .then((capsule: CapsuleFull) => {
        queryClient.invalidateQueries({ queryKey: capsuleKeys.all });
        queryClient.setQueryData(capsuleKeys.detail(capsule.id), capsule);
        trackCapsuleGenerated({
          status: capsule.status,
          item_count: capsule.item_count,
          outfit_count: capsule.outfit_count,
        });
        if (capsule.status === 'failed') {
          if (!leftRef.current) {
            setFailed(true);
          } else {
            toast.show({ type: 'error', text1: t('capsule.failed_title') });
          }
          return;
        }
        if (leftRef.current) {
          toast.success(t('capsule.ready_toast'));
          notifyCapsuleReady(capsule.name);
        } else {
          navigation.replace('CapsuleDetail', { capsuleId: capsule.id });
        }
      })
      .catch((error: unknown) => {
        trackCapsuleGenerationFailed(classifyCapsuleError(error));
        if (!leftRef.current) {
          setFailed(true);
        } else {
          toast.show({ type: 'error', text1: t('capsule.failed_title') });
        }
      });
  };

  // Kick off once on mount.
  useEffect(() => {
    runGeneration();
    return () => {
      leftRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leaveInBackground = () => {
    trackCapsuleGenerationBackgrounded();
    leftRef.current = true;
    navigation.navigate('CapsuleWardrobe');
  };

  if (failed) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <Header.BackTitle
          title={t('capsule.create_title')}
          leftTestID="capsule-generating-back"
          leftAccessibilityLabel={t('capsule.a11y_back')}
          onBack={() => navigation.goBack()}
        />
        <View style={s.generatingWrap}>
          <Text style={s.generatingTitle}>{t('capsule.failed_title')}</Text>
          <MButton
            variant="primary"
            onPress={runGeneration}
            testID="capsule-generation-retry"
          >
            {t('capsule.retry')}
          </MButton>
          <MButton
            variant="secondary"
            onPress={() => navigation.goBack()}
            testID="capsule-generation-edit"
          >
            {t('capsule.edit_settings')}
          </MButton>
          <MButton
            variant="text"
            onPress={() => navigation.navigate('CapsuleWardrobe')}
            testID="capsule-generation-cancel"
          >
            {t('capsule.cancel')}
          </MButton>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.generatingWrap}>
        <MacgieLoader testID="capsule-generating-loader" />
        <Text style={s.generatingTitle}>{t('capsule.generating_title')}</Text>
        {STEP_KEYS.map((key, i) => (
          <View key={key} style={s.stepRow}>
            <Text
              style={[s.stepText, i <= activeStep && s.stepTextActive]}
              testID={`capsule-generating-step-${i}`}
            >
              {t(key)}
            </Text>
          </View>
        ))}
      </View>
      <View style={s.leaveWrap}>
        <MButton
          variant="secondary"
          onPress={leaveInBackground}
          testID="capsule-generating-leave"
        >
          {t('capsule.leave_cta')}
        </MButton>
      </View>
    </SafeAreaView>
  );
};
