import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView,
  ActivityIndicator,
  Alert,
  DeviceEventEmitter
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BRAND_COLORS } from './styles/brandColors';
import { formatDistanceToNow } from 'date-fns';
import { 
  markNotificationAsRead, 
  getNotifications, 
  markAllNotificationsAsRead 
} from './utils/notificationStorage';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      // Get notifications from storage
      const notifications = await getNotifications();
      setNotifications(notifications);
      
      // Don't automatically mark all as read when opening the screen
      // Only mark as read when user clicks the button or views individual notifications
      
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      const success = await markNotificationAsRead(id);
      if (success) {
        // Update local state to show notification as read
        const updatedNotifications = notifications.map(notification => 
          notification.id === id ? { ...notification, read: true } : notification
        );
        setNotifications(updatedNotifications);
        
        // Get new unread count and emit event
        const newCount = updatedNotifications.filter(n => !n.read).length;
        DeviceEventEmitter.emit('notification_read', { count: newCount });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const navigateToNotificationDetail = (notification) => {
    // Mark as read when opening
    markAsRead(notification.id);
    router.push({
      pathname: '/notification-detail',
      params: { id: notification.id }
    });
  };

  const renderNotificationItem = ({ item }) => {
    const timeAgo = formatDistanceToNow(new Date(item.date), { addSuffix: true });
    
    return (
      <TouchableOpacity 
        style={[styles.notificationItem, !item.read && styles.unreadNotification]} 
        onPress={() => navigateToNotificationDetail(item)}
      >
        <View style={styles.notificationIcon}>
          <Ionicons name={getIconForNotificationType(item.type)} size={24} color={BRAND_COLORS.accent} />
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.notificationBody} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.notificationTime}>{timeAgo}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const getIconForNotificationType = (type) => {
    switch (type) {
      case 'event': return 'calendar';
      case 'artist': return 'person';
      case 'system': return 'information-circle';
      case 'promo': return 'pricetag';
      default: return 'notifications';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={BRAND_COLORS.primaryText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity 
          style={styles.rightButton}
          onPress={async () => {
            try {
              const success = await markAllNotificationsAsRead();
              if (success) {
                // Refresh the notifications list with all marked as read
                const updatedNotifications = notifications.map(notification => ({
                  ...notification,
                  read: true
                }));
                setNotifications(updatedNotifications);
                
                // Emit event to update unread count across the app
                DeviceEventEmitter.emit('notification_read', { count: 0 });
                
                // Show quick feedback
                Alert.alert("Success", "All notifications marked as read");
              }
            } catch (error) {
              console.error('Error marking all as read:', error);
              Alert.alert("Error", "Failed to mark notifications as read");
            }
          }}
        >
          <Ionicons name="checkmark-done" size={24} color={BRAND_COLORS.accent} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLORS.accent} />
        </View>
      ) : notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off" size={64} color="#888" />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: BRAND_COLORS.primaryText,
  },
  rightButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: BRAND_COLORS.background === '#FFFFFF' ? '#FFFFFF' : '#1A1A1A',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadNotification: {
    backgroundColor: BRAND_COLORS.background === '#FFFFFF' ? '#F0F7FF' : '#1A2733',
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.accent,
  },
  notificationIcon: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: BRAND_COLORS.primaryText,
  },
  notificationBody: {
    fontSize: 14,
    color: BRAND_COLORS.secondaryText || '#888',
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#888',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND_COLORS.accent,
    position: 'absolute',
    top: 16,
    right: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
});