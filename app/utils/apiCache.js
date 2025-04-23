// Create a utility file: app/utils/apiCache.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

export const fetchWithCache = async (url, options = {}) => {
  const cacheKey = `mixcloud_cache_${url}`;
  
  // Try to get from cache first
  try {
    const cachedData = await AsyncStorage.getItem(cacheKey);
    
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      
      // Check if cache is still valid
      if (Date.now() - timestamp < CACHE_EXPIRY) {
        console.log('Cache hit:', url);
        return data;
      }
      console.log('Cache expired:', url);
    }
  } catch (error) {
    console.log('Cache read error:', error);
  }
  
  // Fetch fresh data
  const response = await fetch(url, options);
  const data = await response.json();
  
  // Store in cache
  try {
    await AsyncStorage.setItem(
      cacheKey, 
      JSON.stringify({
        data,
        timestamp: Date.now()
      })
    );
  } catch (error) {
    console.log('Cache write error:', error);
  }
  
  return data;
};

export default function DummyComponent() {
    return null;
  }