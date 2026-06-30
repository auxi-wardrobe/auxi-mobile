import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { BottomSheetSurface } from '../../components/primitives/FigmaPrimitives';
import { Header } from '../../components/layout/Header';
import { SettingsDialog } from '../../components/settings/SettingsDialog';
import { RadioOptionList } from '../../components/settings/RadioOptionList';
import {
  SettingsGroup,
  SettingsRow,
} from '../../components/settings/SettingsList';
import { SelectedChips } from '../../onboarding/v2/SelectedChips';
import { selectionChipLabels } from '../../onboarding/config';
import { Icons } from '../../assets/icons';
import { useAuth } from '../../context/AuthContext';
import { AppStackParamList, V05OnboardingSelection } from '../../types/navigation';
import { theme } from '../../theme/theme';
import { useSettingsController } from './useSettingsController';
import { LANGUAGE_LABEL_MAP, LANGUAGE_OPTIONS } from './settingsShared';
import type { Language } from '../../translations';

type Navigation = NativeStackNavigationProp<
  AppStackParamList,
  'PersonalizationSettings'
>;

// 5 · Personalization — Style Direction (onboarding profile), Language,
// Manage Body Photo.
export const PersonalizationSettingsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const { user } = useAuth();
  const { currentLanguage, applyLanguage, isSavingLanguage } =
    useSettingsController();

  // Stored onboarding answers (loosely typed in metadata) → the strongly-typed
  // selection the chips + review screen consume. Absent until a user completes
  // onboarding or a retake.
  const profile = user?.user_metadata?.onboarding_profile;
  const selection = profile
    ? ({
        wardrobe_direction: profile.wardrobe_direction,
        fit_preference: profile.fit_preference,
        // Defensive: a partial/legacy profile must not crash the chips row.
        style_preferences: profile.style_preferences ?? [],
      } as V05OnboardingSelection)
    : null;
  const chips = selection ? selectionChipLabels(selection) : [];

  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [pendingLanguage, setPendingLanguage] =
    useState<Language>(currentLanguage);

  const openLanguageModal = () => {
    setPendingLanguage(currentLanguage);
    setLanguageModalVisible(true);
  };

  const closeLanguageModal = () => {
    if (isSavingLanguage) return;
    setLanguageModalVisible(false);
  };

  const onApplyLanguage = async () => {
    const ok = await applyLanguage(pendingLanguage);
    if (ok) setLanguageModalVisible(false);
  };

  // With a saved profile → review it (read-only, Save disabled). Without one →
  // start the quiz directly (nothing to review / replace).
  const openStyleDirection = () => {
    if (selection) {
      navigation.navigate('StyleDirectionReview', { selection, changed: false });
    } else {
      navigation.navigate('OnboardingWardrobe', { flow: 'retake' });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BottomSheetSurface style={styles.sheet}>
        <Header.BackTitle
          title={t('settings.personalization')}
          background="transparent"
          leftTestID="personalization-back-button"
          onBack={() => navigation.goBack()}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <SettingsGroup>
            {/* Style Direction — label + selected chips (or a set-up prompt),
                drilling into the review / retake flow. Custom row because the
                chips wrap below the label. */}
            <TouchableOpacity
              testID="settings-style-direction-row"
              accessibilityLabel={t('settings.style_direction')}
              activeOpacity={0.82}
              style={styles.styleRow}
              onPress={openStyleDirection}
            >
              <View style={styles.styleRowMain}>
                <Text style={styles.styleRowLabel}>
                  {t('settings.style_direction')}
                </Text>
                {selection ? (
                  <SelectedChips
                    labels={chips}
                    testID="settings-style-direction-chips"
                  />
                ) : (
                  <Text style={styles.styleRowSetup}>
                    {t('settings.style_direction_setup')}
                  </Text>
                )}
              </View>
              <Icons.ChevronRight
                width={20}
                height={20}
                color={theme.colors.figmaOnboardingStepLabel}
              />
            </TouchableOpacity>

            <SettingsRow
              label={t('settings.language')}
              value={LANGUAGE_LABEL_MAP[currentLanguage]}
              chevron
              testID="settings-language-row"
              accessibilityLabel={t('settings.a11y_change_language')}
              onPress={openLanguageModal}
            />
            <SettingsRow
              label={t('settings.manage_body_photo')}
              chevron
              testID="settings-manage-body-row"
              onPress={() =>
                navigation.navigate('Body', { mode: 'photoDetail' })
              }
            />
          </SettingsGroup>
        </ScrollView>
      </BottomSheetSurface>

      <SettingsDialog
        visible={languageModalVisible}
        onClose={closeLanguageModal}
        isBusy={isSavingLanguage}
        title={t('settings.dialog_language_title')}
        primaryLabel={t('settings.update')}
        primaryVariant="default"
        onPrimary={onApplyLanguage}
        cancelTestID="settings-language-cancel"
        primaryTestID="settings-language-update"
      >
        <RadioOptionList
          options={LANGUAGE_OPTIONS}
          selected={pendingLanguage}
          onSelect={setPendingLanguage}
          testIDPrefix="settings-language-option"
        />
      </SettingsDialog>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaSurface,
  },
  sheet: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  styleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
  },
  styleRowMain: {
    flex: 1,
    gap: 10,
  },
  styleRowLabel: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
  },
  styleRowSetup: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaOnboardingStepLabel,
  },
});
