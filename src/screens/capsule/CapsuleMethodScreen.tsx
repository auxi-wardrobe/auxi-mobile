import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import {
  MButton,
  MDivider,
  MInput,
  toast,
} from '../../components/design-system/lib';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import {
  trackCapsuleBuildMethodSelected,
  trackCapsuleCreated,
} from '../../services/analytics';
import type { AppStackParamList } from '../../types/navigation';
import { useCreateCapsule } from './hooks';
import { isCapsuleNameValid } from './capsule-format';
import { toastCapsuleNetworkError } from './capsule-toast';
import { BuildMethodOption } from './components/BuildMethodOption';
import { capsuleStyles as s } from './styles';

type Nav = NativeStackNavigationProp<AppStackParamList, 'CapsuleMethod'>;
type Rt = RouteProp<AppStackParamList, 'CapsuleMethod'>;

/** The two build paths. Only `manual` is buildable today. */
type BuildMethod = 'manual' | 'ai';

/**
 * Create wizard — Step 2: "Choose how to build your capsule".
 *
 * "Build it myself" creates an EMPTY capsule (name only) and drops the user on
 * its detail screen, where they add pieces from wardrobe / favourites /
 * creations. "Let AI build it" is tagged Coming soon: it stays tappable so the
 * tap is a demand signal (`capsule_build_method_selected`), but it can't be
 * selected — the requirements + generating screens it needs are parked.
 */
export const CapsuleMethodScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();

  const [name, setName] = useState(route.params.name);
  const [draftName, setDraftName] = useState(route.params.name);
  const [editingName, setEditingName] = useState(false);
  const [method, setMethod] = useState<BuildMethod>('manual');
  const create = useCreateCapsule();

  // Inline rename: the pencil swaps the name row for a field, the tick (or the
  // keyboard's return key) commits. A blank/whitespace name is rejected —
  // revert to the last good value rather than creating an unnamed capsule.
  const commitName = () => {
    const trimmed = draftName.trim();
    if (isCapsuleNameValid(trimmed)) {
      setName(trimmed);
    } else {
      setDraftName(name);
    }
    setEditingName(false);
  };

  const startEditingName = () => {
    setDraftName(name);
    setEditingName(true);
  };

  const selectAi = () => {
    // Not selectable yet — tell the user why, and record the interest.
    trackCapsuleBuildMethodSelected('ai');
    toast.show({
      type: 'info',
      text1: t('capsule.method_ai_coming_soon_toast'),
      testID: 'capsule-method-ai-toast',
    });
  };

  const handleNext = () => {
    if (create.isPending) {
      return;
    }
    trackCapsuleBuildMethodSelected(method);
    create.mutate(
      { name },
      {
        onSuccess: capsule => {
          trackCapsuleCreated({ method, status: capsule.status });
          navigation.replace('CapsuleDetail', { capsuleId: capsule.id });
        },
        onError: () => toastCapsuleNetworkError(t),
      },
    );
  };

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <Header.BackTitle
        title={t('capsule.method_title')}
        leftTestID="capsule-method-back"
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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.methodNameRow}>
            {editingName ? (
              <View style={s.flex1}>
                <MInput
                  value={draftName}
                  onChangeText={setDraftName}
                  placeholder={t('capsule.name_placeholder')}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={commitName}
                  testID="capsule-method-name-input"
                  accessibilityLabel={t('capsule.name_label')}
                />
              </View>
            ) : (
              <Text style={s.methodName} numberOfLines={1}>
                {name}
              </Text>
            )}
            <Pressable
              style={s.methodNameEdit}
              onPress={editingName ? commitName : startEditingName}
              testID={
                editingName
                  ? 'capsule-method-name-edit-done'
                  : 'capsule-method-name-edit'
              }
              accessibilityRole="button"
              accessibilityLabel={
                editingName
                  ? t('capsule.a11y_save_name')
                  : t('capsule.a11y_edit_name')
              }
            >
              {editingName ? (
                <Icons.CheckCircle
                  width={24}
                  height={24}
                  color={theme.colors.figmaTextDark}
                />
              ) : (
                <Icons.Edit
                  width={24}
                  height={24}
                  color={theme.colors.figmaTextDark}
                />
              )}
            </Pressable>
          </View>
          <MDivider />

          <BuildMethodOption
            icon={
              <Icons.User
                width={24}
                height={24}
                color={theme.colors.figmaTextDark}
              />
            }
            title={t('capsule.method_manual_title')}
            description={t('capsule.method_manual_desc')}
            selected={method === 'manual'}
            onSelect={() => setMethod('manual')}
            testID="capsule-method-manual"
          />
          <BuildMethodOption
            icon={
              <Icons.Sparkle
                width={24}
                height={24}
                color={theme.colors.figmaAiSparkle}
              />
            }
            title={t('capsule.method_ai_title')}
            description={t('capsule.method_ai_desc')}
            badgeLabel={t('capsule.method_coming_soon')}
            selected={false}
            onSelect={selectAi}
            divider={false}
            testID="capsule-method-ai"
          />
        </ScrollView>

        <View style={s.footerRow}>
          <View style={s.footerRowSecondary}>
            <MButton
              variant="text"
              onPress={() => navigation.navigate('Wardrobe')}
              testID="capsule-method-cancel"
            >
              {t('capsule.cancel')}
            </MButton>
          </View>
          <View style={s.footerRowPrimary}>
            <MButton
              variant="primary"
              onPress={handleNext}
              loading={create.isPending}
              disabled={!isCapsuleNameValid(name)}
              testID="capsule-method-next"
            >
              {t('capsule.next')}
            </MButton>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
