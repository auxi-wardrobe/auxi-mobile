import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  capsuleKeys,
  capsuleService,
  type CapsuleChangeScope,
  type CapsuleFull,
  type CapsuleOutfitSource,
  type CreateCapsuleInput,
} from '../../../services/capsuleService';

/**
 * Shared cache invalidation after a capsule mutation: bust the list AND the
 * specific detail entry so both the CapsuleWardrobe list and the open detail
 * refetch. Counts are derived server-side from live joins, so we always trust
 * a fresh fetch over local patching.
 */
const useInvalidateCapsule = () => {
  const queryClient = useQueryClient();
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: capsuleKeys.all });
    if (id) {
      queryClient.invalidateQueries({ queryKey: capsuleKeys.detail(id) });
    }
  };
};

/** POST /capsules — used by the generating screen. */
export const useCreateCapsule = () => {
  const invalidate = useInvalidateCapsule();
  return useMutation({
    mutationFn: (input: CreateCapsuleInput) =>
      capsuleService.createCapsule(input),
    onSuccess: (capsule: CapsuleFull) => invalidate(capsule.id),
  });
};

/** POST /capsules/{id}/generate/retry. */
export const useRetryGeneration = (id: string) => {
  const invalidate = useInvalidateCapsule();
  return useMutation({
    mutationFn: () => capsuleService.retryGeneration(id),
    onSuccess: () => invalidate(id),
  });
};

/** POST /capsules/{id}/items. */
export const useAddCapsuleItems = (id: string) => {
  const invalidate = useInvalidateCapsule();
  return useMutation({
    mutationFn: (itemIds: string[]) => capsuleService.addItems(id, itemIds),
    onSuccess: () => invalidate(id),
  });
};

/** POST /capsules/{id}/items/from-outfits. */
export const useAddFromOutfits = (id: string) => {
  const invalidate = useInvalidateCapsule();
  return useMutation({
    mutationFn: (vars: {
      source: CapsuleOutfitSource;
      outfitIds: string[];
    }) => capsuleService.addFromOutfits(id, vars.source, vars.outfitIds),
    onSuccess: () => invalidate(id),
  });
};

/** DELETE /capsules/{id}/items/{itemId}. */
export const useRemoveCapsuleItem = (id: string) => {
  const invalidate = useInvalidateCapsule();
  return useMutation({
    mutationFn: (itemId: string) => capsuleService.removeItem(id, itemId),
    onSuccess: () => invalidate(id),
  });
};

/** POST /capsules/{id}/items/{itemId}/change. */
export const useChangeCapsuleItem = (id: string) => {
  const invalidate = useInvalidateCapsule();
  return useMutation({
    mutationFn: (vars: {
      itemId: string;
      replacementItemId: string;
      scope: CapsuleChangeScope;
      outfitId?: string;
    }) =>
      capsuleService.changeItem(
        id,
        vars.itemId,
        vars.replacementItemId,
        vars.scope,
        vars.outfitId,
      ),
    onSuccess: () => invalidate(id),
  });
};

/** DELETE /capsules/{id}. */
export const useDeleteCapsule = () => {
  const invalidate = useInvalidateCapsule();
  return useMutation({
    mutationFn: (id: string) => capsuleService.deleteCapsule(id),
    onSuccess: (_data, id) => invalidate(id),
  });
};
