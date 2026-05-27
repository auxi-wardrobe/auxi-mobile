import React, { useState } from 'react';
import {
  Alert,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  PillButton,
  TopIconButton,
} from '../components/primitives/FigmaPrimitives';
import { theme } from '../theme/theme';
import { requestLocationPermission } from '../utils/location';
import { AppStackParamList } from '../types/navigation';

type Navigation = NativeStackNavigationProp<
  AppStackParamList,
  'LocationPermission'
>;

export const LocationPermissionScreen = () => {
  const navigation = useNavigation<Navigation>();
  const [loading, setLoading] = useState(false);

  // Both location-permission outcomes funnel into the first wardrobe-direction
  // step (OnboardingWardrobe). Skipping straight to the fit picker would
  // silently default wardrobe_direction to "Mixed", which violates the V05
  // spec contract requiring an explicit direction pick. AU-249.
  const goToOnboarding = () => navigation.navigate('OnboardingWardrobe');

  const handleEnableLocation = async () => {
    setLoading(true);
    try {
      const hasPermission = await requestLocationPermission();
      if (hasPermission) {
        goToOnboarding();
      } else {
        Alert.alert(
          'Permission Denied',
          'We need location permission to suggest outfits based on local weather. Please enable it in settings.',
          [
            {
              text: 'Continue without location',
              style: 'cancel',
              onPress: goToOnboarding,
            },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
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
          <Text style={styles.title}>
            To suggest an outfit that works today, I need your local weather.
          </Text>

          <View style={styles.actions}>
            <PillButton
              title="Allow weather access"
              variant="outline"
              loading={loading}
              onPress={handleEnableLocation}
              testID="onboarding-location-allow"
            />
            {/* TODO: not in Figma — needs product decision */}
            <PillButton
              title="Not now"
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
    paddingHorizontal: 22,
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
    ...theme.typography.aliases.poppinsBody,
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
