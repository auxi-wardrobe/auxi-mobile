import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  ItemDetail: { itemId: string };
  Welcome: undefined;
  StylePreference: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
};
