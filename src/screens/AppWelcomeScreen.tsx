import React from 'react';
import { Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { PillButton } from '../components/primitives/FigmaPrimitives';
import { theme } from '../theme/theme';
import { WELCOME_COPY } from '../onboarding/config';
import { AppStackParamList } from '../types/navigation';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Welcome'>;

export const AppWelcomeScreen = () => {
  const navigation = useNavigation<Navigation>();
  const { isLoading } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.centerContent}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={styles.textContainer}>
            <Text style={styles.title}>{WELCOME_COPY.title}</Text>
            <Text style={styles.subtitle}>{WELCOME_COPY.subtitle}</Text>
          </View>
        </View>

        <PillButton
          title={WELCOME_COPY.ctaLabel}
          variant="filled"
          loading={isLoading}
          onPress={() => navigation.navigate('LocationPermission')}
          style={styles.cta}
          testID="onboarding-welcome-cta"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Figma background/primary/neutral_50 (#fcfcfd) = uacBackgroundNeutral50.
    backgroundColor: theme.colors.uacBackgroundNeutral50,
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  logo: {
    width: 119,
    height: 119,
    marginBottom: 72,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    ...theme.typography.aliases.uacH1Bold,
    // Figma H1 letter-spacing −0.72 (not baked into the alias — applied inline).
    letterSpacing: -0.72,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
  cta: {
    marginBottom: 6,
    width: 327,
    alignSelf: 'center',
    borderRadius: theme.borderRadius.l,
  },
});
