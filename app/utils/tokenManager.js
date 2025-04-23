// Create a new file: app/utils/tokenManager.js
import { getSecurely, storeSecurely, removeSecurely } from './secureStorage';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

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
export const getValidToken = async () => {
  try {
    const token = await getSecurely('userToken');
    
    if (!token) {
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
      return await getSecurely('userToken');
    } else {
      // Refresh failed, return null
      return null;
    }
  } catch (error) {
    console.error('Error getting valid token:', error);
    return null;
  }
};