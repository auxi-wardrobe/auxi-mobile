import axios from 'axios';
import { ROOT_URL } from './apiClient';
import { getAccessToken } from './tokenStorage';
import { User } from '../types/auth';

const WARDROBE_URL = `${ROOT_URL}/api`;
const STYLE_TAG_FAVORITE = 'favorite';
const STYLE_TAG_LESS_USED = 'less-used';
const FIT_TAG_PREFIX = 'fit:';

type UploadSource = {
  uri?: string;
  type?: string;
  fileName?: string;
};

export type UsageFrequency = 'NORMAL' | 'LESS_USED';

export interface WardrobeAttributeUpdate {
  category?: string;
  name?: string;
  description?: string;
  colors?: string[];
  dominant_color?: string;
  color_hex?: string;
  formality_level?: string;
  style_tags?: string[];
}

export interface WardrobeItem {
  id: string;
  user_id?: string | number;
  owner_id?: string | number;
  category?: string;
  image_url?: string;
  image_png?: string;
  name?: string;
  created_at?: string;
  description?: string;
  colors?: string[];
  dominant_color?: string;
  occasion?: string[];
  mood?: string[];
  formality_level?: string;
  style_tags?: string[];
  color_hex?: string;
  is_common_item?: boolean;
  is_deleted?: boolean;
  is_favorited?: boolean;
  usage_frequency?: UsageFrequency;
  updated_at?: string;
  // AU-351 (backend stacked PRs #101 + #103): outfit-exploration signals.
  // OPTIONAL — default undefined/false on the client so the app compiles and
  // renders correctly before the backend fields ship.
  // `is_exploration_item` → wardrobe tile shows a "New" badge.
  // `exploration_waiting` → item detail shows a "Waiting for the right
  //   occasion" status line.
  is_exploration_item?: boolean;
  exploration_waiting?: boolean;
  [key: string]: unknown;
}

