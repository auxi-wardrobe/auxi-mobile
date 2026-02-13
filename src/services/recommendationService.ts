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

const API_V2_BASE_URL = 'http://localhost:5001/api/v2';

export const recommendationService = {
  startRecommendation: async (params: StartRecommendationParams = {}): Promise<RecommendationResponse> => {
    try {
      // Default params if not provided
      const defaultParams = {
        weather: { temp_c: 22 },
        user: { gender: 'MASCULINE', occasion: 'work' },
        ...params,
      };
      
      // Override baseURL to use v2 endpoint
      const response = await apiClient.post('/recommendation/start', defaultParams, {
        baseURL: API_V2_BASE_URL
      });
      return response.data;
    } catch (error) {
      console.error('startRecommendation error', error);
      throw error;
    }
  },

  nextRecommendation: async (params: NextRecommendationParams): Promise<RecommendationResponse> => {
    try {
      // Override baseURL to use v2 endpoint
      const response = await apiClient.post('/recommendation/next', params, {
        baseURL: API_V2_BASE_URL
      });
      return response.data;
    } catch (error) {
      console.error('nextRecommendation error', error);
      throw error;
    }
  }
};
