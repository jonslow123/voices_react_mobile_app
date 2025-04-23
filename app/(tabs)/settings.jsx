import React, { useState, useEffect } from 'react';
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
  Animated, 
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../context/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BRAND_COLORS } from '../styles/brandColors';
import { storeEncrypted, getEncrypted } from '../../app/utils/encryptedStorage';
const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}`;
const { width, height } = Dimensions.get('window');

const CollapsibleSection = ({ title, children, initiallyExpanded = false }) => {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [height] = useState(new Animated.Value(initiallyExpanded ? 1 : 0));
  
  useEffect(() => {
    Animated.timing(height, {
      toValue: expanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [expanded, height]);
  
  const toggleExpand = () => {
    setExpanded(!expanded);
  };
  
  const maxHeight = height.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 500],  // Adjust maximum height as needed
  });
  
  return (
    <View style={styles.collapsibleSection}>
      <TouchableOpacity 
        style={styles.sectionHeader} 
        onPress={toggleExpand}
        activeOpacity={0.8}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        <Ionicons 
          name={expanded ? 'chevron-up' : 'chevron-down'} 
          size={24} 
          color={BRAND_COLORS.accent} 
        />
      </TouchableOpacity>
      
      <Animated.View style={[
        styles.collapsibleContent,
        { maxHeight, opacity: height }
      ]}>
        {children}
      </Animated.View>
    </View>
  );
};

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

export default function SettingsScreen() {
  const { isLoggedIn, setIsLoggedIn, token, userId, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [savingPreference, setSavingPreference] = useState(null);
  
  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  
  // Email preferences
  const [newsletters, setNewsletters] = useState(true);
  const [eventUpdates, setEventUpdates] = useState(true);
  const [artistAlerts, setArtistAlerts] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  
  // Notification preferences
  const [newShows, setNewShows] = useState(true);
  const [artistUpdates, setArtistUpdates] = useState(true);
  const [appUpdates, setAppUpdates] = useState(true);
  
  // First, make sure your preferences state is properly initialized:
  const [preferences, setPreferences] = useState({
    newShows: false,
    events: false,
    marketingEmails: false,
    newsletters: false
  });
  
  // First, make sure you have the userProfile state defined at the top of your component:
  const [userProfile, setUserProfile] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  
  // Fetch user data
  useEffect(() => {
    if (isLoggedIn) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn]);
  
  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/users/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('User data from backend:', JSON.stringify(response.data, null, 2));
      
      // Store user data
      setUser(response.data);
      
      // Extract and map preferences - use a very explicit mapping approach
      const mappedPreferences = {
        newShows: response.data.notificationPreferences?.newShows === true,
        events: response.data.emailPreferences?.eventUpdates === true,
        marketingEmails: response.data.emailPreferences?.marketingEmails === true,
        newsletters: response.data.emailPreferences?.newsletters === true
      };
      
      console.log('Initial preferences mapping:', mappedPreferences);
      
      // Set the initial preferences state
      setPreferences(mappedPreferences);
      
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load your profile information');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTogglePreference = async (key) => {
    try {
      // Define mappings
      const prefMappings = {
        'newShows': { field: 'notificationPreferences', key: 'newShows' },
        'events': { field: 'emailPreferences', key: 'eventUpdates' },
        'marketingEmails': { field: 'emailPreferences', key: 'marketingEmails' },
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
      
      console.log(`Toggling ${key} (${mapping.field}.${mapping.key}) from ${currentValue} to ${newValue}`);
      
      // Store the previous preferences for rollback if needed
      const prevPreferences = {...preferences};
      
      // Optimistically update UI for ONLY the changed toggle
      setPreferences(prev => ({
        ...prev, // Keep all existing values
        [key]: newValue // Only update the one that changed
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
      
      console.log('Sending update to backend:', JSON.stringify(updateData, null, 2));
      
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
      
      // This is critical - we need to properly map the entire response
      // But keep our optimistic UI update for the toggle that just changed
      const updatedMappedPrefs = {
        newShows: updatedRawPrefs.notificationPreferences.newShows === true,
        events: updatedRawPrefs.emailPreferences.eventUpdates === true,
        marketingEmails: updatedRawPrefs.emailPreferences.marketingEmails === true,
        newsletters: updatedRawPrefs.emailPreferences.newsletters === true
      };
      
      console.log('Backend response mapped to frontend:', updatedMappedPrefs);
      
      // Update our preferences state with all the values from the backend
      setPreferences(updatedMappedPrefs);
      
    } catch (error) {
      console.error('Error updating preference:', error);
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Status code:', error.response.status);
      }
      
      // On error, revert to previous preferences state 
      setPreferences(prevPreferences);
      
      Alert.alert(
        'Update Failed',
        'Failed to update notification preference. Please try again.'
      );
    }
  };
  
  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          onPress: () => {
            logout();
            router.replace('/login');
          }
        }
      ]
    );
  };
  
  // If not logged in, show login prompt
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notLoggedInContainer}>
          <Text style={styles.notLoggedInText}>
            You need to be logged in to access settings
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
  
  // Store preferences securely
  const savePreferences = async () => {
    await storeEncrypted('userPreferences', preferences);
  };

  // Load preferences
  const loadPreferences = async () => {
    const savedPreferences = await getEncrypted('userPreferences');
    if (savedPreferences) {
      setPreferences(savedPreferences);
    }
  };

  const resetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem('hasSeenOnboarding');
      // Restart app or navigate to index
      router.replace('/');
    } catch (error) {
      console.error('Error resetting onboarding status:', error);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>
        
        {/* Profile Information Section */}
        <CollapsibleSection title="Profile Information" initiallyExpanded={true}>
          <View style={styles.profileInfo}>
            <Text style={styles.profileLabel}>Name</Text>
            <Text style={styles.profileValue}>
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Not set'}
            </Text>
            
            <Text style={styles.profileLabel}>Email</Text>
            <Text style={styles.profileValue}>
              {user?.email || 'Not set'}
            </Text>
          </View>
        </CollapsibleSection>
        
        {/* App Notifications Section */}
        <CollapsibleSection title="App Notifications">
          <View style={styles.preferencesContainer}>
            {/* Using the reusable toggle component for consistent formatting */}
            <PreferenceToggle 
              title="New Shows"
              description="Get notified when new shows are added"
              value={preferences.newShows}
              onToggle={() => handleTogglePreference('newShows')}
            />
            
            <PreferenceToggle 
              title="Events"
              description="Receive notifications about upcoming events"
              value={preferences.events}
              onToggle={() => handleTogglePreference('events')}
              isLast={true}
            />
          </View>
        </CollapsibleSection>
        
        {/* Email Preferences Section */}
        <CollapsibleSection title="Email Preferences">
          <View style={styles.preferencesContainer}>
            <PreferenceToggle 
              title="Marketing Emails"
              description="Receive emails about our products and services"
              value={preferences.marketingEmails}
              onToggle={() => handleTogglePreference('marketingEmails')}
            />
            
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
              style={[styles.actionButton, styles.logoutButton]}
              onPress={handleLogout}
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
  profileInfo: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  profileLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  profileValue: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  preferencesContainer: {
    padding: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastActionButton: {
    borderBottomWidth: 0,
  },
  actionButtonText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: BRAND_COLORS.black,
  },
  logoutButton: {
    borderBottomWidth: 0,
  },
  logoutText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: BRAND_COLORS.accent,
    fontWeight: '500',
  },
  versionText: {
    textAlign: 'center',
    color: 'gray',
    fontSize: 12,
    marginTop: 16,
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
  collapsibleSection: {
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  collapsibleContent: {
    overflow: 'hidden',
  },
  accountContainer: {
    padding: 15,
  },
}); 