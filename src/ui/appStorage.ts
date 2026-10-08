// The device's persistent store. Everything else talks to the KeyValueStorage interface.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { KeyValueStorage } from '../game/storage';

export const appStorage: KeyValueStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
