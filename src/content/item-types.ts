/**
 * Item types for the Wardrobe Analysis "Item Types" card (Shoes 2 → Loafers 1,
 * Sneakers 1).
 *
 * Items reach the app in two shapes, so each type is matched two ways:
 *   - catalog items (Macgie starter items, database adds) carry the backend
 *     `category_code` (TEE, SHR, LOF, SNK… — also embedded in their
 *     `human_readable_id`, e.g. `USR_L2_TEE_WHT_REG_01`) and a `name`
 *     ("White T-Shirt"), but no AI tags;
 *   - photo uploads carry the AI `subcategory` ("shirt", "sneakers"…).
 * `codes` matches the first, `keywords` (against subcategory, then name) the
 * second.
 *
 * ORDER MATTERS for keywords: the first type whose keyword appears wins, so the
 * specific types come first ("shirt dress" → dress, "t-shirt" → t_shirt before
 * shirt, "short sleeve shirt" → shirt before shorts).
 *
 * Keywords match at the START of a word ("tee" ≠ "steel", "ring" ≠
 * "string"), so a keyword is a word prefix ("sneaker" covers "sneakers").
 *
 * `codes` lists only the codes documented in docs_agent (CATEGORY_CODE_TO_
 * CATEGORY); an unknown code falls through to the name keywords rather than
 * being guessed.
 *
 * `id` is also the i18n key suffix under `wardrobe.analysis.types.*`.
 */
export interface ItemTypeDefinition {
  id: string;
  codes: string[];
  keywords: string[];
}

export const ITEM_TYPES: ItemTypeDefinition[] = [
  // One-piece
  { id: 'dress', codes: [], keywords: ['dress', 'gown'] },
  { id: 'jumpsuit', codes: [], keywords: ['jumpsuit', 'romper', 'overall'] },
  // Outerwear
  { id: 'blazer', codes: ['BLZ'], keywords: ['blazer', 'suit jacket'] },
  {
    id: 'coat',
    codes: [],
    keywords: ['coat', 'trench', 'parka', 'overcoat'],
  },
  {
    id: 'jacket',
    codes: ['JKT'],
    keywords: ['jacket', 'bomber', 'windbreaker', 'puffer'],
  },
  // Tops
  {
    id: 't_shirt',
    codes: ['TEE'],
    keywords: ['t-shirt', 't shirt', 'tshirt', 'tee'],
  },
  { id: 'polo', codes: [], keywords: ['polo'] },
  { id: 'blouse', codes: [], keywords: ['blouse'] },
  {
    id: 'tank',
    codes: [],
    keywords: ['tank', 'camisole', 'undershirt', 'singlet'],
  },
  { id: 'hoodie', codes: [], keywords: ['hoodie', 'sweatshirt'] },
  { id: 'cardigan', codes: [], keywords: ['cardigan'] },
  {
    id: 'knit',
    codes: [],
    keywords: ['sweater', 'knit', 'jumper', 'pullover'],
  },
  { id: 'shirt', codes: ['SHR'], keywords: ['shirt', 'oxford'] },
  // Bottoms
  { id: 'jeans', codes: ['JNS'], keywords: ['jean', 'denim pant'] },
  { id: 'chinos', codes: ['CHI'], keywords: ['chino'] },
  { id: 'skirt', codes: [], keywords: ['skirt'] },
  { id: 'shorts', codes: [], keywords: ['shorts'] },
  { id: 'leggings', codes: [], keywords: ['legging'] },
  {
    id: 'pants',
    codes: ['PNT'],
    keywords: ['trouser', 'pant', 'slack', 'jogger'],
  },
  // Shoes
  {
    id: 'sneakers',
    codes: ['SNK'],
    keywords: ['sneaker', 'trainer', 'running shoe'],
  },
  { id: 'loafers', codes: ['LOF'], keywords: ['loafer', 'moccasin'] },
  { id: 'boots', codes: ['BTS'], keywords: ['boot'] },
  { id: 'heels', codes: [], keywords: ['heel', 'pump', 'stiletto'] },
  { id: 'sandals', codes: [], keywords: ['sandal'] },
  { id: 'slides', codes: [], keywords: ['slide', 'flip flop', 'slipper'] },
  { id: 'flats', codes: [], keywords: ['flat', 'ballerina', 'mary jane'] },
  // Accessories
  { id: 'bag', codes: [], keywords: ['bag', 'tote', 'clutch', 'backpack'] },
  { id: 'belt', codes: [], keywords: ['belt'] },
  { id: 'hat', codes: [], keywords: ['hat', 'cap', 'beanie'] },
  { id: 'scarf', codes: [], keywords: ['scarf'] },
  { id: 'socks', codes: [], keywords: ['sock'] },
  { id: 'sunglasses', codes: [], keywords: ['sunglass'] },
  { id: 'watch', codes: [], keywords: ['watch'] },
  {
    id: 'jewelry',
    codes: [],
    keywords: ['jewel', 'necklace', 'bracelet', 'earring', 'ring'],
  },
];
