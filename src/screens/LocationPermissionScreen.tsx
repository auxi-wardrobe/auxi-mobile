import React, { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  PillButton,
  TopIconButton,
} from '../components/primitives/FigmaPrimitives';
import { theme } from '../theme/theme';
import { requestLocationPermission } from '../utils/location';
import { AppStackParamList } from '../types/navigation';
import { track } from '../services/analytics';

type Navigation = NativeStackNavigationProp<
  AppStackParamList,
  'LocationPermission'
>;

export const LocationPermissionScreen = () => {
  const navigation = useNavigation<Navigation>();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  // Both location-permission outcomes funnel into the first wardrobe-direction
  // step (OnboardingWardrobe). Skipping straight to the fit picker would
  // silently default wardrobe_direction to "Mixed", which violates the V05
  // spec contract requiring an explicit direction pick. AU-249.
  const goToOnboarding = () => navigation.navigate('OnboardingWardrobe');

  useFocusEffect(
    useCallback(() => {
      track('onboarding_step_viewed', {
        step_name: 'location_permission',
        step_index: 2,
      });
    }, []),
  );

  const handleEnableLocation = async () => {
    setLoading(true);
    track('location_permission_requested');
    try {
      const hasPermission = await requestLocationPermission();
      if (hasPermission) {
        track('location_permission_granted');
        goToOnboarding();
      } else {
        track('location_permission_denied', { permission_status: 'denied' });
        Alert.alert(
          t('locationPermission.denied_title'),
          t('locationPermission.denied_body'),
          [
            {
              text: t('locationPermission.continue_without'),
              style: 'cancel',
              onPress: goToOnboarding,
            },
            {
              text: t('locationPermission.open_settings'),
              onPress: () => Linking.openSettings(),
            },
          ],
        );
      }
    } catch (error) {
      console.error(error);
      goToOnboarding();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TopIconButton
          onPress={() => navigation.goBack()}
          icon={<Text style={styles.backGlyph}>‹</Text>}
        />

        <View style={styles.mainBlock}>
          <Text style={styles.title}>{t('locationPermission.intro')}</Text>

          <View style={styles.actions}>
            <PillButton
              title={t('locationPermission.allow_access')}
              variant="outline"
              loading={loading}
              onPress={handleEnableLocation}
              testID="onboarding-location-allow"
            />
            {/* TODO: not in Figma — needs product decision */}
            <PillButton
              title={t('locationPermission.not_now')}
              variant="text"
              onPress={goToOnboarding}
              style={styles.notNowButton}
              testID="onboarding-location-skip"
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingTop: 6,
    paddingBottom: 36,
  },
  backGlyph: {
    color: theme.colors.figmaAction,
    fontSize: 34,
    lineHeight: 34,
    marginTop: -2,
  },
  mainBlock: {
    marginTop: 133,
    gap: 48,
  },
  title: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.figmaText,
    textAlign: 'left',
  },
  actions: {
    gap: 8,
  },
  notNowButton: {
    alignSelf: 'center',
  },
});
