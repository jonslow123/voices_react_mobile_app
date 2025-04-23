import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Linking, Platform, Alert } from 'react-native';
import { Stack } from 'expo-router';
import AuthContextProvider from './context/auth';
import PlayerProvider from './context/PlayerContext';
import { router, useRouter } from 'expo-router';
import { ScrollProvider } from './context/ScrollContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  registerForPushNotifications, 
  setupNotificationListeners,
  getTokenFromStorage 
} from './utils/pushNotifications';
import { testNotifications } from './utils/notificationTest';

export default function RootLayout() {
  const router = useRouter();
  const notificationListeners = useRef(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
  
  useEffect(() => {
    // Check if user has seen onboarding
    const checkOnboardingStatus = async () => {
      try {
        const value = await AsyncStorage.getItem('hasSeenOnboarding');
        setHasSeenOnboarding(value === 'true');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setHasSeenOnboarding(false);
      }
    };
    
    checkOnboardingStatus();
    
    // Rest of your existing effect code
    console.log('Notification test result:', testNotifications);
    const subscription = Linking.addEventListener('url', (event) => {
      const url = event.url;
      console.log('Received URL:', url);

      if (url?.includes('reset-password')) {
        const token = url.split('reset-password/').pop();
        if (token) {
          router.replace({
            pathname: '/reset-password',
            params: { token: token }
          });
        }
      }
    });

    async function registerDeviceWithServer(deviceToken, userToken) {
      try {
        await axios.post(
          `${API_URL}/api/users/register-device`,
          { token: deviceToken },
          {
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('Device registered with server');
      } catch (error) {
        console.error('Error registering device with server:', error);
      }
    }

    const initNotifications = async () => {
      try {
        console.log('Initializing notifications...');
        
        // First check for existing token
        let token = await getTokenFromStorage();
        
        if (!token) {
          console.log('No saved token, registering...');
          token = await registerForPushNotifications();
        }
        
        if (token) {
          console.log('Setting up listeners with token:', token);
          notificationListeners.current = setupNotificationListeners(router);
        } else {
          console.log('No notification token available');
          // Consider showing a message to users
        }
      } catch (error) {
        console.error('Notification setup error:', error);
      }
    };
    
    initNotifications();

    return () => {
      subscription.remove();
      if (notificationListeners.current) {
        notificationListeners.current.unsubscribe();
      }
    };
  }, []);
  
  // Set onboarding as seen when navigating to login
  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      setHasSeenOnboarding(true);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };
  
  // If still loading onboarding status, show nothing
  if (hasSeenOnboarding === null) {
    return null;
  }
  
  return (
    <AuthContextProvider>
      <PlayerProvider>
        <ScrollProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="verify-email" />
            <Stack.Screen name="resend-verification" />
            <Stack.Screen name="reset-password" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </ScrollProvider>
      </PlayerProvider>
    </AuthContextProvider>
  );
}