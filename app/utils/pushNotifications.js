import * as NotificationsModule from 'expo-notifications';
import * as DeviceModule from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { storeNotification } from './notificationStorage';

// Don't try to assign to imported modules
const Notifications = NotificationsModule;
const Device = DeviceModule;

let notificationsAvailable = false;
let deviceAvailable = false;

try {
  console.log('Attempting to import expo-notifications...');
  const Notifications = require('expo-notifications');
  notificationsAvailable = true;
  console.log('expo-notifications successfully imported:', !!Notifications);
} catch (error) {
  console.error('Failed to import expo-notifications:', error);
}

try {
  console.log('Attempting to import expo-device...');
  const Device = require('expo-device');
  deviceAvailable = true;
  console.log('expo-device successfully imported:', !!Device);
} catch (error) {
  console.error('Failed to import expo-device:', error);
}

// Now conditionally export the functions based on availability
export async function registerForPushNotifications() {
  console.log('Register push called');
  
  try {
    // Check if running in Expo Go
    const isExpoGo = Constants.appOwnership === 'expo';
    if (isExpoGo) {
      console.log('Running in Expo Go - push notifications have limited support');
      // In Expo Go, we'll just return a mock token for testing UI
      const mockToken = 'expo-go-mock-token-' + Date.now();
      await AsyncStorage.setItem('pushToken', mockToken);
      return mockToken;
    }
    
    if (!Device.isDevice) {
      console.log('Not a physical device');
      return null;
    }
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Permission not granted');
      return null;
    }
    
    let token;
    try {
      // Check if we have a valid projectId
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      console.log('Project ID check:', { 
        hasProjectId: !!projectId,
        projectIdValue: projectId || 'undefined'
      });
      
      if (projectId && typeof projectId === 'string' && projectId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // Valid UUID format for projectId, use it
        console.log('Using EAS project ID for token');
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        })).data;
        console.log('Token:', token);
      } else {
        // No valid projectId, try the default approach
        console.log('Using default method for token');
        token = (await Notifications.getExpoPushTokenAsync()).data;
      }
      
      // Save token
      await AsyncStorage.setItem('pushToken', token);
      
      // Configure notification handler to show alerts even when app is in foreground
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,  // Show alert even in foreground
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      
      return token;
    } catch (tokenError) {
      console.error('Token error:', tokenError);
      
      // Fallback if both methods fail - try the simplest version
      try {
        console.log('Trying fallback token method...');
        token = (await Notifications.getExpoPushTokenAsync({
          experienceId: '@anonymous/voices-app'
        })).data;
        
        await AsyncStorage.setItem('pushToken', token);
        return token;
      } catch (fallbackError) {
        console.error('Fallback token error:', fallbackError);
        return null;
      }
    }
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

export function setupNotificationListeners(navigation) {
  try {
    console.log('Setting up notification listeners...');
    
    // This listener is triggered when a notification is received while the app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      try {
        console.log('Notification received in foreground:', notification);
        
        // Store the notification in our local storage
        const notificationData = notification.request.content;
        
        // Create a notification object to store
        const notificationToStore = {
          title: notificationData.title || 'New Notification',
          body: notificationData.body || '',
          data: notificationData.data || {},
          date: new Date().toISOString(),
          read: false,
          type: notificationData.data?.type || 'system'
        };
        
        // Store the notification for later retrieval
        storeNotification(notificationToStore)
          .then(() => console.log('Notification stored successfully'))
          .catch(error => console.error('Failed to store notification:', error));
          
      } catch (error) {
        console.error('Error processing foreground notification:', error);
      }
    });
    console.log('Foreground listener set up');
    
    // This listener is triggered when user taps on a notification
    const backgroundSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      try {
        console.log('Notification response received:', response);
        
        // Store the notification in our local storage
        const notificationData = response.notification.request.content;
        
        // Create a notification object to store
        const notificationToStore = {
          title: notificationData.title || 'New Notification',
          body: notificationData.body || '',
          data: notificationData.data || {},
          date: new Date().toISOString(),
          read: true, // Mark as read since user tapped on it
          type: notificationData.data?.type || 'system'
        };
        
        // Store the notification
        storeNotification(notificationToStore)
          .then(() => console.log('Notification stored successfully'))
          .catch(error => console.error('Failed to store notification:', error));
        
        // Extract data for navigation
        const { data } = response.notification.request.content;
        
        // Navigate based on notification data
        if (data?.type === 'show_alert' && data?.artistUsername) {
          navigation.navigate('/(artists)/details', { username: data.artistUsername });
        }
        
        // Add more navigation handlers based on your notification types
        if (data?.type === 'new_show') {
          navigation.navigate('/(tabs)/shows');
        }
        
        // If there's no specific navigation target, show the notification detail
        if (data?.notificationId) {
          navigation.navigate('/notification-detail', { id: data.notificationId });
        }
      } catch (error) {
        console.error('Error processing background notification:', error);
      }
    });
    console.log('Background listener set up');
    
    return {
      unsubscribe: () => {
        foregroundSubscription.remove();
        backgroundSubscription.remove();
      }
    };
  } catch (error) {
    console.error('Error setting up listeners:', error);
    return { unsubscribe: () => {} };
  }
}

// This function doesn't depend on the Notifications API
export async function saveTokenToStorage(token) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('pushToken', token);
    console.log('Saved token to storage');
    return true;
  } catch (error) {
    console.error('Error saving token:', error);
    return false;
  }
}

// This function doesn't depend on the Notifications API
export async function getTokenFromStorage() {
  try {
    const token = await AsyncStorage.getItem('pushToken');
    console.log('Restored token from storage:', token);
    return token;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

// Add a default export to fix the warning
export default {
  registerForPushNotifications,
  setupNotificationListeners,
  getTokenFromStorage
};