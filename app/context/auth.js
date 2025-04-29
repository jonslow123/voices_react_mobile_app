import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storeSecurely, getSecurely, removeSecurely } from '../utils/secureStorage';
import secureApi from '../utils/api';
import { jwtDecode } from 'jwt-decode';

// Create context
const AuthContext = createContext(null);

// Export the Provider component - make sure this is properly exported
export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimeoutRef = useRef(null);

  // Load token on startup
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      try {
        const storedToken = await getSecurely('userToken');
        const userData = await getSecurely('userData');
        
        if (storedToken) {
          // Validate token before using
          if (isTokenValid(storedToken)) {
            setToken(storedToken);
            setUser(userData);
            setupTokenRefresh(storedToken);
          } else {
            // Only try to refresh if we had a valid token before
            // Check if the token exists but has expired (not just missing)
            try {
              const decoded = jwtDecode(storedToken);
              if (decoded && decoded.exp) {
                // Token exists but expired, try to refresh
                const refreshed = await refreshToken();
                if (!refreshed) {
                  // Clear invalid token if refresh fails
                  await removeSecurely('userToken');
                  await removeSecurely('userData');
                }
              } else {
                // Just clear the token if it can't be decoded at all
                await removeSecurely('userToken');
                await removeSecurely('userData');
              }
            } catch (e) {
              // Clear token if we can't even decode it
              await removeSecurely('userToken');
              await removeSecurely('userData');
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Don't try to refresh on initialization errors
        await removeSecurely('userToken');
        await removeSecurely('userData');
      } finally {
        setLoading(false);
      }
    };
    
    initAuth();
    
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Check if token is valid and not expired
  const isTokenValid = (token) => {
    try {
      if (!token) return false;
      
      // Check if jwtDecode is available
      if (typeof jwtDecode !== 'function') {
        console.error('jwtDecode is not a function:', jwtDecode);
        return false;
      }
      
      const decoded = jwtDecode(token);
      
      // Check if decoded has the expected structure
      if (!decoded || typeof decoded !== 'object' || !decoded.exp) {
        console.error('Invalid token structure:', decoded);
        return false;
      }
      
      return decoded.exp * 1000 > Date.now();
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  // Set up automatic token refresh
  const setupTokenRefresh = (token) => {
    try {
      const decoded = jwtDecode(token);
      const expiryTime = decoded.exp * 1000; // Convert to ms
      const timeToExpiry = expiryTime - Date.now();
      
      // Refresh token 5 minutes before expiry
      const refreshTime = Math.max(0, timeToExpiry - (5 * 60 * 1000));
      
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      refreshTimeoutRef.current = setTimeout(refreshToken, refreshTime);
    } catch (error) {
      console.error('Error setting up token refresh:', error);
    }
  };

  // Refresh the token
  const refreshToken = async () => {
    try {
      // Call your refresh token endpoint
      const response = await secureApi.post('/api/auth/refresh', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const { token: newToken, user: newUser } = response.data;
      
      // Save the new token
      await storeSecurely('userToken', newToken);
      await storeSecurely('userData', newUser);
      
      // Update state
      setToken(newToken);
      setUser(newUser);
      
      // Set up refresh for the new token
      setupTokenRefresh(newToken);
      
      return true;
    } catch (error) {
      console.error('HERE: Token refresh failed:', error);
      // Force logout on refresh failure
      logout();
      return false;
    }
  };

  // Login function
  const login = async (credentials) => {
    try {
      // Only send email and password to the login endpoint
      const loginData = {
        email: credentials.email,
        password: credentials.password
      };
      console.log(loginData);

      const response = await secureApi.post('/api/auth/login', loginData);
      
      // Process login response
      const { token, user } = response.data;
      
      // Store token and user data
      await storeSecurely('userToken', token);
      await storeSecurely('userData', user);
      
      setToken(token);
      setUser(user);
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  // Logout function
  const logout = async () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    try {
      // Call logout endpoint if you have one
      if (token) {
        await secureApi.post('/api/auth/logout', {}, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).catch(err => console.log('Logout request error:', err));
      }
    } finally {
      // Clear stored data regardless of logout API response
      await removeSecurely('userToken');
      await removeSecurely('userData');
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoggedIn: !!token,
        login,
        logout,
        refreshToken,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook for using the context
export const useAuth = () => useContext(AuthContext);

// Also export as default
export default AuthProvider; 