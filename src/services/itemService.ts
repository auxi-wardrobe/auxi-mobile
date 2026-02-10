import { Item } from '../types/item';

// Mock data for development
let MOCK_ITEMS: Item[] = [
    {
        id: '1',
        imageUrl: 'https://via.placeholder.com/300x400',
        category: 'Top',
        color: 'Blue',
        style: 'Casual',
        season: 'Summer',
        isSystem: true,
    },
    {
        id: '2',
        imageUrl: 'https://via.placeholder.com/300x400',
        category: 'Bottom',
        color: 'Black',
        style: 'Formal',
        season: 'Winter',
        isSystem: false,
        userId: 'user123',
    },
    // Add more mock items as needed
];

export const itemService = {
    getItem: async (id: string): Promise<Item | undefined> => {
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                const item = MOCK_ITEMS.find((i) => i.id === id);
                resolve(item);
            }, 500);
        });
    },

    updateItem: async (id: string, data: Partial<Item>): Promise<Item> => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const index = MOCK_ITEMS.findIndex((i) => i.id === id);
                if (index === -1) {
                    reject(new Error('Item not found'));
                    return;
                }

                if (MOCK_ITEMS[index].isSystem) {
                    reject(new Error('Cannot update system item'));
                    return;
                }

                MOCK_ITEMS[index] = { ...MOCK_ITEMS[index], ...data };
                resolve(MOCK_ITEMS[index]);
            }, 500);
        });
    },

    deleteItem: async (id: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const index = MOCK_ITEMS.findIndex((i) => i.id === id);
                if (index === -1) {
                    reject(new Error('Item not found'));
                    return;
                }
                
                 // Logic for User Item: Delete permanently
                 // Logic for System Item: Just remove from "Wardrobe" (conceptually). 
                 // For MOCK, we just remove it from the list for simplicity in UI testing.
                MOCK_ITEMS = MOCK_ITEMS.filter((i) => i.id !== id);
                resolve();
            }, 500);
        });
    },
    
    // Helper for debugging/mocking
    getAllItems: async (): Promise<Item[]> => {
         return new Promise((resolve) => {
            setTimeout(() => {
                resolve(MOCK_ITEMS);
            }, 500);
        });
    }
};
