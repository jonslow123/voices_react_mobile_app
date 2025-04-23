import EncryptedStorage from 'react-native-encrypted-storage';

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

export default function DummyComponent() {
    return null;
  }