import React from 'react';
import { Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { PillButton } from '../components/primitives/FigmaPrimitives';
import { theme } from '../theme/theme';
import { AppStackParamList } from '../types/navigation';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Welcome'>;

export const WelcomeScreen = () => {
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
            <Text style={styles.title}>Welcome to{`\n`}auxi</Text>
            <Text style={styles.subtitle}>
              Get outfit suggestions{`\n`}that work for your day.
            </Text>
          </View>
        </View>

        <PillButton
          title="Get started — takes 1 min"
          variant="filled"
          loading={isLoading}
          onPress={() => navigation.navigate('LocationPermission')}
          style={styles.cta}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcfcfd',
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
    fontFamily: 'Poppins-Bold',
    fontSize: 40,
    lineHeight: 52,
    letterSpacing: -0.72,
    color: theme.colors.figmaText,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.figmaText,
    textAlign: 'center',
  },
  cta: {
    marginBottom: 6,
    width: 327,
    alignSelf: 'center',
    borderRadius: 16,
  },
});
