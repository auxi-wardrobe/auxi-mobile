import { apiClient } from './apiClient';
import { Item } from '../types/item';

export interface Outfit {
  items: Item[]; // Assumes Item type matches or is compatible with backend response structure
  styling_note: string;
  outfit_hash: string;
  fallback_flags: string[];
}

export interface RecommendationResponse {
  outfit: Outfit;
  session_id: string;
  fallback_flags: string[];
  variation_axis?: string;
}

export interface StartRecommendationParams {
  weather?: {
    temp_c: number;
  };
  user?: {
    gender: string;
    occasion: string;
  };
}

export interface NextRecommendationParams {
  session_id: string;
  current_outfit_hash: string;
}

export const recommendationService = {
  startRecommendation: async (params: StartRecommendationParams = {}): Promise<RecommendationResponse> => {
    try {
      // Default params if not provided
      const defaultParams = {
        weather: { temp_c: 22 },
        user: { gender: 'MASCULINE', occasion: 'work' },
        ...params,
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
  }
};
