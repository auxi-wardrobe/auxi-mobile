export interface Item {
    id: string;
    image_url: string;
    image_png?: string | null; // background-removed PNG cutout; falls back to image_url

    category: string; // e.g., 'Top', 'Bottom', 'Shoes'
    color: string;
    style?: string; // e.g., 'Casual', 'Formal'
    season?: string; // e.g., 'Summer', 'Winter'
    isSystem: boolean; // true for "Standard Items", false for "User Items"
    userId?: string; // owner ID if isSystem is false
}

export const CATEGORIES = ['Top', 'Bottom', 'Shoes', 'Outerwear', 'Accessory', 'Dress'];
export const COLORS = ['Red', 'Blue', 'Green', 'Black', 'White', 'Yellow', 'Pink', 'Purple', 'Grey', 'Orange'];
export const STYLES = ['Casual', 'Formal', 'Sport', 'Vintage', 'Modern'];
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter', 'All Season'];
