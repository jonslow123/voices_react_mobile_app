import * as Notifications from 'expo-notifications';
import { storeNotification } from './notificationStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple function to generate a unique ID without relying on crypto
function generateUniqueId() {
  return 'notification_' + 
    Date.now().toString(36) + 
    Math.random().toString(36).substring(2, 10);
}

export function testNotifications() {
    console.log('Testing notifications import...');
    try {
      const notificationsModule = require('expo-notifications');
      console.log('Notifications import successful:', !!notificationsModule);
      return true;
    } catch (error) {
      console.error('Notifications import failed:', error.message);
      return false;
    }
}

// Function to trigger a local notification for testing
export async function sendTestNotification() {
  try {
    const notificationId = generateUniqueId();
    
    // First create and store the notification record
    const notification = {
      id: notificationId,
      title: "Test Notification",
      body: "This is a test notification that should appear even when the app is in foreground.",
      type: 'test',
      data: { type: 'test' },
      date: new Date().toISOString(),
      read: false
    };
    
    // Store it first to make sure it's in history
    await storeNotification(notification);
    
    // Then schedule the actual notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification",
        body: "This is a test notification that should appear even when the app is in foreground.",
        data: { 
          type: 'test',
          notificationId: notificationId
        },
      },
      trigger: null, // null means show immediately
    });
    
    console.log('Test notification scheduled with ID:', notificationId);
    return true;
  } catch (error) {
    console.error('Error scheduling test notification:', error);
    return false;
  }
}

// Function to simulate receiving a manual push notification for different scenarios
export async function simulateManualPushNotification(type = 'system') {
  try {
    // Generate a unique ID for this notification
    const notificationId = generateUniqueId();
    
    // Generate mock notification based on type
    let notification = {
      id: notificationId,
      title: "Default Notification",
      body: "This is a default notification message.",
      type: type,
      data: {},
      date: new Date().toISOString(),
      read: false
    };
    
    switch (type) {
      case 'event':
        notification = {
          id: notificationId,
          title: "New Event: Voices Summer Festival",
          body: "Join us for our summer festival on June 15th at the London Roundhouse.",
          type: 'event',
          data: {
            eventDate: "2023-06-15T18:00:00.000Z",
            location: "London Roundhouse",
            eventId: "evt-123456"
          },
          date: new Date().toISOString(),
          read: false
        };
        break;
        
      case 'artist':
        notification = {
          id: notificationId,
          title: "New Artist Show: DJ Shadow",
          body: "DJ Shadow just announced a new show this Friday at 8pm.",
          type: 'artist',
          data: {
            artistUsername: "dj-shadow",
            showTime: "2023-05-05T20:00:00.000Z",
            action: {
              screen: "/(artists)/details?username=dj-shadow",
              title: "View Artist"
            }
          },
          date: new Date().toISOString(),
          read: false
        };
        break;
        
      case 'promo':
        notification = {
          id: notificationId,
          title: "Special Offer: 20% Off Merchandise",
          body: "Use code VOICES20 for 20% off all merchandise in our online store.",
          type: 'promo',
          data: {
            promoCode: "VOICES20",
            expiryDate: "2023-06-01T23:59:59.000Z"
          },
          date: new Date().toISOString(),
          read: false
        };
        break;
        
      case 'system':
      default:
        notification = {
          id: notificationId,
          title: "App Update Available",
          body: "A new version of the Voices Radio app is available. Update now for the latest features.",
          type: 'system',
          data: {
            version: "2.0.1",
            updateUrl: "https://example.com/update"
          },
          date: new Date().toISOString(),
          read: false
        };
        break;
    }
    
    // First, store the notification for the notification history
    await storeNotification(notification);
    
    // Then show it as a local notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: {
          ...notification.data,
          type: notification.type,
          notificationId: notification.id
        }
      },
      trigger: null // Show immediately
    });
    
    console.log(`Simulated manual ${type} notification sent with ID:`, notificationId);
    return true;
  } catch (error) {
    console.error('Error simulating manual notification:', error);
    return false;
  }
}

// Add a function to debug notification count issues
export async function debugNotificationCount() {
  try {
    const notificationId = generateUniqueId();
    
    // Create a notification that's explicitly unread
    const notification = {
      id: notificationId,
      title: "Debug Notification",
      body: "This notification is for debugging badge count issues.",
      type: 'debug',
      data: { type: 'debug' },
      date: new Date().toISOString(),
      read: false // Explicitly set to unread
    };
    
    // First log all existing notifications
    const storedNotifications = await AsyncStorage.getItem('notifications');
    const notifications = storedNotifications ? JSON.parse(storedNotifications) : [];
    console.log('Current stored notifications:', notifications.length);
    console.log('Current unread count:', notifications.filter(n => !n.read).length);
    
    // Store the new notification
    const result = await storeNotification(notification);
    console.log('Debug notification stored:', result);
    
    // Log the count after adding
    const updatedNotifications = await AsyncStorage.getItem('notifications');
    const parsedNotifications = updatedNotifications ? JSON.parse(updatedNotifications) : [];
    console.log('Updated stored notifications:', parsedNotifications.length);
    console.log('Updated unread count:', parsedNotifications.filter(n => !n.read).length);
    
    // Show the notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Debug Notification",
        body: "This notification is for debugging badge count issues.",
        data: { 
          type: 'debug',
          notificationId: notificationId
        },
      },
      trigger: null, // null means show immediately
    });
    
    console.log('Debug notification sent with ID:', notificationId);
    return true;
  } catch (error) {
    console.error('Error in debug notification test:', error);
    return false;
  }
}

export default { 
  testNotifications, 
  sendTestNotification, 
  simulateManualPushNotification,
  debugNotificationCount 
};