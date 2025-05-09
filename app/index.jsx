import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BRAND_COLORS } from './styles/brandColors';

export default function Index() {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const value = await AsyncStorage.getItem('hasSeenOnboarding');
        setHasSeenOnboarding(value === 'true');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setHasSeenOnboarding(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkOnboardingStatus();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BRAND_COLORS.background }}>
        <ActivityIndicator size="large" color={BRAND_COLORS.accent} />
      </View>
    );
  }

  // Important: Make sure we're using exactly the right path
  if (!hasSeenOnboarding) {
    return <Redirect href="/onboarding" />;
  } else {
    return <Redirect href="/login" />;
  }
}