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
  TextInput
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
import { 
  isBiometricAvailable, 
  setBiometricAuthEnabled, 
  getBiometricAuthEnabled
} from '../../app/utils/biometricAuth';
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
  const { isLoggedIn, setIsLoggedIn, token, userId, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [savingPreference, setSavingPreference] = useState(null);
  const [tokenCheckDone, setTokenCheckDone] = useState(false);
  
  // Email preferences
  const [newsletters, setNewsletters] = useState(true);
  const [eventUpdates, setEventUpdates] = useState(true);
  const [artistAlerts, setArtistAlerts] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  
  // Notification preferences
  const [newShows, setNewShows] = useState(true);
  const [artistUpdates, setArtistUpdates] = useState(true);
  const [appUpdates, setAppUpdates] = useState(true);
  
  // Renamed 'events' to 'eventNotifications' to avoid conflict
  const [preferences, setPreferences] = useState({
    newShows: false,
    eventNotifications: false,
    newsletters: false
  });
  
  // First, make sure you have the userProfile state defined at the top of your component:
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  
  // Check token before any data fetch
  useEffect(() => {
    const checkToken = async () => {
      try {
        // Check if token exists in SecureStore
        const storedToken = await SecureStore.getItemAsync('userToken');
        
        if (!storedToken) {
          console.log('No stored token found, redirecting to login');
          setTokenCheckDone(true);
          return;
        }
        
        // If we get here, token exists, proceed with fetch
        setTokenCheckDone(true);
      } catch (error) {
        console.error('Error checking token:', error);
        setTokenCheckDone(true);
      }
    };
    
    checkToken();
  }, []);
  
  // Fetch user data after token check is complete
  useEffect(() => {
    if (tokenCheckDone && isLoggedIn) {
      fetchUserData();
    } else if (tokenCheckDone) {
      setLoading(false);
    }
  }, [tokenCheckDone, isLoggedIn]);
  
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
      setUser(response.data);
      
      // Extract and map preferences
      const mappedPreferences = {
        newShows: response.data.notificationPreferences?.newShows === true,
        eventNotifications: response.data.emailPreferences?.eventUpdates === true,
        newsletters: response.data.emailPreferences?.newsletters === true
      };
      
      // Set the initial preferences state
      setPreferences(mappedPreferences);
      
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
  
  const handleTogglePreference = async (key) => {
    try {
      // Define mappings
      const prefMappings = {
        'newShows': { field: 'notificationPreferences', key: 'newShows' },
        'eventNotifications': { field: 'emailPreferences', key: 'eventUpdates' },
        'newsletters': { field: 'emailPreferences', key: 'newsletters' }
      };
      
      const mapping = prefMappings[key];
      if (!mapping) {
        console.error(`No backend mapping found for ${key}`);
        return;
      }
      
      // Get current value and new value
      const currentValue = preferences[key] === true;
      const newValue = !currentValue;
      
      // Store the previous preferences for rollback if needed
      const prevPreferences = {...preferences};
      
      // Optimistically update UI
      setPreferences(prev => ({
        ...prev,
        [key]: newValue
      }));
      
      // Create update data
      const notificationPrefs = { ...(user.notificationPreferences || {}) };
      const emailPrefs = { ...(user.emailPreferences || {}) };
      
      if (mapping.field === 'notificationPreferences') {
        notificationPrefs[mapping.key] = newValue;
      } else {
        emailPrefs[mapping.key] = newValue;
      }
      
      const updateData = {
        notificationPreferences: notificationPrefs,
        emailPreferences: emailPrefs
      };
      
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
      
      // Update user data with response
      setUser(response.data);
      
      // Extract updated preferences from the response
      const updatedRawPrefs = {
        emailPreferences: response.data.emailPreferences || {},
        notificationPreferences: response.data.notificationPreferences || {}
      };
      
      const updatedMappedPrefs = {
        newShows: updatedRawPrefs.notificationPreferences.newShows === true,
        eventNotifications: updatedRawPrefs.emailPreferences.eventUpdates === true,
        newsletters: updatedRawPrefs.emailPreferences.newsletters === true
      };
      
      // Update preferences state with all values from the backend
      setPreferences(updatedMappedPrefs);
      
    } catch (error) {
      console.error('Error updating preference:', error);
      
      // On error, revert to previous preferences state
      setPreferences(prevPreferences);
      
      if (error.response && error.response.status === 401) {
        // Handle unauthorized errors
        await SecureStore.deleteItemAsync('userToken');
        await AsyncStorage.removeItem('user');
        router.replace('/login');
      } else {
        Alert.alert(
          'Update Failed',
          'Failed to update preference. Please try again.'
        );
      }
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
  if (!isLoggedIn && tokenCheckDone) {
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

  // Inside your SettingsScreen component
  // Add these state variables
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  const [biometricEnabled, setBiometricEnabled] = useState(false);

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>My Profile</Text>
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
            <PreferenceToggle 
              title="New Shows"
              description="Get notified when new shows are added"
              value={preferences.newShows}
              onToggle={() => handleTogglePreference('newShows')}
            />
            
            <PreferenceToggle 
              title="Events"
              description="Receive notifications about upcoming events"
              value={preferences.eventNotifications}
              onToggle={() => handleTogglePreference('eventNotifications')}
              isLast={true}
            />
          </View>
        </CollapsibleSection>
        
        {/* Email Preferences Section */}
        <CollapsibleSection title="Email Preferences">
          <View style={styles.preferencesContainer}>
            <PreferenceToggle 
              title="Newsletters"
              description="Receive our weekly newsletter"
              value={preferences.newsletters}
              onToggle={() => handleTogglePreference('newsletters')}
              isLast={true}
            />
          </View>
        </CollapsibleSection>
        
        {/* My Favorites Section */}
        <CollapsibleSection title="My Favorites">
          <View style={styles.accountContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.lastActionButton]}
              onPress={() => router.push('/subscribed-artists')}
            >
              <Ionicons name="star" size={20} color={BRAND_COLORS.black} />
              <Text style={styles.actionButtonText}>Subscribed Artists</Text>
              <Ionicons name="chevron-forward" size={20} color={BRAND_COLORS.black} />
            </TouchableOpacity>
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
        
        {/* Admin Section */}
        <CollapsibleSection title="Admin">
          <AdminPushTokenSection />
        </CollapsibleSection>
        
        {/* Security Section */}
        {biometricSupported && (
          <CollapsibleSection title="Security">
            <View style={styles.preferencesContainer}>
              <PreferenceToggle 
                title={`${biometricType} Login`}
                description={`Use ${biometricType} to login to your account`}
                value={biometricEnabled}
                onToggle={handleToggleBiometricAuth}
                isLast={true}
              />
            </View>
          </CollapsibleSection>
        )}
        
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
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
}); 