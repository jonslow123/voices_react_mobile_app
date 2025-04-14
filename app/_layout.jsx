import React, { useEffect } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AuthContextProvider from './context/auth';
import PlayerProvider from './context/PlayerContext';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Function to handle deep links
    const handleDeepLink = ({ url }) => {
      console.log('Deep link URL:', url);
      
      if (url) {
        // Handle verify-email links
        if (url.includes('/verify-email') || url.includes('verify-email')) {
          // Extract token from URL
          let token = '';
          
          // Handle both URL formats:
          // https://auth.yourapp.com/verify-email?token=abc123
          // yourapp://verify-email?token=abc123
          if (url.includes('token=')) {
            token = url.split('token=')[1];
            // Remove any trailing parameters
            if (token.includes('&')) {
              token = token.split('&')[0];
            }
          }
          
          if (token) {
            console.log('Verification token:', token);
            // Navigate to verification screen with token
            router.push({
              pathname: '/verify-email',
              params: { token }
            });
          }
        }
      }
    };
    
    // Add event listener for deep links when app is already open
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check if app was opened from a deep link
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({ url });
      }
    });
    
    // Clean up event listener on unmount
    return () => {
      subscription.remove();
    };
  }, [router]);
  
  return (
    <AuthContextProvider>
      <PlayerProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="verify-email" />
          <Stack.Screen name="resend-verification" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </PlayerProvider>
    </AuthContextProvider>
  );
}