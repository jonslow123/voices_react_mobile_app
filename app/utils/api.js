// app/utils/api.js
import axios from 'axios';
import { Alert } from 'react-native';

// Create a debug-friendly axios instance
const secureApi = axios.create({
  baseURL: process.env.EXPO_PUBLIC_BACKEND_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add verbose request logging
secureApi.interceptors.request.use(config => {
  console.log('🚀 REQUEST:', {
    url: config.url,
    method: config.method,
    headers: config.headers,
    data: config.data
  });
  
  // DEBUGGING: Temporarily disable HTTPS enforcement
  // if (!config.url.startsWith('https://') && !__DEV__) {
  //   throw new Error(`Insecure request blocked: ${config.url}`);
  // }
  
  return config;
});

// Add verbose response/error logging
secureApi.interceptors.response.use(
  response => {
    console.log('✅ RESPONSE:', {
      status: response.status,
      headers: response.headers,
      data: response.data
    });
    return response;
  },
  async (error) => {
    // Enhanced error logging to debug 500 errors
    console.log('❌ ERROR DETAILS:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      errorDetails: error.response?.data?.error || error.response?.data?.message || 'No error details',
      stack: error.stack,
      headers: error?.response?.headers,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        baseURL: error.config?.baseURL,
        data: error.config?.data,
      }
    });
    
    // Special handling for 500 errors
    if (error.response?.status === 500) {
      console.log('Server Error (500) occurred. Request details:', {
        url: error.config?.url,
        method: error.config?.method,
        data: typeof error.config?.data === 'string' ? 
          JSON.parse(error.config?.data) : 
          error.config?.data,
      });
    }
    
    const originalRequest = error.config;
    
    // If error is 401 and we haven't tried to refresh token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Import the useAuth hook
        const { refreshToken } = require('../context/auth').useAuth();
        // Try to refresh the token
        const refreshed = await refreshToken();
        
        if (refreshed) {
          // Get new token from storage
          const newToken = await getSecurely('userToken');
          // Update authorization header
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          // Retry the original request
          return secureApi(originalRequest);
        }
      } catch (refreshError) {
        console.error('Error refreshing token in interceptor:', refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Alternative login function that bypasses security for testing
secureApi.loginTest = async (credentials) => {
  try {
    // Create a basic axios instance without the interceptors
    const response = await axios.post(
      `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/auth/login`,
      credentials,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('Direct login response:', response.data);
    return response;
  } catch (error) {
    console.error('Direct login error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
};

export default secureApi;