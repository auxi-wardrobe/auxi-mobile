// Resolves API host based on build mode.
// Debug builds (Metro / sim) hit local backend.
// Release builds (TestFlight / App Store) hit Railway production.
const DEV_ROOT = 'http://localhost:5001';
const PROD_ROOT = 'https://wardrobe-backend-production-c8d9.up.railway.app';

export const ROOT_URL = __DEV__ ? DEV_ROOT : PROD_ROOT;
export const BASE_URL = `${ROOT_URL}/api`;
