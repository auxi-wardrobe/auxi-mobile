import axios from 'axios';
import * as Keychain from 'react-native-keychain';
import { ROOT_URL, BASE_URL } from '../config/env';

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
    const credentials = await Keychain.getGenericPassword();
    if (credentials) {
      const { password: accessToken } = credentials; // storing token in password field
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  } catch (error) {
    console.error('Error retrieving token', error);
  }
  return config;
});
