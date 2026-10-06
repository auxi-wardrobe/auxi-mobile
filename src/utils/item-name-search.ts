/**
 * Client-side item-name search for the Database picker.
 *
 * `GET /wardrobe/common-items` has no search param, so the picker filters the
 * catalog it already holds. Matching is case- and diacritic-insensitive so a
 * Vietnamese user typing "ao so mi" still finds "Áo sơ mi" (đ/Đ has no
 * combining-mark decomposition, so it is folded explicitly). Every
 * whitespace-separated term must appear somewhere in the name, in any order.
 */
export const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();

export const matchesItemName = (
  name: string | null | undefined,
  query: string,
): boolean => {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return true;
  }
  const haystack = normalizeSearchText(name ?? '');
  return terms.every(term => haystack.includes(term));
};
