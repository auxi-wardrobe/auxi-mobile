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
 * `codes` matches the first, `keywords` the second — against the AI
 * `subcategory`, then the `name`, then the AI `description` ("Light blue denim
 * shirt with white buttons…"), then the category.
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
  /**
   * The category group the type belongs to. An item only ever matches types
   * of ITS group (an item in Tops can't read as Jewelry because its name
   * starts a word with "ring").
   */
  group: 'one_piece' | 'outerwear' | 'top' | 'bottom' | 'shoes' | 'accessory';
  codes: string[];
  keywords: string[];
}

export const ITEM_TYPES: ItemTypeDefinition[] = [
  // One-piece
  { id: 'dress', group: 'one_piece', codes: [], keywords: ['dress', 'gown'] },
  {
    id: 'jumpsuit',
    group: 'one_piece',
    codes: [],
    keywords: ['jumpsuit', 'romper', 'overall'],
  },
  // Outerwear
  {
    id: 'blazer',
    group: 'outerwear',
    codes: ['BLZ'],
    keywords: ['blazer', 'suit jacket'],
  },
  {
    id: 'coat',
    group: 'outerwear',
    codes: [],
    keywords: ['coat', 'trench', 'parka', 'overcoat'],
  },
  {
    id: 'jacket',
    group: 'outerwear',
    codes: ['JKT'],
    keywords: ['jacket', 'bomber', 'windbreaker', 'puffer'],
  },
  // Tops
  {
    id: 't_shirt',
    group: 'top',
    codes: ['TEE'],
    keywords: ['t-shirt', 't shirt', 'tshirt', 'tee'],
  },
  { id: 'polo', group: 'top', codes: [], keywords: ['polo'] },
  { id: 'blouse', group: 'top', codes: [], keywords: ['blouse'] },
  {
    id: 'tank',
    group: 'top',
    codes: [],
    keywords: ['tank', 'camisole', 'undershirt', 'singlet'],
  },
  { id: 'hoodie', group: 'top', codes: [], keywords: ['hoodie', 'sweatshirt'] },
  { id: 'cardigan', group: 'top', codes: [], keywords: ['cardigan'] },
  {
    id: 'knit',
    group: 'top',
    codes: [],
    keywords: ['sweater', 'knit', 'jumper', 'pullover'],
  },
  { id: 'shirt', group: 'top', codes: ['SHR'], keywords: ['shirt', 'oxford'] },
  // Bottoms
  {
    id: 'jeans',
    group: 'bottom',
    codes: ['JNS'],
    keywords: ['jean', 'denim pant'],
  },
  { id: 'chinos', group: 'bottom', codes: ['CHI'], keywords: ['chino'] },
  { id: 'skirt', group: 'bottom', codes: [], keywords: ['skirt'] },
  { id: 'shorts', group: 'bottom', codes: [], keywords: ['shorts'] },
  { id: 'leggings', group: 'bottom', codes: [], keywords: ['legging'] },
  {
    id: 'pants',
    group: 'bottom',
    codes: ['PNT'],
    keywords: ['trouser', 'pant', 'slack', 'jogger'],
  },
  // Shoes
  {
    id: 'sneakers',
    group: 'shoes',
    codes: ['SNK'],
    keywords: ['sneaker', 'trainer', 'running shoe'],
  },
  {
    id: 'loafers',
    group: 'shoes',
    codes: ['LOF'],
    keywords: ['loafer', 'moccasin'],
  },
  { id: 'boots', group: 'shoes', codes: ['BTS'], keywords: ['boot'] },
  {
    id: 'heels',
    group: 'shoes',
    codes: [],
    keywords: ['heel', 'pump', 'stiletto'],
  },
  { id: 'sandals', group: 'shoes', codes: [], keywords: ['sandal'] },
  {
    id: 'slides',
    group: 'shoes',
    codes: [],
    keywords: ['slide', 'flip flop', 'slipper'],
  },
  {
    id: 'flats',
    group: 'shoes',
    codes: [],
    keywords: ['flat', 'ballerina', 'mary jane'],
  },
  // Accessories
  {
    id: 'bag',
    group: 'accessory',
    codes: [],
    keywords: ['bag', 'tote', 'clutch', 'backpack'],
  },
  { id: 'belt', group: 'accessory', codes: [], keywords: ['belt'] },
  {
    id: 'hat',
    group: 'accessory',
    codes: [],
    keywords: ['hat', 'cap', 'beanie'],
  },
  { id: 'scarf', group: 'accessory', codes: [], keywords: ['scarf'] },
  { id: 'socks', group: 'accessory', codes: [], keywords: ['sock'] },
  { id: 'sunglasses', group: 'accessory', codes: [], keywords: ['sunglass'] },
  { id: 'watch', group: 'accessory', codes: [], keywords: ['watch'] },
  {
    id: 'jewelry',
    group: 'accessory',
    codes: [],
    keywords: ['jewel', 'necklace', 'bracelet', 'earring', 'ring'],
  },
];
