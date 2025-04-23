// app/utils/secureStorage.js
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Determine if SecureStore is available (won't be in Expo Go)
const isSecureStoreAvailable = async () => {
  try {
    await SecureStore.setItemAsync('test-key', 'test-value');
    await SecureStore.deleteItemAsync('test-key');
    return true;
  } catch (error) {
    console.log('SecureStore not available, falling back to AsyncStorage');
    return false;
  }
};

let secureStoreAvailable = null;

// Initialize on module load
(async () => {
  secureStoreAvailable = await isSecureStoreAvailable();
})();

export const storeSecurely = async (key, value) => {
  try {
    if (typeof value !== 'string') {
      value = JSON.stringify(value);
    }
    
    // Check if we can use SecureStore
    if (secureStoreAvailable === null) {
      secureStoreAvailable = await isSecureStoreAvailable();
    }
    
    if (secureStoreAvailable) {
      await SecureStore.setItemAsync(key, value);
    } else {
      // Fall back to AsyncStorage
      await AsyncStorage.setItem(key, value);
    }
    
    return true;
  } catch (error) {
    console.error(`Error storing ${key}:`, error);
    // Try AsyncStorage as a last resort
    try {
      await AsyncStorage.setItem(key, value);
      return true;
    } catch (asyncError) {
      console.error('AsyncStorage fallback failed:', asyncError);
      return false;
    }
  }
};

export const getSecurely = async (key) => {
  try {
    // Check if we can use SecureStore
    if (secureStoreAvailable === null) {
      secureStoreAvailable = await isSecureStoreAvailable();
    }
    
    let value;
    if (secureStoreAvailable) {
      value = await SecureStore.getItemAsync(key);
    } else {
      // Fall back to AsyncStorage
      value = await AsyncStorage.getItem(key);
    }
    
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    console.error(`Error retrieving ${key}:`, error);
    
    // Try AsyncStorage as a last resort
    try {
      const value = await AsyncStorage.getItem(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (asyncError) {
      console.error('AsyncStorage fallback failed:', asyncError);
      return null;
    }
  }
};

export const removeSecurely = async (key) => {
  try {
    // Check if we can use SecureStore
    if (secureStoreAvailable === null) {
      secureStoreAvailable = await isSecureStoreAvailable();
    }
    
    if (secureStoreAvailable) {
      await SecureStore.deleteItemAsync(key);
    } else {
      // Fall back to AsyncStorage
      await AsyncStorage.removeItem(key);
    }
    
    return true;
  } catch (error) {
    console.error(`Error removing ${key}:`, error);
    
    // Try AsyncStorage as a last resort
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (asyncError) {
      console.error('AsyncStorage fallback failed:', asyncError);
      return false;
    }
  }
};

export default function SecureStorage() {
  return null; // Dummy component for expo-router
}