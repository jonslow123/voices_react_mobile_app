// Create a new file: app/utils/tokenManager.js
import { getSecurely, storeSecurely, removeSecurely } from './secureStorage';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Try to import EncryptedStorage with fallback
let SecureStorage;
try {
  const EncryptedStorage = require('react-native-encrypted-storage').default;
  SecureStorage = EncryptedStorage;
} catch (error) {
  console.warn('EncryptedStorage not available, falling back to AsyncStorage');
  // Create a fallback that uses AsyncStorage
  SecureStorage = {
    setItem: async (key, value) => {
      return AsyncStorage.setItem(`secure_${key}`, value);
    },
    getItem: async (key) => {
      return AsyncStorage.getItem(`secure_${key}`);
    },
    removeItem: async (key) => {
      return AsyncStorage.removeItem(`secure_${key}`);
    }
  };
}

// Standalone function to check if a token is valid
export const isTokenValid = (token) => {
  try {
    if (!token) return false;
    const decoded = jwtDecode(token);
    return decoded.exp * 1000 > Date.now();
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

// Standalone function to refresh token without hooks
export const refreshAuthToken = async () => {
  try {
    // Get current token
    const currentToken = await getSecurely('userToken');
    
    if (!currentToken) {
      return false;
    }
    
    // Call refresh endpoint
    const response = await axios.post(
      `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/auth/refresh`,
      {},
      {
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      }
    );
    
    const { token: newToken, user: userData } = response.data;
    
    // Store new token and user data
    await storeSecurely('userToken', newToken);
    await storeSecurely('userData', userData);
    
    return true;
  } catch (error) {
    console.error('Token refresh failed:', error);
    // Clear stored tokens on failure
    await removeSecurely('userToken');
    await removeSecurely('userData');
    return false;
  }
};

// Function to get a valid token, refreshing if needed
export const getValidToken = async (options = { redirectOnFailure: false }) => {
  try {
    // Try AsyncStorage first (most reliable in development)
    let token = await AsyncStorage.getItem('userToken');
    
    // If not found in AsyncStorage, try SecureStore as fallback
    if (!token) {
      try {
        token = await SecureStorage.getItem('userToken');
      } catch (secureError) {
        console.log('SecureStore error:', secureError);
      }
    }
    
    if (!token) {
      console.log('No token found in storage');
      return null;
    }
    
    // Check if token is valid
    if (isTokenValid(token)) {
      return token;
    }
    
    // Token is invalid, try to refresh
    const refreshed = await refreshAuthToken();
    
    if (refreshed) {
      // Return the new token
      token = await AsyncStorage.getItem('userToken');
      if (!token) {
        token = await SecureStorage.getItem('userToken');
      }
      return token;
    } else {
      // Refresh failed
      console.log('No valid token available, redirecting to login');
      
      // Only redirect if the option is enabled
      if (options.redirectOnFailure) {
        // This should be handled by the caller, not here
      }
      return null;
    }
  } catch (error) {
    console.error('Error getting valid token:', error);
    return null;
  }
};

// This dummy component satisfies Expo Router's requirements
export default function TokenManagerComponent() {
  return null;
}