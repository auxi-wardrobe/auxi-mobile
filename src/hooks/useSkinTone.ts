/**
 * The user's self-reported skin tone (Wardrobe Analysis › "Change your skin
 * tone").
 *
 * Stored ON DEVICE, per user, in AsyncStorage. It cannot go in `user_metadata`
 * yet: `PUT /api/me` rejects unknown metadata keys with 422
 * (docs_agent/API_DOCUMENTATION.md), so a `skin_tone` key needs a backend
 * allowlist change first. When that ships, swap the storage calls below for
 * `usePersistUserMetadata` and keep this hook's surface unchanged.
 *
 * Read through TanStack Query so every screen that shows the tone shares one
 * cache entry and updates together after a change.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { isSkinToneId, type SkinToneId } from '../content/skin-tones';

const storageKey = (userId: string | number) => `auxi.skin_tone.v1.${userId}`;

export const skinToneKeys = {
  all: ['skin-tone'] as const,
  user: (userId: string | number | undefined) =>
    ['skin-tone', userId ?? 'anonymous'] as const,
};

export const readStoredSkinTone = async (
  userId: string | number,
): Promise<SkinToneId | null> => {
  try {
    const value = await AsyncStorage.getItem(storageKey(userId));
    return isSkinToneId(value) ? value : null;
  } catch (error) {
    console.warn('[useSkinTone] AsyncStorage read failed', error);
    return null;
  }
};

export interface UseSkinTone {
  skinTone: SkinToneId | null;
  isLoading: boolean;
  setSkinTone: (next: SkinToneId) => Promise<void>;
  isSaving: boolean;
}

export const useSkinTone = (): UseSkinTone => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: skinToneKeys.user(userId),
    queryFn: () => (userId === undefined ? null : readStoredSkinTone(userId)),
    enabled: userId !== undefined,
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: async (next: SkinToneId) => {
      if (userId === undefined) {
        throw new Error('Cannot save a skin tone without a signed-in user');
      }
      await AsyncStorage.setItem(storageKey(userId), next);
      return next;
    },
    onSuccess: next => {
      queryClient.setQueryData(skinToneKeys.user(userId), next);
    },
  });

  return {
    skinTone: query.data ?? null,
    isLoading: query.isLoading,
    setSkinTone: async next => {
      await mutation.mutateAsync(next);
    },
    isSaving: mutation.isPending,
  };
};
