// In components/ProfileSection.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { BRAND_COLORS } from '../app/styles/brandColors';

// Debug the ProfileSection component
console.log('ProfileSection component loaded');

const ProfileSection = ({ router, handleLogout, isExpanded = false, token }) => {
  console.log('ProfileSection rendering with isExpanded:', isExpanded, 'hasToken:', !!token);
  
  // Initialize with the prop value, but ensure it's a boolean
  const [expanded, setExpanded] = useState(Boolean(isExpanded));
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  // Force update when the isExpanded prop changes
  useEffect(() => {
    console.log('ProfileSection useEffect - isExpanded changed to:', isExpanded);
    setExpanded(Boolean(isExpanded));
  }, [isExpanded]);

  const fetchUserData = useCallback(async () => {
    try {
      // First try to use the token passed via props
      let authToken = token;
      
      // If no token is provided via props, try to get it from SecureStore as fallback
      if (!authToken) {
        console.log('No token passed via props, checking SecureStore');
        authToken = await SecureStore.getItemAsync('userToken');
      }
      
      if (!authToken) {
        console.log('No token available for ProfileSection');
        return;
      }

      console.log('ProfileSection fetching user data with', authToken ? 'token' : 'no token');
      
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/users/me`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      console.log('ProfileSection received user data successfully');
      
      setUser(response.data);
      setFirstName(response.data.firstName || '');
      setLastName(response.data.lastName || '');
      setEmail(response.data.email || '');
    } catch (error) {
      console.error('Error fetching user data in ProfileSection:', error.message);
      
      // Don't redirect on error, just log it
      if (error.response && error.response.status === 401) {
        console.log('Unauthorized in ProfileSection');
      }
    }
  }, [token]); // Add token to dependency array

  useEffect(() => {
    // Only try to fetch if we have a token (either passed or in storage)
    if (token) {
      console.log('ProfileSection has token, fetching user data');
      fetchUserData();
    } else {
      console.log('ProfileSection waiting for token');
    }
  }, [fetchUserData, token]);

  const toggleSection = () => {
    console.log('ProfileSection toggleSection - changing from', expanded, 'to', !expanded);
    setExpanded(prev => !prev);
  };

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset form values to user data
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }

    setIsLoading(true);

    try {
      // First try to use the token passed via props
      let authToken = token;
      
      // If no token is provided via props, try to get it from SecureStore as fallback
      if (!authToken) {
        authToken = await SecureStore.getItemAsync('userToken');
      }
      
      if (!authToken) {
        Alert.alert('Error', 'Authentication token is missing');
        setIsLoading(false);
        return;
      }

      // Only send the fields we're updating
      const updateData = {
        firstName: firstName.trim(),
        lastName: lastName.trim()
      };

      const response = await axios.patch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/users/me`,
        updateData,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Update local user data
      setUser({
        ...user,
        ...response.data
      });

      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
      
      // Refresh user data
      fetchUserData();
    } catch (error) {
      console.error('Error updating profile:', error);
      
      let errorMessage = 'Failed to update profile';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEmail = () => {
    Alert.alert(
      'Change Email',
      'You need to log out to change your email. Would you like to continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Continue',
          onPress: () => {
            // Instead of logging out first, just navigate to the change-email screen
            router.push('/change-email');
            
            // The change-email screen will handle the logout process itself
            // This prevents the redirect to login before the navigation completes
          }
        }
      ]
    );
  };

  // Debug the current expanded state and icon
  console.log('ProfileSection render - expanded:', expanded, 'icon:', expanded ? 'chevron-up' : 'chevron-down');

  return (
    <View style={styles.section}>
      <TouchableOpacity 
        style={styles.sectionHeader} 
        onPress={toggleSection}
        activeOpacity={0.6}
      >
        <Text style={styles.sectionTitle}>Profile</Text>
        {/* Ensure icon is visible by using default icons */}
        <Ionicons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={24} 
          color="#333" 
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.sectionContent}>
          {!isEditing ? (
            <>
              <View style={styles.profileItem}>
                <Text style={styles.profileLabel}>Name</Text>
                <Text style={styles.profileValue}>
                  {user ? `${user.firstName || ''} ${user.lastName || ''}` : ''}
                </Text>
              </View>

              <View style={styles.profileItem}>
                <Text style={styles.profileLabel}>Email</Text>
                <Text style={styles.profileValue}>{user?.email || ''}</Text>
              </View>

              <TouchableOpacity 
                style={styles.editButton}
                onPress={handleEditProfile}
              >
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.profileItem}>
                <Text style={styles.profileLabel}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First Name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.profileItem}>
                <Text style={styles.profileLabel}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last Name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.profileItem}>
                <Text style={styles.profileLabel}>Email</Text>
                <View style={styles.emailContainer}>
                  <Text style={styles.profileValue}>{email}</Text>
                  <TouchableOpacity 
                    onPress={handleChangeEmail}
                    style={styles.changeEmailButton}
                  >
                    <Text style={styles.changeEmailText}>Change Email</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.editActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={handleCancelEdit}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.saveButton, isLoading && styles.disabledButton]}
                  onPress={handleSaveProfile}
                  disabled={isLoading}
                >
                  <Text style={styles.saveButtonText}>
                    {isLoading ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
  profileItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  profileValue: {
    fontSize: 16,
    color: BRAND_COLORS.black,
  },
  editButton: {
    margin: 14,
    padding: 10,
    backgroundColor: BRAND_COLORS.accent,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    color: BRAND_COLORS.black,
  },
  emailContainer: {
    flexDirection: 'column',
  },
  changeEmailButton: {
    marginTop: 8,
  },
  changeEmailText: {
    color: BRAND_COLORS.accent,
    fontWeight: '500',
    fontSize: 14,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  cancelButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 10,
    backgroundColor: BRAND_COLORS.accent,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: 'rgba(211, 78, 36, 0.5)',
  },
});

export default ProfileSection;