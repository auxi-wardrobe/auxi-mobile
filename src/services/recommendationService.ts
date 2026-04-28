import { apiClient } from './apiClient';
import { Item } from '../types/item';

export interface Outfit {
  items: Item[]; // Assumes Item type matches or is compatible with backend response structure
  styling_note: string;
  outfit_hash: string;
  fallback_flags: string[];
}

export type RecommendationVariationAxis =
  | 'SILHOUETTE'
  | 'LAYERING'
  | 'COLOR'
  | 'NEW_ANCHOR';

export interface RecommendationResponse {
  outfit?: Outfit;
  session_id?: string;
  fallback_flags?: string[];
  variation_axis?: RecommendationVariationAxis;
  fallback?: boolean;
  message?: string;
}

export interface ValenGetRecommendationResponse {
  outfits: Outfit[];
}

export interface StartRecommendationParams {
  weather?: {
    lat?: number;
    long?: number;
    temp_c?: number;
  };
  user?: {
    gender: string;
    occasion: string;
  };
}

export interface NextRecommendationParams {
  session_id: string;
  current_outfit_hash: string;
  rejected_items?: string[];
  preferred_colors?: string[];
  style_feedback?: string;
  force_variation_axis?: RecommendationVariationAxis;
}

export const recommendationService = {
  startRecommendation: async (params: StartRecommendationParams = {}): Promise<RecommendationResponse> => {
    try {
      // Default params if not provided
      const defaultParams = {
        weather: params.weather || { temp_c: 22 },
        user: { gender: 'MASCULINE', occasion: 'work', ...(params.user || {}) },
      };
      
      const response = await apiClient.post('/recommendation/start', defaultParams);
      return response.data;
    } catch (error) {
      console.error('startRecommendation error', error);
      throw error;
    }
  },

  nextRecommendation: async (params: NextRecommendationParams): Promise<RecommendationResponse> => {
    try {
      const response = await apiClient.post('/recommendation/next', params);
      return response.data;
    } catch (error) {
      console.error('nextRecommendation error', error);
      throw error;
    }
  },

  valenGetRecommendation: async (params: StartRecommendationParams = {}): Promise<ValenGetRecommendationResponse> => {
    try {
      // Default params if not provided
      const defaultParams = {
        temperature: params.weather || 22,
        user: { gender: 'MASCULINE', occasion: 'work', ...(params.user || {}) },
      };
      
      const response = await apiClient.post('/recommendation/valen-get-recommendations-offical', defaultParams);
      return response.data;
    } catch (error) {
      console.error('valenGetRecommendation error', error);
      throw error;
    }
  }
};
