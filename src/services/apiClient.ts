import axios from 'axios';
import { ROOT_URL, BASE_URL } from '../config/env';
import { getAccessToken } from './tokenStorage';

export { ROOT_URL, BASE_URL };

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add token to requests
apiClient.interceptors.request.use(async (config: any) => {
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
