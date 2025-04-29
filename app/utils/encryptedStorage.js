import AsyncStorage from '@react-native-async-storage/async-storage';

let EncryptedStorage;
try {
  EncryptedStorage = require('react-native-encrypted-storage').default;
} catch (error) {
  console.warn('EncryptedStorage not available, falling back to AsyncStorage');
  // Create a fallback that uses AsyncStorage
  EncryptedStorage = {
    setItem: async (key, value) => {
      return AsyncStorage.setItem(`encrypted_${key}`, value);
    },
    getItem: async (key) => {
      return AsyncStorage.getItem(`encrypted_${key}`);
    },
    removeItem: async (key) => {
      return AsyncStorage.removeItem(`encrypted_${key}`);
    },
    clear: async () => {
      // Only clear items with our prefix
      const keys = await AsyncStorage.getAllKeys();
      const encryptedKeys = keys.filter(key => key.startsWith('encrypted_'));
      return AsyncStorage.multiRemove(encryptedKeys);
    }
  };
}

export const storeEncrypted = async (key, value) => {
  try {
    await EncryptedStorage.setItem(
      key,
      typeof value === 'string' ? value : JSON.stringify(value)
    );
    return true;
  } catch (error) {
    console.error(`Encrypted storage - error storing ${key}:`, error);
    return false;
  }
};

export const getEncrypted = async (key) => {
  try {
    const value = await EncryptedStorage.getItem(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    console.error(`Encrypted storage - error retrieving ${key}:`, error);
    return null;
  }
};

export const removeEncrypted = async (key) => {
  try {
    await EncryptedStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Encrypted storage - error removing ${key}:`, error);
    return false;
  }
};

export const clearEncryptedStorage = async () => {
  try {
    await EncryptedStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing encrypted storage:', error);
    return false;
  }
};

export { EncryptedStorage };

export default function DummyComponent() {
    return null;
  }