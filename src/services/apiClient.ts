import axios from 'axios';
import * as Keychain from 'react-native-keychain';

// Base URL for API
// ANDROID: http://10.0.2.2:5001/api/v1
// IOS: http://localhost:5001/api/v1
// TODO: Externalize config
export const ROOT_URL = 'http://localhost:5001';
export const BASE_URL = `${ROOT_URL}/api/v1`;

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
