import React, { useState } from 'react';
import { Alert, Linking, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PillButton, TopIconButton } from '../components/primitives/FigmaPrimitives';
import { theme } from '../theme/theme';
import { requestLocationPermission } from '../utils/location';
import { AppStackParamList } from '../types/navigation';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'LocationPermission'>;

export const LocationPermissionScreen = () => {
  const navigation = useNavigation<Navigation>();
  const [loading, setLoading] = useState(false);

  const goToGenderPreference = () => navigation.navigate('GenderPreference');
  const skipToStylePreference = () => navigation.navigate('StylePreference');

  const handleEnableLocation = async () => {
    setLoading(true);
    try {
      const hasPermission = await requestLocationPermission();
      if (hasPermission) {
        goToGenderPreference();
      } else {
        Alert.alert(
          'Permission Denied',
          'We need location permission to suggest outfits based on local weather. Please enable it in settings.',
          [
            { text: 'Cancel', style: 'cancel', onPress: skipToStylePreference },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
      }
    } catch (error) {
      console.error(error);
      skipToStylePreference();
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
          <Text style={styles.title}>To suggest outfits that fit the weather and local style</Text>

          <View style={styles.actions}>
            <PillButton
              title="Enable location"
              variant="outline"
              loading={loading}
              onPress={handleEnableLocation}
            />
            <PillButton
              title="Not now"
              variant="text"
              onPress={skipToStylePreference}
              style={styles.notNowButton}
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
    flex: 1,
    justifyContent: 'flex-end',
    gap: 48,
  },
  title: {
    ...theme.typography.aliases.playfairDisplaySection,
    color: theme.colors.figmaText,
    textAlign: 'center',
  },
  actions: {
    gap: 8,
  },
  notNowButton: {
    alignSelf: 'center',
  },
});
