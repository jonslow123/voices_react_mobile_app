// app/change-email.jsx

import React, { useState, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Text,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BRAND_COLORS } from './styles/brandColors';
import { Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');

const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/auth`;

export default function ChangeEmailScreen() {
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userLoggedOut, setUserLoggedOut] = useState(false);
  
  const router = useRouter();
  
  // When the component mounts, logout the user
  useEffect(() => {
    const logoutUser = async () => {
      try {
        // Only logout if not already logged out
        if (!userLoggedOut) {
          await SecureStore.deleteItemAsync('userToken');
          await AsyncStorage.removeItem('user');
          setUserLoggedOut(true);
          console.log('User logged out for email change');
        }
      } catch (error) {
        console.error('Error during logout for email change:', error);
      }
    };
    
    logoutUser();
  }, [userLoggedOut]);
  
  const validateEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };

  const handleChangeEmail = async () => {
    // Validation
    if (!currentEmail || !newEmail || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(currentEmail) || !validateEmail(newEmail)) {
      Alert.alert('Error', 'Please enter valid email addresses');
      return;
    }

    if (currentEmail === newEmail) {
      Alert.alert('Error', 'New email must be different from current email');
      return;
    }

    setIsLoading(true);

    try {
      // Send change email request to backend
      const response = await axios.post(`${API_URL}/change-email`, {
        currentEmail,
        newEmail,
        password
      });
      
      // Show success message
      Alert.alert(
        'Email Updated',
        'Please check your new email address for a verification link to verify your account.',
        [
          { 
            text: 'OK', 
            onPress: () => router.replace('/login')
          }
        ]
      );
    } catch (error) {
      let errorMessage = 'Failed to update email';
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Your current email or password is incorrect.';
        } else if (error.response.status === 400) {
          errorMessage = error.response.data.message || 'Invalid request';
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
        
        if (error.response.data && error.response.data.emailError) {
          errorMessage = 'Failed to send verification email. Your email was not changed.';
        }
      } else if (error.request) {
        errorMessage = 'Unable to connect to server';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={{ 
            flexGrow: 1,
            paddingTop: 20
          }}
        >
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.formContainer}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.push('/login')}
            >
              <Ionicons name="arrow-back" size={24} color={BRAND_COLORS.primaryText} />
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Change Your Email</Text>
            <Text style={styles.subtitle}>
              Enter your current email, new email, and password. 
              You'll need to verify your new email before you can log in.
            </Text>
            
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Current Email Address</Text>
              <TextInput
                style={styles.input}
                value={currentEmail}
                onChangeText={setCurrentEmail}
                placeholder="your.current.email@example.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
            
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>New Email Address</Text>
              <TextInput
                style={styles.input}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="your.new.email@example.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={24} 
                    color="gray"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleChangeEmail}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Processing...' : 'Change Email'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
    width: width,
    height: height
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 50,
  },
  logo: {
    width: 200,
    height: 120,
    backgroundColor: BRAND_COLORS.background,
  },
  formContainer: {
    width: '85%',
    maxWidth: 400,
    alignSelf: 'center',
    padding: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: BRAND_COLORS.primaryText,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: BRAND_COLORS.accent,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    color: BRAND_COLORS.primaryText,
    lineHeight: 22,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: BRAND_COLORS.primaryText,
    fontWeight: '500',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    color: BRAND_COLORS.black,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 16,
    color: BRAND_COLORS.black,
  },
  eyeIcon: {
    padding: 10,
  },
  button: {
    backgroundColor: BRAND_COLORS.accent,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    height: 50,
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: BRAND_COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(211, 78, 36, 0.5)',
  },
});