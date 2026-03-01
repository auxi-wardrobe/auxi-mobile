import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type GenderPreferenceValue = 'womenswear' | 'menswear' | 'mixed';

export type AppStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Home: undefined;
  Settings: undefined;
  Wardrobe: undefined;
  Body: undefined;
  Welcome: undefined;
  LocationPermission: undefined;
  GenderPreference: undefined;
  StylePreference: { gender?: GenderPreferenceValue } | undefined;
  ItemDetail: { itemId: string };
};
