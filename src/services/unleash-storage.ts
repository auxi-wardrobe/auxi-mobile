// src/services/unleash-storage.ts
//
// RN has no localStorage. This adapter lets unleash-proxy-client persist its
// toggle cache in AsyncStorage so flags survive cold starts / offline launches.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IStorageProvider } from 'unleash-proxy-client';

const PREFIX = 'unleash:';

export const asyncStorageProvider: IStorageProvider = {
  async save(name: string, data: unknown): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFIX + name, JSON.stringify(data));
    } catch {
      // Cache-write failure is non-fatal — flags still work from memory.
    }
  },
  async get(name: string): Promise<unknown> {
    try {
      const raw = await AsyncStorage.getItem(PREFIX + name);
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  },
};
