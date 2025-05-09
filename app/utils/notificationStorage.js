import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
// Remove the uuid import that's causing issues
// import { v4 as uuidv4 } from 'uuid';

// Maximum number of notifications to store - set very high for permanent history
const MAX_NOTIFICATIONS = 100;

// Simple function to generate a unique ID without relying on crypto
function generateUniqueId() {
  return 'notification_' + 
    Date.now().toString(36) + 
    Math.random().toString(36).substring(2, 10);
}

/**
 * Save a notification to storage
 * @param {Object} notification - The notification object to save
 * @returns {Promise<Object>} - The saved notification with an ID
 */
export async function storeNotification(notification) {
  try {
    // Get existing notifications
    const storedNotifications = await AsyncStorage.getItem('notifications');
    let notifications = storedNotifications ? JSON.parse(storedNotifications) : [];

    // Generate a unique ID if not present, using our simple function
    const notificationWithId = {
      ...notification,
      id: notification.id || generateUniqueId(),
      date: notification.date || new Date().toISOString(),
      read: notification.read || false
    };

    // Add the new notification to the beginning of the array
    notifications.unshift(notificationWithId);

    // Limit the number of stored notifications
    if (notifications.length > MAX_NOTIFICATIONS) {
      notifications = notifications.slice(0, MAX_NOTIFICATIONS);
    }

    // Save the updated notifications
    await AsyncStorage.setItem('notifications', JSON.stringify(notifications));
    
    // Calculate the new unread count
    const unreadCount = notifications.filter(n => !n.read).length;
    
    // Emit an event to update the badge count
    console.log('Emitting notification_stored event with count:', unreadCount);
    DeviceEventEmitter.emit('notification_stored', { count: unreadCount });
    
    return notificationWithId;
  } catch (error) {
    console.error('Error storing notification:', error);
    return null;
  }
}

/**
 * Get all stored notifications
 * @returns {Promise<Array>} - Array of notifications
 */
export async function getNotifications() {
  try {
    const storedNotifications = await AsyncStorage.getItem('notifications');
    if (storedNotifications) {
      const notifications = JSON.parse(storedNotifications);
      // Sort by date, newest first
      return notifications.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    return [];
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
}

/**
 * Get a specific notification by ID
 * @param {string} id - Notification ID
 * @returns {Promise<Object|null>} - The notification or null if not found
 */
export async function getNotificationById(id) {
  try {
    const notifications = await getNotifications();
    return notifications.find(notification => notification.id === id) || null;
  } catch (error) {
    console.error('Error getting notification by ID:', error);
    return null;
  }
}

/**
 * Mark a notification as read
 * @param {string} id - Notification ID
 * @returns {Promise<boolean>} - Success status
 */
export async function markNotificationAsRead(id) {
  try {
    const storedNotifications = await AsyncStorage.getItem('notifications');
    if (storedNotifications) {
      const notifications = JSON.parse(storedNotifications);
      const updatedNotifications = notifications.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      );
      
      await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

/**
 * Delete a notification by ID
 * @param {string} id - Notification ID
 * @returns {Promise<boolean>} - Success status
 */
export async function deleteNotification(id) {
  try {
    const storedNotifications = await AsyncStorage.getItem('notifications');
    if (storedNotifications) {
      const notifications = JSON.parse(storedNotifications);
      const updatedNotifications = notifications.filter(
        notification => notification.id !== id
      );
      
      await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
}

/**
 * Clear all notifications
 * @returns {Promise<boolean>} - Success status
 */
export async function clearAllNotifications() {
  try {
    await AsyncStorage.setItem('notifications', JSON.stringify([]));
    return true;
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return false;
  }
}

/**
 * Get unread notification count
 * @returns {Promise<number>} - Number of unread notifications
 */
export async function getUnreadCount() {
  try {
    const notifications = await getNotifications();
    return notifications.filter(notification => !notification.read).length;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

/**
 * Mark all notifications as read
 * @returns {Promise<boolean>} - Success status
 */
export async function markAllNotificationsAsRead() {
  try {
    const storedNotifications = await AsyncStorage.getItem('notifications');
    if (storedNotifications) {
      const notifications = JSON.parse(storedNotifications);
      const updatedNotifications = notifications.map(notification => ({
        ...notification,
        read: true
      }));
      
      await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}

export default {
  storeNotification,
  getNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  getUnreadCount
}; 