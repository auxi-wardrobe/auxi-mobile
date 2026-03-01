import { apiClient } from './apiClient';

export interface SaveFavouritePayload {
  outfit_hash: string;
  item_ids: string[];
  source: 'home';
}

export interface SaveFavouriteResponse {
  id: string;
  outfit_hash: string;
  created_at: string;
}

export const favouriteService = {
  saveFavourite: async (
    payload: SaveFavouritePayload,
  ): Promise<SaveFavouriteResponse> => {
    try {
      const response = await apiClient.post('/favourites', payload);
      return response.data;
    } catch (error) {
      console.error('saveFavourite error', error);
      throw error;
    }
  },
};