const wardrobeApi = axios.create({
  baseURL: WARDROBE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

wardrobeApi.interceptors.request.use(async (config: any) => {
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

const getItemList = (payload: any): WardrobeItem[] => {
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
};

const getSingleItem = (payload: any): WardrobeItem => payload?.item || payload?.wardrobe_item || payload;

const normalizeStyleTags = (tags: unknown): string[] => {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags.filter((tag): tag is string => typeof tag === 'string');
};

const replaceTag = (tags: string[], tagToReplace: string, enabled: boolean): string[] => {
  const nextTags = tags.filter((tag) => tag !== tagToReplace);

  if (enabled) {
    nextTags.push(tagToReplace);
  }

  return nextTags;
};

const replaceFitTag = (tags: string[], fitLabel: string): string[] => {
  const fitValue = fitLabel.trim().toLowerCase();
  const nextTags = tags.filter((tag) => !tag.startsWith(FIT_TAG_PREFIX));
  nextTags.push(`${FIT_TAG_PREFIX}${fitValue}`);
  return nextTags;
};

const matchesCategoryFilter = (itemCategory: string | undefined, filterCategory: string): boolean => {
  const normalizedItem = itemCategory?.trim().toLowerCase() || '';
  const normalizedFilter = filterCategory.trim().toLowerCase();

  if (!normalizedItem) {
    return false;
  }

  switch (normalizedFilter) {
    case 'top':
      return normalizedItem.includes('top') || normalizedItem.includes('shirt') || normalizedItem.includes('tee') || normalizedItem.includes('blouse');
    case 'bottom':
      return normalizedItem.includes('bottom') || normalizedItem.includes('pant') || normalizedItem.includes('jean') || normalizedItem.includes('skirt') || normalizedItem.includes('short');
    case 'shoes':
      return normalizedItem.includes('shoe') || normalizedItem.includes('sneaker') || normalizedItem.includes('boot') || normalizedItem.includes('heel');
    case 'one_piece':
      return normalizedItem.includes('dress') || normalizedItem.includes('one-piece') || normalizedItem.includes('one piece') || normalizedItem.includes('jumpsuit');
    case 'accessory':
      return normalizedItem.includes('accessor') || normalizedItem.includes('bag') || normalizedItem.includes('belt') || normalizedItem.includes('hat') || normalizedItem.includes('jewel');
    case 'outerwear':
      return normalizedItem.includes('outerwear') || normalizedItem.includes('coat') || normalizedItem.includes('jacket') || normalizedItem.includes('blazer');
    default:
      return normalizedItem.includes(normalizedFilter);
  }
};

const getErrorStatus = (error: any): number | undefined => error?.response?.status;

const fetchWardrobeItems = async (): Promise<WardrobeItem[]> => {
  const response = await wardrobeApi.get('/wardrobe/items');
  return getItemList(response.data);
};

const fetchWardrobeItemById = async (id: string): Promise<WardrobeItem | null> => {
  const items = await fetchWardrobeItems();
  return items.find((item) => item.id === id) || null;
};

const updateAttributesRequest = async (
  id: string,
  payload: WardrobeAttributeUpdate,
): Promise<WardrobeItem> => {
  const response = await wardrobeApi.post(`/wardrobe/items/${id}/attributes`, payload);
  return getSingleItem(response.data);
};

const updateStyleTagsWithFallback = async (
  id: string,
  updateTags: (tags: string[]) => string[],
): Promise<WardrobeItem> => {
  const currentItem = await fetchWardrobeItemById(id);

  if (!currentItem) {
    throw new Error('Item not found');
  }

  const nextTags = updateTags(normalizeStyleTags(currentItem.style_tags));
  const updatedItem = await updateAttributesRequest(id, { style_tags: nextTags });

  return {
    ...currentItem,
    ...updatedItem,
    style_tags: nextTags,
  };
};

export const getItemStyleTags = (item: WardrobeItem | null | undefined): string[] =>
  normalizeStyleTags(item?.style_tags);

export const getItemFavoriteState = (item: WardrobeItem | null | undefined): boolean => {
  if (!item) {
    return false;
  }

  if (typeof item.is_favorited === 'boolean') {
    return item.is_favorited;
  }

  return getItemStyleTags(item).includes(STYLE_TAG_FAVORITE);
};

export const getItemUsageFrequency = (
  item: WardrobeItem | null | undefined,
): UsageFrequency => {
  if (!item) {
    return 'NORMAL';
  }

  if (item.usage_frequency === 'LESS_USED') {
    return 'LESS_USED';
  }

  return getItemStyleTags(item).includes(STYLE_TAG_LESS_USED) ? 'LESS_USED' : 'NORMAL';
};

export const getItemFitLabel = (item: WardrobeItem | null | undefined): string => {
  const fitTag = getItemStyleTags(item).find((tag) => tag.startsWith(FIT_TAG_PREFIX));

  if (!fitTag) {
    return 'Regular';
  }

  const rawFit = fitTag.replace(FIT_TAG_PREFIX, '');

  if (!rawFit) {
    return 'Regular';
  }

  return rawFit
    .split('-')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
};

export const wardrobeService = {
  getWardrobeItems: async (): Promise<WardrobeItem[]> => {
    try {
      return await fetchWardrobeItems();
    } catch (error) {
      console.error('Error fetching wardrobe items', error);
      throw error;
    }
  },

  filterWardrobeItems: async (filters: { category?: string }): Promise<WardrobeItem[]> => {
    const { category } = filters;

    if (!category) {
      return wardrobeService.getWardrobeItems();
    }

    try {
      const response = await wardrobeApi.get('/wardrobe/filter', {
        params: { category },
      });
      return getItemList(response.data);
    } catch (error) {
      const status = getErrorStatus(error);
      if (status === 404 || status === 405) {
        const items = await fetchWardrobeItems();
        return items.filter((item) => matchesCategoryFilter(item.category, category));
      }

      console.error('Error filtering wardrobe items', error);
      throw error;
    }
  },

  getWardrobeItem: async (id: string): Promise<WardrobeItem | null> => {
    try {
      return await fetchWardrobeItemById(id);
    } catch (error) {
      console.error('Error fetching wardrobe item', error);
      throw error;
    }
  },

  getCommonItems: async (category?: string): Promise<WardrobeItem[]> => {
    try {
      const response = await wardrobeApi.get('/wardrobe/common-items', {
        params: { category },
      });
      return getItemList(response.data);
    } catch (error) {
      const status = getErrorStatus(error);
      if (status === 404 || status === 405) {
        return [];
      }

      console.error('Error fetching common items', error);
      throw error;
    }
  },

  cloneCommonItem: async (id: string): Promise<WardrobeItem> => {
    try {
      const response = await wardrobeApi.post(`/wardrobe/common-items/${id}/clone`);
      return getSingleItem(response.data);
    } catch (error) {
      console.error('Error cloning common item', error);
      throw error;
    }
  },

  uploadFile: async (file: UploadSource): Promise<string> => {
    try {
      const formData = new FormData();
      const imageFile = {
        uri: file.uri,
        type: file.type || 'image/jpeg',
        name: file.fileName || 'upload.jpg',
      };

      formData.append('file', imageFile as any);

      const response = await wardrobeApi.post('/upload/file', formData, {
        headers: {
          'Content-Type': undefined as unknown as string,
        },
        transformRequest: (data) => data,
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
      return getSingleItem(response.data);
    } catch (error) {
      console.error('Error creating wardrobe item', error);
      throw error;
    }
  },

  aiEnhanceWardrobeItem: async (item: Partial<WardrobeItem>): Promise<WardrobeItem> => {
    try {
      const response = await wardrobeApi.post('/wardrobe/items/ai-enhanced', item);
      return getSingleItem(response.data);
    } catch (error) {
      console.error('Error enhancing wardrobe item', error);
      throw error;
    }
  },

  uploadWardrobeItem: async (
    file: UploadSource,
    user: User,
    typeHint?: string,
  ): Promise<WardrobeItem> => {
    try {
      const imageUrl = await wardrobeService.uploadFile(file);

      if (!user || !user.id) {
        throw new Error('User not authenticated or user ID missing');
      }

      // return await wardrobeService.createWardrobeItem({
      //   user_id: String(user.id),
      //   category: typeHint || 'top',
      //   image_url: imageUrl,
      //   name: 'New Item',
      // });
      return await wardrobeService.aiEnhanceWardrobeItem({
        user_id: String(user.id),
        category: typeHint || 'top',
        image_url: imageUrl,
        name: 'New Item',
      });
    } catch (error) {
      console.error('Error in uploadWardrobeItem flow', error);
      throw error;
    }
  },

  updateWardrobeItemAttributes: async (
    id: string,
    payload: WardrobeAttributeUpdate,
  ): Promise<WardrobeItem> => {
    try {
      return await updateAttributesRequest(id, payload);
    } catch (error) {
      console.error('Error updating wardrobe item attributes', error);
      throw error;
    }
  },

  deleteWardrobeItem: async (id: string): Promise<void> => {
    try {
      await wardrobeApi.delete(`/wardrobe/items/${id}`);
    } catch (error) {
      console.error('Error deleting wardrobe item', error);
      throw error;
    }
  },

  toggleFavorite: async (id: string, isFavorited: boolean): Promise<WardrobeItem> => {
    try {
      const response = await wardrobeApi.patch(`/wardrobe/items/${id}/favorite`, {
        is_favorited: isFavorited,
      });
      return getSingleItem(response.data);
    } catch (error) {
      const status = getErrorStatus(error);
      if (status === 404 || status === 405) {
        return updateStyleTagsWithFallback(id, (tags) =>
          replaceTag(tags, STYLE_TAG_FAVORITE, isFavorited),
        );
      }

      console.error('Error toggling wardrobe item favorite', error);
      throw error;
    }
  },

  updateUsageFrequency: async (
    id: string,
    usageFrequency: UsageFrequency,
  ): Promise<WardrobeItem> => {
    try {
      const response = await wardrobeApi.patch(`/wardrobe/items/${id}/usage-frequency`, {
        usage_frequency: usageFrequency,
      });
      return getSingleItem(response.data);
    } catch (error) {
      const status = getErrorStatus(error);
      if (status === 404 || status === 405) {
        return updateStyleTagsWithFallback(id, (tags) =>
          replaceTag(tags, STYLE_TAG_LESS_USED, usageFrequency === 'LESS_USED'),
        );
      }

      console.error('Error updating wardrobe item usage frequency', error);
      throw error;
    }
  },

  updateFitPreference: async (id: string, fitLabel: string): Promise<WardrobeItem> => {
    try {
      return await updateStyleTagsWithFallback(id, (tags) => replaceFitTag(tags, fitLabel));
    } catch (error) {
      console.error('Error updating wardrobe item fit', error);
      throw error;
    }
  },

  cloneCommonItems: async (ids: string[]): Promise<void> => {
    try {
      await wardrobeApi.post(`/wardrobe/common-items/clone`, {
        item_ids: ids,
      });
    } catch (error) {
      console.error('Error cloning common items', error);
      throw error;
    }
  },
};
