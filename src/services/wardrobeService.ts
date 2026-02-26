import axios from 'axios';
import * as Keychain from 'react-native-keychain';
import { ROOT_URL } from './apiClient';
import { authService } from './auth';

// Using ROOT_URL because wardrobe endpoints are at root level, not /api/v1
const WARDROBE_URL = `${ROOT_URL}/api`;

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

    uploadFile: async (file: any): Promise<string> => {
        try {
            const formData = new FormData();
            
            // Handle file object from react-native-image-picker
            const imageFile = {
                uri: file.uri,
                type: file.type || 'image/jpeg',
                name: file.fileName || 'upload.jpg',
            };

            formData.append('file', imageFile as any);
            // formData.append('prefix', 'garments/'); // Optional

            const response = await wardrobeApi.post('/upload/file', formData, {
                headers: {
                    'Content-Type': undefined as unknown as string,
                },
                transformRequest: (data) => {
                    return data; // Prevent axios from transforming FormData
                },
            });

            return response.data.url;
        } catch (error: any) {
            console.error('Error uploading file', error);
            if (error.response) {
                console.error('Error response data:', error.response.data);
            }
            throw error;
        }
    },

    createWardrobeItem: async (item: Partial<WardrobeItem>): Promise<WardrobeItem> => {
        try {
            const response = await wardrobeApi.post('/wardrobe/', item);
            return response.data.item;
        } catch (error) {
            console.error('Error creating wardrobe item', error);
            throw error;
        }
    },

    uploadWardrobeItem: async (file: any, typeHint?: string): Promise<WardrobeItem> => {
        try {
            // 1. Upload the file to get the URL
            const imageUrl = await wardrobeService.uploadFile(file);

            // 2. Get the current user ID
            const user = await authService.getCurrentUser();
            if (!user || !user.id) {
                throw new Error('User not authenticated or user ID missing');
            }

            // 3. Create the wardrobe item
            // Note: API requires user_id, category, image_url. Name is optional but good to have.
            const newItem = await wardrobeService.createWardrobeItem({
                user_id: String(user.id),
                category: typeHint || 'top', // Default to 'top' if not provided (UI doesn't support selection yet)
                image_url: imageUrl,
                name: 'New Item', // Default name
                // Add other default fields if necessary (colors, etc. can be updated later by AI or user)
            });

            return newItem;
        } catch (error: any) {
            console.error('Error in uploadWardrobeItem flow', error);
            throw error;
        }
    },
};
