import { persist, PersistStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const asyncStorage: PersistStorage<any> = {
    getItem: async (name) => {
      const value = await AsyncStorage.getItem(name);
      return value ? JSON.parse(value) : null;
    },
    setItem: async (name, value) => {
      await AsyncStorage.setItem(name, JSON.stringify(value));
    },
    removeItem: async (name) => {
      await AsyncStorage.removeItem(name);
    },
  };
  
export default asyncStorage;