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
  TextInput,
  SafeAreaView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../context/auth';

const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}`;

const BRAND_COLORS = {
  beige: '#e5d7be',
  black: '#131200',
  redOrange: '#d34e24'
};

export default function SettingsScreen() {
  const { isLoggedIn, setIsLoggedIn, token, userId, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
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
      
      console.log('Using token for auth:', token);
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      // Use the correct endpoint
      const response = await axios.get(`${API_URL}/api/users/me`, {
        headers: { 
          Authorization: `Bearer ${token}` 
        }
      });
      
      const userData = response.data;
      console.log('User data received:', userData);
      setUser(userData);
      
      // Set form fields
      setFirstName(userData.firstName || '');
      setLastName(userData.lastName || '');
      setCity(userData.location?.city || '');
      setCountry(userData.location?.country || '');
      
      // Set email preferences
      setNewsletters(userData.emailPreferences?.newsletters ?? true);
      setEventUpdates(userData.emailPreferences?.eventUpdates ?? true);
      setArtistAlerts(userData.emailPreferences?.artistAlerts ?? true);
      setMarketingEmails(userData.emailPreferences?.marketingEmails ?? false);
      
      // Set notification preferences
      setNewShows(userData.notificationPreferences?.newShows ?? true);
      setArtistUpdates(userData.notificationPreferences?.artistUpdates ?? true);
      setAppUpdates(userData.notificationPreferences?.appUpdates ?? true);
      
    } catch (error) {
      console.error('Error fetching user data:', error);
      
      // Log more detailed error info
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error message:', error.message);
      }
      
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };
  
  const saveUserData = async () => {
    if (!isLoggedIn || !token) return;
    
    try {
      setLoading(true);
      
      const updatedUserData = {
        firstName,
        lastName,
        location: {
          city,
          country
        },
        emailPreferences: {
          newsletters,
          eventUpdates,
          artistAlerts,
          marketingEmails
        },
        notificationPreferences: {
          newShows,
          artistUpdates,
          appUpdates
        }
      };
      
      console.log('Sending update with token:', token);
      console.log('Update data:', updatedUserData);
      
      // Change this to PATCH instead of PUT to match your backend endpoint
      const response = await axios.patch(`${API_URL}/api/users/me`, updatedUserData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Update response:', response.data);
      Alert.alert('Success', 'Your profile has been updated');
      setEditMode(false);
      
      // Update the local state with the response data
      setUser(response.data);
      
    } catch (error) {
      console.error('Error updating user data:', error);
      
      // Log more detailed error info
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error message:', error.message);
      }
      
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
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
          <ActivityIndicator size="large" color={BRAND_COLORS.redOrange} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          {!editMode ? (
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setEditMode(true)}
            >
              <Ionicons name="create-outline" size={24} color={BRAND_COLORS.redOrange} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.editButton}
              onPress={saveUserData}
            >
              <Ionicons name="save-outline" size={24} color={BRAND_COLORS.redOrange} />
              <Text style={styles.editButtonText}>Save</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.formRow}>
            <Text style={styles.label}>First Name</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First Name"
              />
            ) : (
              <Text style={styles.value}>{firstName}</Text>
            )}
          </View>
          
          <View style={styles.formRow}>
            <Text style={styles.label}>Last Name</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last Name"
              />
            ) : (
              <Text style={styles.value}>{lastName}</Text>
            )}
          </View>
          
          <View style={styles.formRow}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user?.email}</Text>
          </View>
        </View>
        
        {/* Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          <View style={styles.formRow}>
            <Text style={styles.label}>City</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="City"
              />
            ) : (
              <Text style={styles.value}>{city || 'Not specified'}</Text>
            )}
          </View>
          
          <View style={styles.formRow}>
            <Text style={styles.label}>Country</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={country}
                onChangeText={setCountry}
                placeholder="Country"
              />
            ) : (
              <Text style={styles.value}>{country || 'Not specified'}</Text>
            )}
          </View>
        </View>
        
        {/* Email Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email Preferences</Text>
          
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>Newsletters</Text>
              <Text style={styles.switchDescription}>
                Receive our weekly newsletter
              </Text>
            </View>
            <Switch
              value={newsletters}
              onValueChange={setNewsletters}
              trackColor={{ false: '#ccc', true: BRAND_COLORS.redOrange }}
              thumbColor="#fff"
              disabled={!editMode}
            />
          </View>
          
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>Event Updates</Text>
              <Text style={styles.switchDescription}>
                Get notified about upcoming events
              </Text>
            </View>
            <Switch
              value={eventUpdates}
              onValueChange={setEventUpdates}
              trackColor={{ false: '#ccc', true: BRAND_COLORS.redOrange }}
              thumbColor="#fff"
              disabled={!editMode}
            />
          </View>
          
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>Artist Alerts</Text>
              <Text style={styles.switchDescription}>
                Get updates from your favorite artists
              </Text>
            </View>
            <Switch
              value={artistAlerts}
              onValueChange={setArtistAlerts}
              trackColor={{ false: '#ccc', true: BRAND_COLORS.redOrange }}
              thumbColor="#fff"
              disabled={!editMode}
            />
          </View>
          
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>Marketing Emails</Text>
              <Text style={styles.switchDescription}>
                Receive promotional offers and deals
              </Text>
            </View>
            <Switch
              value={marketingEmails}
              onValueChange={setMarketingEmails}
              trackColor={{ false: '#ccc', true: BRAND_COLORS.redOrange }}
              thumbColor="#fff"
              disabled={!editMode}
            />
          </View>
        </View>
        
        {/* Notification Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Notifications</Text>
          
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>New Shows</Text>
              <Text style={styles.switchDescription}>
                Get notified when new shows are added
              </Text>
            </View>
            <Switch
              value={newShows}
              onValueChange={setNewShows}
              trackColor={{ false: '#ccc', true: BRAND_COLORS.redOrange }}
              thumbColor="#fff"
              disabled={!editMode}
            />
          </View>
          
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>Artist Updates</Text>
              <Text style={styles.switchDescription}>
                Get notifications about your favorite artists
              </Text>
            </View>
            <Switch
              value={artistUpdates}
              onValueChange={setArtistUpdates}
              trackColor={{ false: '#ccc', true: BRAND_COLORS.redOrange }}
              thumbColor="#fff"
              disabled={!editMode}
            />
          </View>
          
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>App Updates</Text>
              <Text style={styles.switchDescription}>
                Get notified about app updates and new features
              </Text>
            </View>
            <Switch
              value={appUpdates}
              onValueChange={setAppUpdates}
              trackColor={{ false: '#ccc', true: BRAND_COLORS.redOrange }}
              thumbColor="#fff"
              disabled={!editMode}
            />
          </View>
        </View>
        
        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/change-password')}
          >
            <Ionicons name="key-outline" size={20} color={BRAND_COLORS.black} />
            <Text style={styles.actionButtonText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color={BRAND_COLORS.black} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/subscribed-artists')}
          >
            <Ionicons name="people-outline" size={20} color={BRAND_COLORS.black} />
            <Text style={styles.actionButtonText}>Subscribed Artists</Text>
            <Ionicons name="chevron-forward" size={20} color={BRAND_COLORS.black} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={BRAND_COLORS.redOrange} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.beige,
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
    color: BRAND_COLORS.redOrange,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButtonText: {
    marginLeft: 6,
    fontSize: 16,
    color: BRAND_COLORS.redOrange,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: BRAND_COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.black,
    marginBottom: 16,
  },
  formRow: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: BRAND_COLORS.black,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: BRAND_COLORS.black,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  switchTextContainer: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    color: BRAND_COLORS.black,
  },
  switchDescription: {
    fontSize: 12,
    color: 'gray',
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    color: BRAND_COLORS.redOrange,
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
    backgroundColor: BRAND_COLORS.redOrange,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 250,
  },
  buttonText: {
    color: BRAND_COLORS.beige,
    fontSize: 16,
    fontWeight: '600',
  },
}); 