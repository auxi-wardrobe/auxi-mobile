import axios from 'axios';
import * as Keychain from 'react-native-keychain';
import { ROOT_URL } from './apiClient';

// Using ROOT_URL because wardrobe endpoints are at root level, not /api/v1
const WARDROBE_URL = `${ROOT_URL}`;

const wardrobeApi = axios.create({
    baseURL: WARDROBE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to add token to requests
wardrobeApi.interceptors.request.use(async (config: any) => {
    try {
        const credentials = await Keychain.getGenericPassword();
        if (credentials) {
            const { password: accessToken } = credentials;
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
    } catch (error) {
        console.error('Error retrieving token', error);
    }
    return config;
});

export interface WardrobeItem {
    id: string;
    user_id: string;
    category: string;
    image_url: string;
    name: string;
    created_at: string;
    description?: string;
    colors?: string[];
    dominant_color?: string;
    occasion?: string[];
    mood?: string[];
    formality_level?: string;
}

export const wardrobeService = {
    getWardrobeItems: async (): Promise<WardrobeItem[]> => {
        try {
            const response = await wardrobeApi.get('/wardrobe/items');
            return response.data.items;
        } catch (error) {
            console.error('Error fetching wardrobe items', error);
            throw error;
        }
    },

    uploadWardrobeItem: async (file: any, typeHint?: string): Promise<WardrobeItem> => {
        try {
            const formData = new FormData();
            
            // Handle file object from react-native-image-picker
            const imageFile = {
                uri: file.uri,
                type: file.type || 'image/jpeg',
                name: file.fileName || 'upload.jpg',
            };

            formData.append('image', imageFile as any);
            if (typeHint) {
                formData.append('type_hint', typeHint);
            }

            const response = await wardrobeApi.post('/process/extract', formData, {
                headers: {
                    'Content-Type': undefined as unknown as string,
                },
                transformRequest: (data, headers) => {
                    return data; // Prevent axios from transforming FormData
                },
            });

            // The API returns the extracted wardrobe item in the response
            if (response.data.wardrobe_item) {
                return response.data.wardrobe_item;
            } else {
                // Fallback or error handling if structure changes
                throw new Error('No wardrobe item returned from processing');
            }
        } catch (error: any) {
            console.error('Error uploading wardrobe item', error);
            if (error.response) {
                console.error('Error response data:', error.response.data);
                console.error('Error response status:', error.response.status);
                console.error('Error response headers:', error.response.headers);
            }
            throw error;
        }
    },
};
