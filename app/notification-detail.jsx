import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  DeviceEventEmitter
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BRAND_COLORS } from './styles/brandColors';
import { format } from 'date-fns';
import { markNotificationAsRead, getUnreadCount } from './utils/notificationStorage';

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams();
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadNotification();
  }, [id]);

  const loadNotification = async () => {
    try {
      setLoading(true);
      const storedNotifications = await AsyncStorage.getItem('notifications');
      if (storedNotifications) {
        const parsedNotifications = JSON.parse(storedNotifications);
        const foundNotification = parsedNotifications.find(n => n.id === id);
        if (foundNotification) {
          setNotification(foundNotification);
          
          // Mark this notification as read
          if (!foundNotification.read) {
            console.log('Marking notification as read:', id);
            await markNotificationAsRead(id);
            
            // Update notification in local state to show as read
            setNotification({
              ...foundNotification,
              read: true
            });
            
            // Emit an event that the badge count should be updated
            // Get the new unread count and include it in the event
            const newUnreadCount = await getUnreadCount();
            console.log('Emitting notification_read event with count:', newUnreadCount);
            DeviceEventEmitter.emit('notification_read', { count: newUnreadCount });
          }
        }
      }
    } catch (error) {
      console.error('Error loading notification:', error);
    } finally {
      setLoading(false);
    }
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

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return format(date, 'PPpp'); // Example: "Apr 29, 2023, 3:30 PM"
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => {
              getUnreadCount().then(count => {
                DeviceEventEmitter.emit('notification_read', { count });
              });
              router.back();
            }}
          >
            <Ionicons name="arrow-back" size={24} color={BRAND_COLORS.primaryText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification</Text>
          <View style={styles.rightSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!notification) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => {
              getUnreadCount().then(count => {
                DeviceEventEmitter.emit('notification_read', { count });
              });
              router.back();
            }}
          >
            <Ionicons name="arrow-back" size={24} color={BRAND_COLORS.primaryText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification</Text>
          <View style={styles.rightSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Notification not found</Text>
          <TouchableOpacity 
            style={styles.goBackButton} 
            onPress={() => {
              getUnreadCount().then(count => {
                DeviceEventEmitter.emit('notification_read', { count });
              });
              router.back();
            }}
          >
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            // When going back, make sure we update badge counts
            // by emitting another event
            getUnreadCount().then(count => {
              console.log('Going back, emitting notification_read with count:', count);
              DeviceEventEmitter.emit('notification_read', { count });
            });
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={24} color={BRAND_COLORS.primaryText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{notification.title}</Text>
        <View style={styles.rightSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.notificationMeta}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name={getIconForNotificationType(notification.type)} 
              size={32} 
              color={BRAND_COLORS.accent} 
            />
          </View>
          <Text style={styles.date}>{formatDateTime(notification.date)}</Text>
        </View>

        <Text style={styles.bodyTitle}>{notification.title}</Text>
        <Text style={styles.bodyText}>{notification.body}</Text>

        {notification.data && Object.keys(notification.data).length > 0 && (
          <View style={styles.additionalInfo}>
            <Text style={styles.additionalInfoTitle}>Additional Information</Text>
            {Object.entries(notification.data).map(([key, value]) => (
              <View key={key} style={styles.dataItem}>
                <Text style={styles.dataKey}>{key}:</Text>
                <Text style={styles.dataValue}>
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {notification.action && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              if (notification.action.screen) {
                router.push(notification.action.screen);
              }
            }}
          >
            <Text style={styles.actionButtonText}>
              {notification.action.title || 'View'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
    marginHorizontal: 8,
  },
  rightSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND_COLORS.background === '#FFFFFF' ? '#F0F7FF' : '#1A2733',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  date: {
    color: BRAND_COLORS.secondaryText || '#888',
    fontSize: 14,
  },
  bodyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryText,
    marginBottom: 16,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 24,
    color: BRAND_COLORS.primaryText,
    marginBottom: 24,
  },
  additionalInfo: {
    backgroundColor: BRAND_COLORS.background === '#FFFFFF' ? '#F5F5F5' : '#222',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  additionalInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: BRAND_COLORS.primaryText,
  },
  dataItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dataKey: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND_COLORS.primaryText,
    marginRight: 8,
    width: 100,
  },
  dataValue: {
    flex: 1,
    fontSize: 14,
    color: BRAND_COLORS.secondaryText || '#888',
  },
  actionButton: {
    backgroundColor: BRAND_COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 16,
    color: '#888',
    marginBottom: 16,
  },
  goBackButton: {
    backgroundColor: BRAND_COLORS.accent,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  goBackText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 