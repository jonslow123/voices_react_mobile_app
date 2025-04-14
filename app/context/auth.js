import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create context
const AuthContext = createContext();

// Export the Provider component - make sure this is properly exported
export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);

  // Load stored token on app start
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUserId = await AsyncStorage.getItem('userId');
        
        if (storedToken) {
          setToken(storedToken);
          setUserId(storedUserId);
          setIsLoggedIn(true);
          console.log('Restored token from storage');
        }
      } catch (e) {
        console.error('Failed to load token', e);
      }
    };
    
    loadToken();
  }, []);

  // Function to handle login
  const login = async (userData, authToken) => {
    try {
      await AsyncStorage.setItem('userToken', authToken);
      await AsyncStorage.setItem('userId', userData._id);
      
      setToken(authToken);
      setUserId(userData._id);
      setIsLoggedIn(true);
      console.log('Saved token to storage');
    } catch (e) {
      console.error('Failed to save token', e);
    }
  };

  // Function to handle logout
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userId');
      
      setToken(null);
      setUserId(null);
      setIsLoggedIn(false);
      console.log('Cleared token from storage');
    } catch (e) {
      console.error('Failed to remove token', e);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isLoggedIn, 
      setIsLoggedIn,
      token,
      userId,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook for using the context
export function useAuth() {
  return useContext(AuthContext);
}

// Also export as default
export default AuthProvider; 