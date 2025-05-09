import React, { useEffect, useRef, useState } from 'react';
import 'react-native-gesture-handler';
import { View, StyleSheet, Linking, Platform, Alert, Text, TouchableOpacity } from 'react-native';
import { Stack, usePathname, Tabs } from 'expo-router';
import AuthContextProvider from './context/auth';
import { PlayerContextProvider } from './context/PlayerContext';
import { router, useRouter } from 'expo-router';
import { ScrollProvider } from './context/ScrollContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { 
  registerForPushNotifications, 
  setupNotificationListeners,
  getTokenFromStorage 
} from './utils/pushNotifications';
import { testNotifications } from './utils/notificationTest';
import { Ionicons } from '@expo/vector-icons';
import { BRAND_COLORS } from './styles/brandColors';
import CustomTabBar from '../components/CustomTabBar';
import { useAuth } from './context/auth';


// Set up notification handler at the app level to ensure it's configured early
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,  // Show alerts in foreground
    shouldPlaySound: true,  // Play sound
    shouldSetBadge: false,  // Don't set badge
  }),
});

export default function RootLayout() {
  const router = useRouter();
  const notificationListeners = useRef(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
  const pathname = usePathname();
  
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
    
    // Handle deep linking
    const handleDeepLink = async (event) => {
      const url = event?.url;
      console.log('Received URL:', url);

      if (!url) return;

      // Handle password reset
      if (url.includes('reset-password')) {
        const token = url.split('reset-password/').pop();
        if (token) {
          router.replace({
            pathname: '/reset-password',
            params: { token: token }
          });
        }
      }
      
      if (url.includes('verify-success')) {
        router.replace('/login');
      }
      // Handle reset success (direct to login page)
      if (url.includes('reset-success')) {
        // You can optionally add a success message to show on the login page
        await AsyncStorage.setItem('passwordResetSuccess', 'true');
        router.replace('/login');
      }
    };
    
    // Check for initial URL when the app starts
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log("App opened with URL:", url);
        handleDeepLink({ url });
      }
    }).catch(err => console.error('An error occurred getting initial URL', err));
    
    // Listen for deep links while the app is running
    const subscription = Linking.addEventListener('url', handleDeepLink);

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
  
  const Header = () => {
    return (
      <View style={headerStyles.container}>
        <View style={headerStyles.titleContainer}>
          <Text style={headerStyles.title}>Voices Radio</Text>
        </View>
        
        <TouchableOpacity
          style={headerStyles.notificationButton}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color={BRAND_COLORS.primaryText} />
        </TouchableOpacity>
      </View>
    );
  };

  const headerStyles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 15,
      height: 50,
    },
    titleContainer: {
      flex: 1,
      alignItems: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: BRAND_COLORS.primaryText,
    },
    notificationButton: {
      padding: 8,
    },
  });

  return (
    <AuthContextProvider>
      <PlayerContextProvider>
        <ScrollProvider>
          <RootLayoutNav />
        </ScrollProvider>
      </PlayerContextProvider>
    </AuthContextProvider>
  );
}

function RootLayoutNav() {
  // This hook should return the authentication status
  const { token } = useAuth();
  const isAuthenticated = !!token;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Common screens accessible to all */}
      <Stack.Screen name="index" />
      
      {/* Auth-specific screens that should NOT show tabs */}
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="login" options={{ animation: 'fade' }} />
          <Stack.Screen name="register" options={{ animation: 'fade' }} />
          <Stack.Screen name="forgot-password" options={{ animation: 'fade' }} />
          <Stack.Screen name="resend-verification" options={{ animation: 'fade' }} />
          <Stack.Screen name="change-email" options={{ animation: 'fade' }} />
        </>
      ) : null}
      
      {/* Main app screens that need tabs */}
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      
      {/* Other screens */}
      <Stack.Screen name="schedule" options={{ animation: 'fade' }} />
      <Stack.Screen name="(artists)" options={{ animation: 'fade' }} />
    </Stack>
  );
}