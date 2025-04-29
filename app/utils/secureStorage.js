// app/utils/secureStorage.js
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Determine if SecureStore is available (won't be in Expo Go)
const isSecureStoreAvailable = async () => {
  // Always fallback to AsyncStorage on development builds
  if (__DEV__) {
    console.log('Development build detected, using AsyncStorage for credentials');
    return false;
  }
  
  // On iOS simulator, SecureStore often fails
  if (Platform.OS === 'ios' && !Platform.isPad && Platform.isSimulator) {
    console.log('iOS simulator detected, using AsyncStorage for credentials');
    return false;
  }
  
  try {
    await SecureStore.setItemAsync('test-key', 'test-value');
    await SecureStore.deleteItemAsync('test-key');
    return true;
  } catch (error) {
    console.log('SecureStore not available, falling back to AsyncStorage:', error);
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
    // Ensure the value is a string
    const stringValue = typeof value !== 'string' ? JSON.stringify(value) : value;
    
    // Use AsyncStorage as the primary storage in development
    if (__DEV__) {
      await AsyncStorage.setItem(key, stringValue);
      console.log(`Stored ${key} in AsyncStorage (dev mode)`);
      return true;
    }
    
    // Check if we can use SecureStore
    if (secureStoreAvailable === null) {
      secureStoreAvailable = await isSecureStoreAvailable();
    }
    
    if (secureStoreAvailable) {
      await SecureStore.setItemAsync(key, stringValue);
    } else {
      // Fall back to AsyncStorage
      await AsyncStorage.setItem(key, stringValue);
    }
    
    // For verification, let's check if we stored successfully
    const verification = await getSecurely(key);
    if (!verification) {
      console.warn(`Storage verification failed for ${key}, using backup method`);
      await AsyncStorage.setItem(`backup_${key}`, stringValue);
    }
    
    return true;
  } catch (error) {
    console.error(`Error storing ${key}:`, error);
    // Try AsyncStorage as a last resort
    try {
      await AsyncStorage.setItem(`backup_${key}`, stringValue);
      return true;
    } catch (asyncError) {
      console.error('AsyncStorage fallback failed:', asyncError);
      return false;
    }
  }
};

export const getSecurely = async (key) => {
  try {
    // Force AsyncStorage in development
    if (__DEV__) {
      const value = await AsyncStorage.getItem(key);
      if (!value) {
        return null;
      }
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    
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
    
    if (!value) {
      // Try backup location
      value = await AsyncStorage.getItem(`backup_${key}`);
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