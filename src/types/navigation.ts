import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type GenderPreferenceValue = 'womenswear' | 'menswear' | 'mixed';

export interface TryOnOutfitContext {
  outfitHash: string;
  itemIds: string[];
  itemImageUrls: string[];
  stylingNote: string;
}

export type AppStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Home: undefined;
  Settings: undefined;
  Wardrobe: undefined;
  Body:
    | {
        mode?: 'manage' | 'tryOn';
        outfit?: TryOnOutfitContext;
      }
    | undefined;
  Welcome: undefined;
  LocationPermission: undefined;
  GenderPreference: undefined;
  StylePreference: { gender?: GenderPreferenceValue } | undefined;
  ItemDetail: { itemId: string };
  Database: undefined;
  OutfitCanvas: {
    outfitId?: string;
    items?: Array<{ id: string; imageUrl: string }>;
  } | undefined;
};
