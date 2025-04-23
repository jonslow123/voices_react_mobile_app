import React, { useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { BRAND_COLORS } from '../styles/brandColors';

export default function Index() {
  const router = useRouter();
  
  useEffect(() => {
    console.log('Onboarding index loaded');
    // Delay navigation to see if there's an issue
    setTimeout(() => {
      console.log('Navigating to screen1');
      router.replace('/onboarding/screen1');
    }, 1000);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Loading onboarding...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.background,
  },
  text: {
    color: BRAND_COLORS.primaryText,
    fontSize: 16,
  }
});