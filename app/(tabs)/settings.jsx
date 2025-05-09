import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  Dimensions,
  Linking,
  TextInput,
  DeviceEventEmitter
} from 'react-native';
import ProfileSection from '../../components/ProfileSection'; 
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../context/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BRAND_COLORS } from '../styles/brandColors';
import { storeEncrypted, getEncrypted } from '../../app/utils/encryptedStorage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';
import { getUnreadCount } from '../utils/notificationStorage';
import { 
  isBiometricAvailable, 
  setBiometricAuthEnabled, 
  getBiometricAuthEnabled
} from '../../app/utils/biometricAuth';
import { sendTestNotification, simulateManualPushNotification } from '../utils/notificationTest';
import * as StoreReview from 'expo-store-review';
import * as Constants from 'expo-constants';

const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}`;
const { width, height } = Dimensions.get('window');

// Reusable toggle component to ensure consistent formatting
const PreferenceToggle = ({ title, description, value, onToggle, isLast = false }) => {
  return (
    <View style={[
      styles.settingItem, 
      isLast && { borderBottomWidth: 0 }
    ]}>
      <View style={styles.settingTextContainer}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#767577', true: BRAND_COLORS.accent }}
        thumbColor={value ? '#fff' : '#f4f3f4'}
        ios_backgroundColor="#3e3e3e"
      />
    </View>
  );
};

const AdminPushTokenSection = () => {
  const [expoPushToken, setExpoPushToken] = useState(null); // Start as null
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setError('');
    registerForPushNotificationsAsync()
      .then(token => {
        if (token && !token.startsWith('Error:') && token !== 'Permissions denied' && token !== 'Simulator: No token available') {
          setExpoPushToken(token);
        } else {
          setError(token || 'Failed to get token'); // Display error or denial message
          setExpoPushToken(null); // Ensure token is null on error/denial
        }
      })
      .catch(err => { // Catch any unexpected errors from the promise itself
        console.error('Unexpected error in registerForPushNotificationsAsync:', err);
        setError(`Unexpected error: ${err.message}`);
        setExpoPushToken(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleCopy = async () => {
    if (expoPushToken) {
      await Clipboard.setStringAsync(expoPushToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const renderTokenContent = () => {
    if (isLoading) {
      return <ActivityIndicator size="small" color={BRAND_COLORS.accent} />;
    }
    if (error) {
      return <Text style={{ color: 'red', fontSize: 13 }}>{error}</Text>;
    }
    if (expoPushToken) {
      return (
        <>
          <Text
            selectable
            style={{ fontSize: 13, color: 'blue', flex: 1, marginRight: 8 }}
            numberOfLines={1}
          >
            {expoPushToken}
          </Text>
          <TouchableOpacity
            onPress={handleCopy}
            style={{ backgroundColor: '#eee', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}
          >
            <Text style={{ color: 'black', fontSize: 13 }}>
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </TouchableOpacity>
        </>
      );
    }
    // Fallback case if something unexpected happens
    return <Text style={{ color: 'gray', fontSize: 13 }}>Token unavailable</Text>; 
  };

  return (
    <View style={{ padding: 10 }}>
      <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Expo Push Token:</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 25 /* Ensure space for indicator/text */ }}>
        {renderTokenContent()}
      </View>
      {error === 'Permissions denied' && (
         <TouchableOpacity onPress={() => Linking.openSettings()} style={{marginTop: 5}}>
             <Text style={{color: BRAND_COLORS.accent, fontSize: 12}}>Open Settings to Grant Permissions</Text>
         </TouchableOpacity>
      )}
    </View>
  );
};

async function registerForPushNotificationsAsync() {
  let token;
  if (!Device.isDevice) {
    console.warn('Must use physical device for Push Notifications');
    return null; 
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permissions denied!');
      return 'Permissions denied'; 
    }

    // Get the token
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Expo Push Token:', token);
    return token;

  } catch (error) {
    console.error('Error getting push token:', error);
    return `Error: ${error.message}`; 
  }
}

// This is our collapsible section component, using the same pattern as ProfileSection
const CollapsibleSection = ({ title, children }) => {
  // Start collapsed by default
  const [expanded, setExpanded] = useState(false);
  
  const toggleSection = () => {
    setExpanded(prev => !prev);
  };
  
  return (
    <View style={styles.section}>
      <TouchableOpacity 
        style={styles.sectionHeader} 
        onPress={toggleSection}
        activeOpacity={0.6}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        <Ionicons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={24} 
          color="#333" 
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.sectionContent}>
          {children}
        </View>
      )}
    </View>
  );
};

export default function SettingsScreen() {
  const { isAuthenticated, token, userId, logout, checkAuthentication } = useAuth();
  const router = useRouter();
  
  // Move biometric hooks here
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [savingPreference, setSavingPreference] = useState(null);
  const [tokenCheckDone, setTokenCheckDone] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Email preferences
  const [newsletters, setNewsletters] = useState(true);
  const [eventUpdates, setEventUpdates] = useState(true);
  const [artistAlerts, setArtistAlerts] = useState(true);
  
  // Notification preferences
  const [newShows, setNewShows] = useState(true);
  const [artistUpdates, setArtistUpdates] = useState(true);
  const [appUpdates, setAppUpdates] = useState(true);
  
  // Renamed 'events' to 'eventNotifications' to avoid conflict
  const [preferences, setPreferences] = useState({
    artistAlerts: false,
    eventAlerts: false,
    newsletters: false
  });
  
  // First, make sure you have the userProfile state defined at the top of your component:
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  
  // Load unread notification count
  useEffect(() => {
    const loadUnreadCount = async () => {
      const count = await getUnreadCount();
      setUnreadCount(count);
    };
    
    // Load immediately
    loadUnreadCount();
    
    // Create a notification subscription - this will catch new notifications
    const subscription = Notifications.addNotificationReceivedListener(() => {
      loadUnreadCount();
    });
    
    // Also listen for notification_read events from other screens
    const readEventSubscription = DeviceEventEmitter.addListener(
      'notification_read',
      (data) => {
        console.log('Received notification_read event with count:', data.count);
        setUnreadCount(data.count);
      }
    );
    
    // Listen for new notification stored events
    const storedEventSubscription = DeviceEventEmitter.addListener(
      'notification_stored',
      (data) => {
        console.log('Received notification_stored event with count:', data.count);
        setUnreadCount(data.count);
      }
    );
    
    // Clean up subscriptions on component unmount
    return () => {
      subscription.remove();
      readEventSubscription.remove();
      storedEventSubscription.remove();
    };
  }, []);
  
  // Separate useEffect for handling route state changes
  useEffect(() => {
    // Refresh count when router state changes (i.e., when navigating back to this screen)
    const loadUnreadCount = async () => {
      const count = await getUnreadCount();
      setUnreadCount(count);
    };
    
    loadUnreadCount();
    console.log('Settings screen focused, refreshing notification count');
  }, [router.state]);
  
  // Check token before any data fetch
  useEffect(() => {
    const checkToken = async () => {
      try {
        const isAuth = await checkAuthentication();
        if (!isAuth) {
          console.log('Not authenticated, redirecting to login');
          router.replace('/login');
        } else {
          setTokenCheckDone(true);
        }
      } catch (error) {
        console.error('Error checking token:', error);
        setTokenCheckDone(true);
      }
    };
    
    checkToken();
  }, []);
  
  // Add this useEffect to check biometric availability
  useEffect(() => {
    const checkBiometrics = async () => {
      const biometricStatus = await isBiometricAvailable();
      
      if (biometricStatus.available) {
        setBiometricSupported(true);
        setBiometricType(biometricStatus.biometryType);
        
        // Load user's preference
        const enabled = await getBiometricAuthEnabled();
        setBiometricEnabled(enabled);
      }
    };
    
    checkBiometrics();
  }, []);

  // Add a function to handle toggling biometric auth
  const handleToggleBiometricAuth = async (value) => {
    await setBiometricAuthEnabled(value);
    setBiometricEnabled(value);
  };
  
  // Fetch user data after token check is complete
  useEffect(() => {
    if (tokenCheckDone && isAuthenticated) {
      fetchUserData();
    } else if (tokenCheckDone) {
      setLoading(false);
    }
  }, [tokenCheckDone, isAuthenticated]);
  
  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if token exists
      if (!token) {
        console.log('No token available for API request');
        setLoading(false);
        return;
      }
      
      console.log('Fetching user data with token:', token.slice(0, 10) + '...');
      
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/users/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('User data received:', response.data ? 'success' : 'empty');
      
      // Store user data
      if (response.data) {
        setUser(response.data);
        
        console.log('Raw API response data:', response.data);
        console.log('Notification preferences from API:', response.data.notificationPreferences);
        console.log('Newsletters from API:', response.data.newsletters);
        
        // Extract and map preferences - use explicit boolean conversion
        const mappedPreferences = {
          artistAlerts: response.data.notificationPreferences?.artistAlerts === true,
          eventAlerts: response.data.notificationPreferences?.eventAlerts === true,
          newsletters: response.data.newsletters === true
        };
        
        console.log('Mapped preferences as explicit booleans:', mappedPreferences);
        
        // Set the initial preferences state
        setPreferences(mappedPreferences);
      } else {
        console.error('Invalid user data format in response:', response.data);
        Alert.alert('Error', 'Received invalid user data format from server');
      }
      
    } catch (error) {
      console.error('Error fetching user data:', error);
      
      // Handle unauthorized errors
      if (error.response && error.response.status === 401) {
        console.log('Unauthorized access, clearing tokens');
        // Clear tokens and redirect
        await SecureStore.deleteItemAsync('userToken');
        await AsyncStorage.removeItem('user');
      } else {
        Alert.alert('Error', 'Failed to load your profile information');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);
  
  // Add a debugging function to inspect preferences state
  const logPreferencesState = (message) => {
    console.log(`--- ${message} ---`);
    console.log(`artistAlerts: ${preferences.artistAlerts}`);
    console.log(`eventAlerts: ${preferences.eventAlerts}`);
    console.log(`newsletters: ${preferences.newsletters}`);
    console.log('--------------------');
  };

  const handleTogglePreference = async (key) => {
    try {
      // Define mappings
      const prefMappings = {
        'artistAlerts': { field: 'notificationPreferences', key: 'artistAlerts' },
        'eventAlerts': { field: 'notificationPreferences', key: 'eventAlerts' },
        'newsletters': { field: 'root', key: 'newsletters' }
      };
      
      const mapping = prefMappings[key];
      if (!mapping) {
        console.error(`No backend mapping found for ${key}`);
        return;
      }
      
      // Log before state
      console.log(`--- BEFORE toggle ---`);
      console.log(`Current preferences state:`, preferences);
      
      // Get current value and new value
      const currentValue = preferences[key] === true;
      const newValue = !currentValue;
      
      console.log(`Toggling ${key} from ${currentValue} to ${newValue}`);
      
      // Store the previous preferences for rollback if needed
      const prevPreferences = {...preferences};
      
      // Optimistically update UI - only update the one that changed
      setPreferences(prev => ({
        ...prev, // Keep all existing values
        [key]: newValue // Only update the one that changed
      }));
      
      // Create update data
      const notificationPrefs = { ...(user?.notificationPreferences || {}) };
      let updateData = {};
      
      // Set the specific preference that's being updated
      if (mapping.field === 'notificationPreferences') {
        notificationPrefs[mapping.key] = newValue;
        updateData.notificationPreferences = notificationPrefs;
      } else if (mapping.field === 'root') {
        // For root level fields like newsletters
        updateData[mapping.key] = newValue;
      }
      
      console.log('Sending preference update to backend:', JSON.stringify(updateData, null, 2));
      
      // Store the expected updated value to confirm API behavior
      const expectedNewValue = newValue;
      
      // Send update to backend
      const response = await axios.patch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/users/me`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Preference update response:', JSON.stringify(response.data, null, 2));
      
      // Update user data with response
      if (response.data) {
        setUser(response.data);
        
        // Extract updated preferences from the response
        const updatedRawPrefs = {
          newsletters: response.data.newsletters,
          notificationPreferences: response.data.notificationPreferences || {}
        };
        
        // Log raw values from server to debug
        console.log('Raw notificationPreferences from server:', updatedRawPrefs.notificationPreferences);
        console.log('Raw newsletters from server:', updatedRawPrefs.newsletters);
        
        // Check if the preference objects from server are empty or null
        const notificationPrefsEmpty = !updatedRawPrefs.notificationPreferences || 
                                     Object.keys(updatedRawPrefs.notificationPreferences).length === 0;
        const newslettersEmpty = updatedRawPrefs.newsletters === undefined;
        
        console.log(`Server returned empty data - notificationPreferences: ${notificationPrefsEmpty}, newsletters: ${newslettersEmpty}`);
        
        // If server returned empty objects, preserve our current preferences except for the one we just changed
        if (notificationPrefsEmpty || newslettersEmpty) {
          console.log('Server returned empty preference data, preserving current preferences');
          
          // Clone current preferences to build from
          if (notificationPrefsEmpty) {
            // Create notificationPreferences based on current preferences state
            updatedRawPrefs.notificationPreferences = {
              artistAlerts: preferences.artistAlerts,
              eventAlerts: preferences.eventAlerts
            };
            
            // Override just the one we changed
            if (mapping.field === 'notificationPreferences') {
              updatedRawPrefs.notificationPreferences[mapping.key] = expectedNewValue;
            }
          }
          
          if (newslettersEmpty) {
            // Set newsletters from current state
            updatedRawPrefs.newsletters = preferences.newsletters;
            
            // Override if this is what was changed
            if (mapping.field === 'root' && mapping.key === 'newsletters') {
              updatedRawPrefs.newsletters = expectedNewValue;
            }
          }
          
          console.log('Reconstructed preferences to use:', updatedRawPrefs);
        }
        
        // Check if server returned the expected value for the changed preference
        let serverReturnedCorrectValue = false;
        if (mapping.field === 'notificationPreferences') {
          serverReturnedCorrectValue = updatedRawPrefs.notificationPreferences[mapping.key] === expectedNewValue;
        } else if (mapping.field === 'root') {
          serverReturnedCorrectValue = updatedRawPrefs[mapping.key] === expectedNewValue;
        }
        
        console.log(`Server returned the expected value (${expectedNewValue}) for ${key}: ${serverReturnedCorrectValue}`);
        
        if (!serverReturnedCorrectValue) {
          console.log('Server did not return the expected value for this preference');
          console.log('Using local state instead of server response for this preference');
          
          // Override the server value with our expected value since server didn't save it
          if (mapping.field === 'notificationPreferences') {
            updatedRawPrefs.notificationPreferences[mapping.key] = expectedNewValue;
          } else if (mapping.field === 'root') {
            updatedRawPrefs[mapping.key] = expectedNewValue;
          }
        }
        
        // Map the response to our frontend preferences state
        const updatedMappedPrefs = {
          artistAlerts: updatedRawPrefs.notificationPreferences.artistAlerts === true,
          eventAlerts: updatedRawPrefs.notificationPreferences.eventAlerts === true,
          newsletters: updatedRawPrefs.newsletters === true
        };
        
        console.log('Actual preferences being set:', updatedMappedPrefs);
        
        // Update preferences state with all values from the backend (or overridden)
        setPreferences(updatedMappedPrefs);
        
        console.log(`--- AFTER API response ---`);
        console.log(`Updated preferences state:`, updatedMappedPrefs);
      } else {
        // If response doesn't contain user data, revert to previous state
        console.log('Invalid response, reverting to previous state:', prevPreferences);
        setPreferences(prevPreferences);
        Alert.alert('Update Failed', 'Server response missing user data. Please try again.');
      }
      
    } catch (error) {
      console.error('Error updating preference:', error);
      
      // On error, revert to previous preferences state
      setPreferences(prevPreferences);
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Status code:', error.response.status);
      }
      
      Alert.alert(
        'Update Failed',
        'Failed to update preference. Please try again.'
      );
    }
  };
  
  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('userToken');
      await AsyncStorage.removeItem('user');
      // Call the logout function from the auth context
      if (logout) {
        logout();
      }
      router.replace('/login');
      
      // Clear saved credentials
      await SecureStore.deleteItemAsync('userEmail');
      await SecureStore.deleteItemAsync('userPassword');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };
  
  // If not logged in, show login prompt
  if (!isAuthenticated && tokenCheckDone) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notLoggedInContainer}>
          <Text style={styles.notLoggedInText}>
            You need to be logged in to access your profile
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.buttonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLORS.accent} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Inside your Settings component, add this function to handle app store reviews
  const handleAppReview = async () => {
    try {
      // Check if the device can open the store
      const canReview = await StoreReview.hasAction();
      
      if (canReview) {
        // Use the StoreReview API on iOS (opens in-app review prompt)
        if (Platform.OS === 'ios') {
          StoreReview.requestReview();
        } else {
          // For Android, we'll open the store page directly
          // Replace with your actual package name when available
          const packageName = 'com.voicesradio.app'; // This is a placeholder
          Linking.openURL(`market://details?id=${packageName}`);
        }
      } else {
        // Fallback to store URLs if in-app review isn't available
        const storeUrl = Platform.OS === 'ios'
          ? 'https://apps.apple.com/app/idYOUR_APP_ID' // Replace with your App Store ID
          : 'https://play.google.com/store/apps/details?id=com.voicesradio.app'; // Replace with your package name
        
        Linking.openURL(storeUrl);
      }
    } catch (error) {
      console.error('Failed to open app store review:', error);
      Alert.alert('Error', 'Could not open the app store. Please try again later.');
    }
  };

  // Function to handle sending feedback email
  const handleSendFeedback = () => {
    try {
      // Get app and device info for the email
      const appVersion = Constants.expoConfig?.version || 'Unknown';
      const deviceInfo = `${Device.modelName || 'Unknown device'} (${Platform.OS} ${Platform.Version})`;
      
      // Create email URI with subject and body
      const emailSubject = encodeURIComponent(`Voices Radio App Feedback - v${appVersion}`);
      const emailBody = encodeURIComponent(
        `\n\n\n--\nApp version: ${appVersion}\nDevice: ${deviceInfo}`
      );
      
      Linking.openURL(`mailto:voices.general@gmail.com?subject=${emailSubject}&body=${emailBody}`);
    } catch (error) {
      console.error('Failed to open email client:', error);
      Alert.alert('Error', 'Could not open email client. Please send feedback to voices.general@gmail.com');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>My Profile</Text>
          <TouchableOpacity 
            style={styles.notificationBell} 
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={BRAND_COLORS.accent} />
            {unreadCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Use the ProfileSection component with isExpanded=false */}
        <ProfileSection 
          router={router} 
          handleLogout={handleLogout} 
          isExpanded={false}
          token={token}
        />
        
        {/* App Notifications Section - using the new CollapsibleSection */}
        <CollapsibleSection title="App Notifications">
          <View style={styles.preferencesContainer}>
            {console.log('RENDERING Artist Alerts toggle:', preferences)}
            <PreferenceToggle 
              title="Artist Alerts"
              description="Get notified just before your favourite artists go live"
              value={Boolean(preferences.artistAlerts)}
              onToggle={() => {
                console.log('Artist Alerts toggle pressed, current value:', preferences.artistAlerts);
                handleTogglePreference('artistAlerts');
              }}
            />
            
            {console.log('RENDERING Events toggle:', preferences)}
            <PreferenceToggle 
              title="Event Alerts"
              description="Receive notifications about upcoming events"
              value={Boolean(preferences.eventAlerts)}
              onToggle={() => {
                console.log('Events toggle pressed, current value:', preferences.eventAlerts);
                handleTogglePreference('eventAlerts');
              }}
              isLast={true}
            />
          </View>
        </CollapsibleSection>
        
        {/* Email Preferences Section */}
        <CollapsibleSection title="Email Preferences">
          <View style={styles.preferencesContainer}>
            {console.log('RENDERING Newsletters toggle:', preferences)}
            <PreferenceToggle 
              title="Newsletters"
              description="Receive our weekly newsletter"
              value={Boolean(preferences.newsletters)}
              onToggle={() => {
                console.log('Newsletters toggle pressed, current value:', preferences.newsletters);
                handleTogglePreference('newsletters');
              }}
              isLast={true}
            />
          </View>
        </CollapsibleSection>
        
        {/* Account Actions */}
        <CollapsibleSection title="Account">
          <View style={styles.accountContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/change-password')}
            >
              <Ionicons name="key-outline" size={20} color={BRAND_COLORS.black} />
              <Text style={styles.actionButtonText}>Change Password</Text>
              <Ionicons name="chevron-forward" size={20} color={BRAND_COLORS.black} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.logoutActionButton]}
              onPress={() => {
                Alert.alert(
                  'Logout',
                  'Are you sure you want to logout?',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel'
                    },
                    {
                      text: 'Logout',
                      onPress: handleLogout
                    }
                  ]
                );
              }}
            >
              <Ionicons name="log-out-outline" size={20} color={BRAND_COLORS.accent} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </CollapsibleSection>
        
        {/* About Section */}
        <CollapsibleSection title="About">
          <View style={styles.accountContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.lastActionButton]}
              onPress={() => router.push('/about')}
            >
              <Ionicons name="information-circle-outline" size={20} color={BRAND_COLORS.black} />
              <Text style={styles.actionButtonText}>About Voices Radio</Text>
              <Ionicons name="chevron-forward" size={20} color={BRAND_COLORS.black} />
            </TouchableOpacity>
          </View>
        </CollapsibleSection>
        
        {/* Admin Section 
        <CollapsibleSection title="Admin">
          <AdminPushTokenSection />
        </CollapsibleSection>*/}
        
        {/* Security Section */}
        <CollapsibleSection title="Security">
          {biometricSupported ? (
            <View style={styles.preferencesContainer}>
              <PreferenceToggle 
                title={`${biometricType} Login`}
                description={`Use ${biometricType} to login to your account`}
                value={biometricEnabled}
                onToggle={handleToggleBiometricAuth}
                isLast={true}
              />
            </View>
          ) : (
            <View style={styles.preferencesContainer}>
              <Text style={{padding: 14, color: '#666'}}>
                Biometric authentication is not available on this device
              </Text>
            </View>
          )}
        </CollapsibleSection>
        
        {/* Developer/Debug Section 
        <CollapsibleSection title="Developer">
          <View style={styles.accountContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={async () => {
                try {
                  const success = await sendTestNotification();
                  if (success) {
                    Alert.alert(
                      "Test Notification Sent", 
                      "A test notification has been triggered. You should see it appear even if the app is in the foreground."
                    );
                  } else {
                    Alert.alert(
                      "Error", 
                      "Failed to send test notification. Check console for details."
                    );
                  }
                } catch (error) {
                  console.error("Error sending test notification:", error);
                  Alert.alert("Error", "An unexpected error occurred");
                }
              }}
            >
              <Ionicons name="notifications-outline" size={20} color={BRAND_COLORS.black} />
              <Text style={styles.actionButtonText}>Test Notification</Text>
              <Ionicons name="chevron-forward" size={20} color={BRAND_COLORS.black} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={async () => {
                try {
                  const { debugNotificationCount } = require('../utils/notificationTest');
                  await debugNotificationCount();
                  Alert.alert("Debug", "Notification count debug test executed. Check console logs.");
                } catch (error) {
                  console.error("Error in notification debug:", error);
                  Alert.alert("Error", "Failed to run debug test");
                }
              }}
            >
              <Ionicons name="bug-outline" size={20} color={BRAND_COLORS.black} />
              <Text style={styles.actionButtonText}>Debug Badge Count</Text>
              <Ionicons name="chevron-forward" size={20} color={BRAND_COLORS.black} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                Alert.alert(
                  "Simulate Manual Notification", 
                  "Choose a notification type to simulate:", 
                  [
                    {
                      text: "Event Notification",
                      onPress: async () => {
                        await simulateManualPushNotification('event');
                      }
                    },
                    {
                      text: "Artist Notification",
                      onPress: async () => {
                        await simulateManualPushNotification('artist');
                      }
                    },
                    {
                      text: "Promo Notification",
                      onPress: async () => {
                        await simulateManualPushNotification('promo');
                      }
                    },
                    {
                      text: "System Notification",
                      onPress: async () => {
                        await simulateManualPushNotification('system');
                      }
                    },
                    {
                      text: "Cancel",
                      style: "cancel"
                    }
                  ]
                );
              }}
            >
              <Ionicons name="planet-outline" size={20} color={BRAND_COLORS.black} />
              <Text style={styles.actionButtonText}>Simulate Manual Notification</Text>
              <Ionicons name="chevron-forward" size={20} color={BRAND_COLORS.black} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.lastActionButton]}
              onPress={() => router.push('/admin-panel')}
            >
              <Ionicons name="construct-outline" size={20} color={BRAND_COLORS.black} />
              <Text style={styles.actionButtonText}>Admin Panel</Text>
              <Ionicons name="chevron-forward" size={20} color={BRAND_COLORS.black} />
            </TouchableOpacity>
          </View>
        </CollapsibleSection>*/}
        
        {/* Change the Feedback section to a CollapsibleSection */}
        <CollapsibleSection title="Feedback">
          <View style={styles.accountContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleAppReview}
            >
              <Ionicons name="star-outline" size={20} color={BRAND_COLORS.black} />
              <Text style={styles.actionButtonText}>Leave a Review</Text>
              <Ionicons name="chevron-forward" size={20} color={BRAND_COLORS.black} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.lastActionButton]}
              onPress={handleSendFeedback}
            >
              <Ionicons name="mail-outline" size={20} color={BRAND_COLORS.black} />
              <Text style={styles.actionButtonText}>Send Feedback</Text>
              <Ionicons name="chevron-forward" size={20} color={BRAND_COLORS.black} />
            </TouchableOpacity>
          </View>
        </CollapsibleSection>
        
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
    width: width,
    height: height
  },
  contentContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 130 : 110,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BRAND_COLORS.accent,
  },
  // Section styles - same as in ProfileSection
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: BRAND_COLORS.black,
  },
  sectionContent: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#F9F9F9',
  },
  // Other styles
  profileContainer: {
    padding: 15,
  },
  profileInfo: {
    marginBottom: 15,
  },
  profileLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  profileValue: {
    fontSize: 16,
    color: BRAND_COLORS.black,
    fontWeight: '500',
  },
  preferencesContainer: {
    padding: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  accountContainer: {
    padding: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: BRAND_COLORS.black,
    marginLeft: 10,
  },
  lastActionButton: {
    borderBottomWidth: 0,
  },
  logoutActionButton: {
    borderBottomWidth: 0,
  },
  logoutText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: BRAND_COLORS.accent,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: 'gray',
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notLoggedInText: {
    fontSize: 18,
    color: BRAND_COLORS.black,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: BRAND_COLORS.accent,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 250,
  },
  buttonText: {
    color: BRAND_COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    color: 'gray',
    fontSize: 12,
    marginTop: 16,
  },
  notificationBell: {
    padding: 5,
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BRAND_COLORS.background,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
}); 