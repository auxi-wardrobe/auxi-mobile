import axios from 'axios';
import { ROOT_URL } from './apiClient';
import { getAccessToken } from './tokenStorage';
import { authService } from './auth';

const BODY_URL = `${ROOT_URL}/api`;

const bodyApi = axios.create({
  baseURL: BODY_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

bodyApi.interceptors.request.use(async (config: any) => {
  try {
    const accessToken = await getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  } catch (error) {
    console.error('Error retrieving token', error);
  }
  return config;
});

export interface BodyItem {
  id: string;
  user_id: string;
  image_url: string;
  created_at?: string;
}

const uploadFile = async (file: any): Promise<string> => {
  const formData = new FormData();
  const imageFile = {
    uri: file.uri,
    type: file.type || 'image/jpeg',
    name: file.fileName || 'upload.jpg',
  };

  formData.append('file', imageFile as any);

  const response = await bodyApi.post('/upload/file', formData, {
    headers: {
      'Content-Type': undefined as unknown as string,
    },
    transformRequest: (data) => data,
  });

  return response.data.url;
};

export const bodyService = {
  getBodies: async (): Promise<BodyItem[]> => {
    try {
      const response = await bodyApi.get('/bodies');
      if (Array.isArray(response.data)) return response.data;
      if (Array.isArray(response.data.items)) return response.data.items;
      if (Array.isArray(response.data.bodies)) return response.data.bodies;
      return [];
    } catch (error) {
      console.error('Error fetching body items', error);
      throw error;
    }
  },

  uploadBody: async (file: any): Promise<BodyItem> => {
    try {
      const imageUrl = await uploadFile(file);
      const user = await authService.getCurrentUser();
      if (!user?.id) {
        throw new Error('User not authenticated or user ID missing');
      }

      const response = await bodyApi.post('/bodies/create', {
        user_id: String(user.id),
        image_url: imageUrl,
      });

      return response.data.item || response.data;
    } catch (error) {
      console.error('Error uploading body', error);
      throw error;
    }
  },

  deleteBody: async (id: string): Promise<void> => {
    try {
      await bodyApi.delete(`/body/${id}`);
    } catch (error) {
      console.error('Error deleting body', error);
      throw error;
    }
  },
};
