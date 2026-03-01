import { apiClient } from './apiClient';

export interface GenerateTryOnPayload {
  outfit_hash: string;
  item_ids: string[];
  body_id: string;
}

export interface GenerateTryOnResponse {
  image_url: string;
  request_id: string;
  status: 'completed';
}

export const tryOnService = {
  generateTryOn: async (
    payload: GenerateTryOnPayload,
  ): Promise<GenerateTryOnResponse> => {
    try {
      const response = await apiClient.post('/try-on', payload);
      return response.data;
    } catch (error) {
      console.error('generateTryOn error', error);
      throw error;
    }
  },
};
