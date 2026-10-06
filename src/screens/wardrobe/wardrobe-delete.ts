import { WardrobeItem } from '../../services/wardrobeService';

// Pure helpers for the multi-select "Delete items" screen (Figma "wardrobe -
// delete" / "delete selected"). Kept out of the screen so the selection and
// partial-failure rules are unit-testable without rendering.

// Items the user may select for deletion. A SYSTEM catalog row
// (`is_common_item`) isn't theirs to remove — deleting it would remove it for
// every user; mirrors ItemDetail's `canDelete` and the backend guard in
// WardrobeService.soft_delete_item. Seeded starter items (`is_default_item`)
// ARE the user's and stay deletable.
export const isDeletableItem = (item: WardrobeItem): boolean =>
  item.is_common_item !== true;

// Toggle one id in the selection (pure; returns a new Set).
export const toggleSelectedId = (
  selected: ReadonlySet<string>,
  id: string,
): Set<string> => {
  const next = new Set(selected);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
};

export interface BulkDeleteResult {
  deletedIds: string[];
  failedIds: string[];
}

// Delete every id in parallel and report which ones landed. Never rejects: a
// per-item failure is collected so the screen can keep the failed tiles
// selected for a retry while the successful ones leave the grid.
export const deleteItemsSettled = async (
  ids: readonly string[],
  deleteOne: (id: string) => Promise<void>,
): Promise<BulkDeleteResult> => {
  const results = await Promise.allSettled(ids.map(id => deleteOne(id)));
  const deletedIds: string[] = [];
  const failedIds: string[] = [];
  results.forEach((result, index) => {
    (result.status === 'fulfilled' ? deletedIds : failedIds).push(ids[index]);
  });
  return { deletedIds, failedIds };
};
